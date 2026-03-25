type ProgressBarProps = {
  value: number; // 0–100
  label?: string;
  gradient: string; // tailwind gradient classes
};

export function ProgressBar({
  value,
  label,
  gradient,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </div>
      )}

      <div className="relative h-6 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`
            h-full
            rounded-full
            ${gradient}
            flex items-center
            px-3
            text-xs
            font-semibold
            text-white
            transition-all
            duration-1000
            ease-out
          `}
          style={{
            width: `${value}%`,
          }}
        >
          {value}%
        </div>
      </div>
    </div>
  );
}
