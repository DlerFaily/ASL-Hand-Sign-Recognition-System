interface FlipCardProperties {
    isFlipped: boolean;
    frontContent: React.ReactNode;
    backContent: React.ReactNode;
}

export function FlipCard({ isFlipped, frontContent, backContent}: FlipCardProperties ) {
    return (
          <div className="perspective-1000 w-[800px] h-[600px]">
            <div 
                className={`relative w-full h-full transition-transform duration-800 preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                }`}
            >
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden border-3 border-green-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,0,0.5)]">
                    {frontContent}
                </div>

                {/* Back */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 border-3 border-green-500 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,255,0,0.5)]">
                    {backContent}
                </div>
            </div>
        </div>
    );
}