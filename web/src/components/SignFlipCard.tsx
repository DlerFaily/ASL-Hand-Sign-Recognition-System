import type { Dispatch, SetStateAction } from "react";
import { WebCam } from "./Webcam";
import type { Label } from "@/types/label";
interface SignFlipCardProps {
  sign: Label | null;
  showWebcam: boolean;
  revealImage: boolean;
  isLearning: boolean;
  setHandDetected: Dispatch<SetStateAction<boolean>>;
  onLandmarksDetected: (landmarks: number[] | null) => void;
  isFlipping?: boolean;
}

export function SignFlipCard({
  sign,
  showWebcam,
  revealImage,
  isLearning,
  onLandmarksDetected,
  setHandDetected,
  isFlipping = false,
}: SignFlipCardProps) {
  // this checks which to show during flip
  const flipToFront = isFlipping || revealImage || !showWebcam;
  return (
    <div
      className="w-[min(700px,50vw)] aspect-[696/525] shrink-0"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-800"
        style={{
          transformStyle: "preserve-3d",
          transform: flipToFront
            ? "rotateY(0deg) scale(1.04)"
            : "rotateY(180deg) scale(1)",
          boxShadow: flipToFront
            ? "0 8px 32px rgba(34,197,94,0.25)"
            : "0 4px 16px rgba(34,197,94,0.15)",
        }}
      >
        {/* FRONT SIDE*/}
        <div
          className="absolute w-full h-full border-2 border-green-400 rounded-xl flex flex-col items-center justify-center p-4"
          style={{ backfaceVisibility: "hidden" }}
        >
          {revealImage && sign ? (
            // Hint mode
            <>
              <p className="text-xl mb-2 text-gray-400">Hand Shape:</p>
              <div className="flex-1 w-full h-full relative pb-4">
                {sign.example_image ? (
                  <img
                    src={sign.example_image}
                    alt={`Sign for ${sign.name}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No example image available.
                  </div>
                )}
              </div>
            </>
          ) : (
            // Default mode
            <div className="text-center">
              <p className="text-xl mb-4 text-gray-400">Loading next sign... Get ready!</p>
            </div>
          )}
        </div>

        {/* BACK SIDE (WEBCAM) */}
        <div
          className="absolute w-full h-full  border-2 border-green-400 rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="overflow-hidden rounded-lg">
            <WebCam
              onLandmarksDetected={onLandmarksDetected}
              setHandDetected={setHandDetected}
              isActive={showWebcam && isLearning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}