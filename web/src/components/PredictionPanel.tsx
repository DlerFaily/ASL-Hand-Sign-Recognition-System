interface PredictionPanelProps {
    prediction: string | null;
    currentCard: string;
    errMsg: string | null;
    isProcessing: boolean;
}

export function PredictionPanel({
    prediction,
    currentCard,
    isProcessing,
    errMsg
}: PredictionPanelProps) {

    const isCorrect = prediction && 
                      prediction.toLowerCase().trim() === currentCard.toLowerCase().trim();           
    const isIncorrect = prediction && 
                        prediction.toLowerCase().trim() !== currentCard.toLowerCase().trim();
    const isErr = !prediction && errMsg;

    return (
        <div className={`p-6 border-2 rounded-xl min-w-[300px] text-center transition-shadow duration-500 ${
            isCorrect ? 'border-green-400 animate-border-glow' : 'border-green-400'
        }`}>
            <p className="text-lg mb-3 text-gray-400">
                Current Prediction:
            </p>

            <div className="relative">
                {/* decorative ping when correct */}
                {isCorrect && (
                    <span className="absolute inset-0 -z-10 rounded-full bg-green-400/30 animate-ping" />
                )}

                <div
                    className={`text-5xl font-bold min-h-[60px] flex items-center justify-center transition-transform duration-300 capitalize ${
                        isCorrect ? "text-green-400 scale-110" : "text-yellow-400"
                    }`}
                >
                    {isProcessing ? "..." : (prediction || "—")}
                </div>
            </div>

            {isCorrect && (
                <p className="text-lg text-green-400 mt-3 font-semibold text-center">
                    Correct! Good Job! Moving to next sign!
                </p>
            )}

            {isIncorrect && (
                <p className="text-lg text-yellow-400 mt-3 font-semibold">
                    Incorrect! Adjust your form and try again!
                </p>
            )}
            {isErr && (
                <p className="text-lg text-red-400 mt-3 font-semibold">
                    Error: {errMsg}
                </p>
            )}

            <p className="text-sm text-gray-400 mt-4">
                Press <strong className="text-green-400">SPACEBAR</strong> to check your sign
            </p>
        </div>
    );
}
