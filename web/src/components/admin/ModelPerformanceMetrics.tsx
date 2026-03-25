import type { MainProps } from "../../types/metricCardProps";
import { Card } from "../ui/card";
import { ProgressBar } from "../ui/progressBar";

export default function ModelPerformanceMetrics({
  modelsAvailable,
  accuracy,
  f1Score,
  precision,
  recall,
  activeModelName = null,
  activeModelId = null,
  previousModelId = null,
  confusionMatrix = [],
  labels = []
}: MainProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  const percent = (v: number) => {
    if (!isFinite(v) || v == null) return 0;
    return Math.max(0, Math.min(100, Math.round(v * 100)));
  };

  function renderConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels?: string[] }) {

    const flat = matrix.flat();
    const max = Math.max(...flat, 1);

    return (
        <div className="overflow-x-auto mt-2">
            <table className="border border-gray-300 rounded w-full text-xs">
                <thead>
                    <tr>
                        <th className="border border-gray-300 px-2 py-1 bg-gray-50"></th>
                        {(labels ?? matrix[0].map((_, j) => j)).map((label, j) => (
                            <th key={j} className="border border-gray-300 px-2 py-1 bg-gray-50 capitalize">
                                Pred {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.map((row, i) => (
                        <tr key={i}>
                            <th className="border border-gray-300 px-2 py-1 bg-gray-50 font-normal capitalize">
                                {labels ? `Actual ${labels[i]}` : `Actual ${i}`}
                            </th>
                            {row.map((cell, j) => {
                                let bgColor = "#fff";
                                let color = "#166534";
                                let fontWeight: "bold" | "normal" = "normal";
                                if (cell > 0) {
                                    const percent = cell / max;
                                    bgColor = `rgba(34,197,94,${0.15 + 0.65 * percent})`;
                                    color = percent > 0.5 ? "#fff" : "#166534";
                                    fontWeight = percent > 0.5 ? "bold" : "normal";
                                }
                                return (
                                    <td
                                        key={j}
                                        className="border border-gray-300 px-2 py-1 text-center transition-colors"
                                        style={{
                                            backgroundColor: bgColor,
                                            color,
                                            fontWeight,
                                        }}
                                    >
                                        {cell}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  return (
    <section className="my-8">
      <h3 className="text-2xl font-bold mb-1">Model Performance Metrics</h3>
      <p className="text-sm text-gray-600 mb-6">
        Overview of deployed models and the currently active model
      </p>


<div className="grid grid-cols-1 lg:grid-cols-13 gap-2 mb-4">
  
  <div className="lg:col-span-5">
    <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border shadow-sm h-full">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          Active Model
        </div>
        <div className="text-lg font-semibold break-all p-5 capitalize">
          {activeModelName ?? "—"}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          ID: {activeModelId ?? "—"}
          {previousModelId ? ` • Prev: ${previousModelId}` : ""}
        </div>
      </div>
    </Card>
  </div>

  <div className="lg:col-span-4">
    <MetricCard
      label="Accuracy"
      value={formatter.format(accuracy)}
      percent={percent(accuracy)}
      barColor="bg-indigo-500"
    />
  </div>

  <div className="lg:col-span-4">
    <MetricCard
      label="F1 Score"
      value={formatter.format(f1Score)}
      percent={percent(f1Score)}
      barColor="bg-indigo-500"
    />
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
  <Card className="p-5 bg-white border shadow-sm">
    <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
      Total Models Available
    </div>
    <div className="text-4xl font-bold mt-2">{modelsAvailable}</div>
  </Card>

  <MetricCard
    label="Precision"
    value={formatter.format(precision)}
    percent={percent(precision)}
    barColor="bg-yellow-500"
  />

  <MetricCard
    label="Recall"
    value={formatter.format(recall)}
    percent={percent(recall)}
    barColor="bg-rose-500"
  />
</div>

<div className="mt-4">
  <div className="lg:col-span-5">
    <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border shadow-sm h-full">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          Confusion Matrix
        </div>
      </div>
      <div className="pt-3 border-t">
        {renderConfusionMatrix({ matrix: confusionMatrix, labels: labels })}
      </div>
    </Card>
  </div>
</div>

    </section>
  );
}

/* ---------- Reusable metric card ---------- */

function MetricCard({
  label,
  value,
  percent,
  barColor,
  showPercent = false,
}: {
  label: string;
  value: string;
  percent: number;
  barColor: string;
  showPercent?: boolean;
}) {
  const gradient = barColor.includes("indigo")
    ? "bg-gradient-to-r from-indigo-500 to-purple-500"
    : barColor.includes("yellow")
    ? "bg-gradient-to-r from-yellow-400 to-orange-400"
    : barColor.includes("rose")
    ? "bg-gradient-to-r from-rose-500 to-pink-400"
    : barColor.includes("emerald")
    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
    : "bg-gradient-to-r from-slate-400 to-slate-600";
  return (
    <Card className="p-5 bg-white border shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          {label}
        </div>
        {showPercent && (
          <div className="text-xs text-gray-500">{percent}%</div>
        )}
      </div>

      <div className="text-2xl font-bold mb-3">{value}</div>

     <div className="mt-auto">
  <ProgressBar value={percent} gradient={gradient} />
</div>

    </Card>
  );
}
