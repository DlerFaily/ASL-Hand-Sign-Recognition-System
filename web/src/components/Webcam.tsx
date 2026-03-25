// webcam doc: https://www.npmjs.com/package/react-webcam
// mediapipe doc: https://codepen.io/mediapipe-preview/pen/gOKBGPN

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useRef, useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Webcam from "react-webcam";
import type { Point } from "../types/point";

interface WebCamProperties {
    onLandmarksDetected: (landmarks: Array<number> | null) => void;
    setHandDetected: Dispatch<SetStateAction<boolean>>;
    isActive?: boolean;
}

export function WebCam({ onLandmarksDetected, setHandDetected, isActive = false }: WebCamProperties) {
    const webcamRef = useRef<Webcam | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const handLandmarker = useRef<HandLandmarker | null>(null);
    let lastVideoTime = useRef<number>(-1);
    const isTrackingRef = useRef<boolean>(false);
    const handPresentRef = useRef<boolean>(false);

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [error, setError] = useState<string>("");
    const [wasHandDetected, setWasHandDetected] = useState(false);

    const VIDEO_WIDTH = 696;
    const VIDEO_HEIGHT = 525;

    const fingerColors = [
        "#E40303", // red
        "#FF8C00", // orange
        "#008026", // green
        "#004CFF", // indigo
        "#732982", // violet
    ];

    const fingerIndices = [
        [0, 1, 2, 3, 4], // thumb
        [0, 5, 6, 7, 8], // index
        [0, 9, 10, 11, 12], // middle
        [0, 13, 14, 15, 16], // ring
        [0, 17, 18, 19, 20], // pinky
    ];

    // video constraints for webcam, will need to be changed to not be static so it works on diff devices
    const VideoConstraints = {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        facingMode: "user",
        video: true,
    };

    /* 
        function to load the MediaPipe Handlandmarker from Cloud Storage of the latest mode
        use CDN injected in the initial html file to load it quickly
        creates an instance that runs on Webcam video stream at all times
    */
    const createHandLandmarker = useCallback(async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );

            // set the ref to the loaded model and activate some base options
            // all options are the same to the ones our model was trained on (default values)
            handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU",
                },
                runningMode: "VIDEO",
                numHands: 1,
            });

            setIsModelLoaded(true);
        } catch (err: any) {
            console.error("Failed to load MediaPipe model: ", err);
            setError("Failed to load AI hand-tracking model. Please refresh the page.");
        }
    }, []);

    const drawHand = (landmarks: Array<Point>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 6;

        fingerIndices.forEach((indices, i) => {
            ctx.strokeStyle = fingerColors[i];
            ctx.lineWidth = 5;
            ctx.beginPath();
            indices.forEach((idx, j) => {
                const x = landmarks[idx].x * canvas.width;
                const y = landmarks[idx].y * canvas.height;
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        });

        ctx.shadowBlur = 0;

        landmarks.forEach((point, idx) => {
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, idx === 0 ? 9 : 7, 0, 2 * Math.PI);
            ctx.fillStyle = "#fff";
            ctx.globalAlpha = 0.95;
            ctx.shadowColor = "#000";
            ctx.shadowBlur = idx === 0 ? 10 : 6;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            if (idx !== 0) {
                let finger = fingerIndices.findIndex((arr) => arr.includes(idx));
                ctx.strokeStyle = fingerColors[finger >= 0 ? finger : 0];
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }
        });
    };

    //detect one hand on the screen each video frame
    const detectHands = useCallback(() => {
        try {
            if (!isTrackingRef.current) return;

            const webcam = webcamRef.current;
            const model = handLandmarker.current;

            if(!webcam || !model || !webcam.video) {
                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            const video = webcam.video;
            // check whether we have frames to track
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            // do not track the same frames twice or more by keeping track of last frame timestamp
            if (video.currentTime === lastVideoTime.current) {
                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            lastVideoTime.current = video.currentTime;
            let results;

            try {
                results = model.detectForVideo(video, performance.now());
            } catch (err: any) {
                console.error("HandLandmarker detectForVideo failed:", err);
                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            if (!results || results.landmarks.length === 0) {
                if(handPresentRef.current) {
                  handPresentRef.current = false;
                  onLandmarksDetected(null);
                }

                // clear the canvas if no hand is detected
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                // signal that the hand was lost
                if (wasHandDetected) {
                    setWasHandDetected(false);
                    setHandDetected(false);
                }

                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            // hand gets detected
            if (!wasHandDetected) {
                setWasHandDetected(true);
                setHandDetected(true);
            }

            const rawData = results.landmarks[0] as Array<Point>;

            // check if we have full 21 points for valid prediction;
            if (!rawData || rawData.length !== 21) {
                animationFrameRef.current = requestAnimationFrame(detectHands);
                return;
            }

            if (!handPresentRef.current) {
      handPresentRef.current = true;
    }
            drawHand(rawData);

            const processed = rawData.flatMap((point: Point) => {
                return [point.x, point.y, point.z];
            });

            onLandmarksDetected(processed);
        } catch (err: any) {
            console.error("Unexpected error during hand detection:", err);
        }
          animationFrameRef.current = requestAnimationFrame(detectHands);
        
    }, [onLandmarksDetected, setHandDetected, wasHandDetected]);


    // changed this to guarantee cleanup and stop the useEffect from running even though no
    // hand was detected
    useEffect(() => {
        if (!isActive || !isModelLoaded) return;

        isTrackingRef.current = true;
        animationFrameRef.current = requestAnimationFrame(detectHands);
        
        return () => {
            isTrackingRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isActive, isModelLoaded, detectHands]);


    // mount the model loading
    useEffect(() => {
        createHandLandmarker();
    }, [createHandLandmarker]);

    return (
        <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ width: `${VIDEO_WIDTH}px`, height: `${VIDEO_HEIGHT}px` }}
        >
            {/* Display model loading / error */}
            {!isModelLoaded && !error && (
                <div className="absolute inset-0 bg-black/80 text-white flex items-center justify-center text-lg">
                    Loading hand tracking model...
                </div>
            )}

            {error && (
                <div className="absolute inset-0 bg-red-700/90 text-white p-4 rounded-lg z-20 flex items-center justify-center text-center">
                    {error}
                </div>
            )}

            <Webcam
                audio={false}
                ref={webcamRef}
                height={1000}
                width={1000}
                videoConstraints={VideoConstraints}
                onUserMediaError={() =>
                    setError("Failed to access webcam. Please enable camera permissions.")
                }
                style={{ position: "absolute", top: 0, left: 0 }}
            />

            <canvas
                ref={canvasRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    // display: "none",
                }}
            />
        </div>
    );
}