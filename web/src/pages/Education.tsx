import { useCallback, useEffect, useState, useRef } from "react";
import { LearningStartScreen } from "../components/LearningStartScreen";
import { SignFlipCard } from "../components/SignFlipCard";
import { PredictionPanel } from "../components/PredictionPanel";
import apiClient from "../cfg/api";
import { type LetterStat } from "@/types/letterStat";
import {type Label} from "@/types/label";

export function Education() {
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [targetLabel, setTargetLabel] = useState<Label | null>(null);
    const [predictedLabel, setPredictedLabel] = useState<string | null>(null);
    const [userStats, setUserStats] = useState<LetterStat[]>([]);
    const [landmarks, setLandmarks] = useState<number[][]>([]);
    
    const [isHintActive, setIsHintActive] = useState<boolean>(false);
    const [handDetected, setHandDetected] = useState<boolean>(false);
    const [showWebcam, setShowWebcam] = useState<boolean>(false);
    const [modelLoaded, setModelLoaded] = useState<boolean>(true);
    const [isLearning, setIsLearning] = useState<boolean>(false);
    const [record, setRecord] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isFlipping, setIsFlipping] = useState<boolean>(false);

    const [errMsg, setErrMsg] = useState<string | null>(null);
    const positiveFeedback = [
        "Good job!",
        "Well done!",
        "Awesome!",
        "Great work!",
        "You nailed it!",
        "Fantastic!"
    ];
    const negativeFeedback = [
        "Try again!",
        "Almost there!",
        "Keep practicing!",
        "Not quite, give it another shot!",
        "Don't give up!"
    ];

    const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

    const handleLandmarksDetected = useCallback((landmarks: any) => {
        setLandmarks((prevLandmarks) => {
            if (prevLandmarks.length >= 30) prevLandmarks.shift();
            prevLandmarks.push(landmarks);
            return [...prevLandmarks];
        });
    }, []);

    const pickNextSign = () => {
        // clearn feedback when changing to a new sign
        setFeedbackMsg(null);
        if(allLabels.length < 1) return;

        const weights = allLabels.map((label) => { 
            const uStat = userStats.find((v) => v.target_letter == label.name);

            if(!uStat) return 1;

            return Math.max((1 - uStat.match_percentage) * 20, 10);
        })

        const cumulativeWeights = [weights[0]];

        for(let i = 1; i < weights.length; i++) {
            cumulativeWeights.push(cumulativeWeights[cumulativeWeights.length - 1] +  weights[i]);
        }

        const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
        const randomNumber = maxCumulativeWeight * Math.random();

        for (let i = 0; i < allLabels.length; i += 1) {
            if (cumulativeWeights[i] >= randomNumber) {
                return setTargetLabel(allLabels[i]);
            }
        }
    }

    const makePredictionRequest = async () => {
        if (isProcessing) {
            return;
        }

        if (landmarks.length === 0) {
            setErrMsg("Insufficient Data");
            return;
        }

        try {
            setIsProcessing(true);

            const response = await apiClient.post("api/models/predict/ ", {
                data: landmarks,
                target: targetLabel?.name
            });

            const newPrediction = response.data.prediction;
            setPredictedLabel(newPrediction);

            const isMatch = newPrediction?.toLowerCase().trim() === targetLabel?.name.toLowerCase().trim();

                if (isMatch) {
                    const nStats = await apiClient.get("api/users/stats/");
                    setUserStats(nStats.data);

                    const msg = positiveFeedback[Math.floor(Math.random() * positiveFeedback.length)];
                    setFeedbackMsg(msg);
                    setIsFlipping(true);

                    setTimeout(() => {
                        setPredictedLabel(null);
                        pickNextSign();
                        setIsFlipping(false);
                    }, 1500);
                } else {
                    const msg = negativeFeedback[Math.floor(Math.random() * negativeFeedback.length)];
                    setFeedbackMsg(msg);
                }
        } catch (error: any) {
            setErrMsg("Error getting prediction.");
        } finally {
            setIsProcessing(false);
        }
    }

    const startLearning = () => {
        // reset all states to start over again
        pickNextSign();
        setIsLearning(true);
        setPredictedLabel(null);
        setIsFlipping(false);

        setTimeout(() => {
            setShowWebcam(true);
        }, 1500);
    };

    const showLetter = () => {
        setIsHintActive(true);
        setShowWebcam(false);
            
        // flip back to the webcam after 2 seconds (2000ms)
        setTimeout(() => {
            setShowWebcam(true);
            setPredictedLabel(""); // reset prediction text
            setTimeout(() => { // added timeout so that the default is not shown when flipping
                setIsHintActive(false);
            }, 350);
        }, 2000);
    }

    // on spacebar press make the request
    useEffect(() => {
        const handleKeyPress = (event: any) => {
            if (event.code === "Space" && isLearning && showWebcam && handDetected && !isFlipping) {
                // prevent accidental scroll
                event.preventDefault();
                setRecord((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [isLearning, showWebcam, handDetected, isFlipping]);

    const prevRecordRef = useRef(record);

    useEffect(() => {
        if (record && !prevRecordRef.current) {
            setLandmarks([]);
            setPredictedLabel("Recording...");
        }
        prevRecordRef.current = record;
        if (!record && landmarks.length >= 1) {
            makePredictionRequest();
        } else if (!record) {
            setErrMsg("Insufficient Data");
        }
    }, [record]);

    // this stops recording if hand is lost while recording
    useEffect(() => {
        if (!handDetected && record) {
            setRecord(false);
            setErrMsg("Hand lost. Recording stopped.");
        }
    }, [handDetected, record]);

    //load data & model
    useEffect(() => {
        apiClient
        .get("api/models/status/")
        .then((resp) => {
            if (resp.data.active_model_id != null) {
                setModelLoaded(true);
            } else {
                setModelLoaded(false);
            }
        })
        .catch(() => setErrMsg("Failed to load model."));

        Promise.all([
            apiClient.get("api/models/labels/?active=true"),
            apiClient.get("api/users/stats/")
        ])
        .then(([labelResp, statsResp]) => { 
            setAllLabels(labelResp.data.labels)
            setUserStats(statsResp.data)
            setErrMsg(null);
            
            pickNextSign();
        })
        .catch(() => setErrMsg("Failed to load labels and user stats."))
    }, []);

    useEffect(() => {
        if (!isLearning || !targetLabel) return;
        setIsFlipping(true);
        setShowWebcam(false);
        setTimeout(() => {
            setIsFlipping(false);
            setShowWebcam(true);
        }, 2000);
    }, [targetLabel]);

    return (
        <div className="min-h-screen h-screen font-sans flex flex-col">
            <div className="max-w-[1400px] w-full mx-auto flex flex-col h-full">
                {!isLearning ? (
                    <>
                        <h1 className="text-4xl text-center">Let's Start Learning!</h1>
                        <LearningStartScreen 
                            onStart={startLearning}
                            modelLoaded={modelLoaded}
                        />
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl text-center mb-4 capitalize">Current Letter: {targetLabel?.name || "_"}  </h2>
                            <button 
                                className="px-15 py-3 text-base bg-green-900 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-green-800 hover:-translate-y-0.5 cursor-pointer w-fit mx-auto block"
                                onClick={showLetter}
                            >
                                Hint
                            </button>
                        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-12 flex-1 max-h-[80vh] relative">
                            {/* Flip Card */}
                            <div className="relative">
                                {showWebcam && feedbackMsg && (
                                    <div className="absolute left-1/2 top-2 -translate-x-1/2 px-6 py-3 bg-white rounded-xl shadow-lg text-xl font-bold text-center pointer-events-none animate-fade-in-up z-20">
                                        {feedbackMsg}
                                    </div>
                                )}
                                <SignFlipCard
                                    sign={targetLabel}
                                    revealImage={isHintActive}
                                    showWebcam={showWebcam}
                                    isLearning={isLearning}
                                    onLandmarksDetected={handleLandmarksDetected}
                                    setHandDetected={setHandDetected}
                                    isFlipping={isFlipping}
                                />
                            </div>

                            {/* Prediction Panel + Controls */}
                            <div className="flex flex-col gap-5 items-center">
                                {showWebcam && (
                                    <div className={`text-sm font-semibold ${handDetected ? 'text-green-600' : 'text-red-600'}`}>
                                        {handDetected ? '✓ Hand Detected' : '✗ No Hand Detected'} 
                                    </div>
                                )}
                                {
                                    <PredictionPanel
                                        prediction={predictedLabel}
                                        currentCard={targetLabel?.name || ""}
                                        isProcessing={isProcessing}
                                        errMsg={errMsg}
                                    />
                                }
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
