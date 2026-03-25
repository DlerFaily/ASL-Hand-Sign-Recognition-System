import { Button } from "./ui/button";

interface LearningStartScreenProps {
    onStart: () => void;
    modelLoaded: boolean;
}

export function LearningStartScreen({ onStart, modelLoaded }: LearningStartScreenProps) {
    return (
        <div className="text-justify flex flex-col justify-center items-center">
            <p className="text-lg leading-relaxed max-w-xl p-4">
                Welcome to the ASL learning experience! Click the button below to begin! your
                practice session. You will be shown a sign to practice. Demonstrate it
                using your webcam. Press the spacebar to start recording, then press space again to
                stop and to check the prediction of our AI model.
            </p>

            <Button 
                    onClick={onStart} 
                    disabled={!modelLoaded} // <--- Disable if false
                    className={`text-xl cursor-pointer transition-all ${
                        !modelLoaded 
                            ? "bg-gray-500 cursor-not-allowed opacity-50" 
                            : "bg-green-900 hover:bg-green-800"
                    }`}
                >
                    {modelLoaded ? "Start Learning" : "System Offline"}
                </Button>
                {!modelLoaded && (
                    <p className="text-red-500 font-semibold text-sm">
                        Cannot start: No active AI model found.
                    </p>
                )}
        </div>
    );
}
