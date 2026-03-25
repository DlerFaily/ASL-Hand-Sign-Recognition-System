import React, { useRef, useState } from "react";
import apiClient from "../../cfg/api";

interface EvalStats {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
    confusion_matrix: number[][];
    classification_report: Record<string, any>;
    labels?: string[];
}

function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels?: string[] }) {
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
}

function ClassificationReport({ report }: { report: Record<string, any> }) {
    return (
        <div className="mt-2">
            <div className="font-medium text-indigo-600 mb-2">Classification Report</div>
            <div className="overflow-x-auto">
                <table className="min-w-max bg-gray-100 rounded text-xs">
                    <thead>
                        <tr>
                            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Label</th>
                            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Precision</th>
                            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Recall</th>
                            <th className="px-2 py-1 border border-gray-300 bg-gray-50">F1-Score</th>
                            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Support</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(report)
                            .filter(([key]) => !["accuracy", "macro avg", "weighted avg"].includes(key))
                            .map(([label, values]: [string, any]) => (
                                <tr key={label}>
                                    <td className="px-2 py-1 border border-gray-300 capitalize">{label}</td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {values.precision?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {values.recall?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {values["f1-score"]?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {values.support}
                                    </td>
                                </tr>
                            ))}
                        {["macro avg", "weighted avg"].map((key) =>
                            report[key] ? (
                                <tr key={key} className="font-semibold">
                                    <td className="px-2 py-1 border border-gray-300 capitalize">{key}</td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {report[key].precision?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {report[key].recall?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {report[key]["f1-score"]?.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-center">
                                        {report[key].support}
                                    </td>
                                </tr>
                            ) : null
                        )}
                        {report.accuracy && (
                            <tr className="font-semibold">
                                <td className="px-2 py-1 border border-gray-300 capitalize">accuracy</td>
                                <td
                                    className="px-2 py-1 border border-gray-300 text-center"
                                    colSpan={4}
                                >
                                    {report.accuracy.toFixed(4)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ManualTesting() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<EvalStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(e.target.files?.[0] || null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStats(null);
        setError(null);
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);
        try {
            const res = await apiClient.post("/api/models/evaluate-csv/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setStats(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to evaluate CSV.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 min-h-screen flex justify-center">
            <div className="w-full bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
                <h2 className="text-3xl font-extrabold mb-6 text-center capitalize">Manual CSV Upload</h2>
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-lg flex flex-col items-center space-y-6"
                >
                    <label className="w-full flex flex-col items-center cursor-pointer text-black border border-black px-6 py-4 rounded-lg shadow transition mb-2 bg-white hover:bg-gray-50">
                        <span className="font-semibold text-lg">Choose CSV File</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            required
                            onChange={handleFileChange}
                        />
                        {selectedFile && (
                            <span className="mt-2 text-sm text-green-600 font-medium">
                                {selectedFile.name} added
                            </span>
                        )}
                    </label>
                    <button
                        type="submit"
                        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-lg shadow-md hover:from-indigo-600 hover:to-blue-600 transition cursor-pointer"
                        disabled={loading}
                    >
                        {loading ? "Testing..." : "Test"}
                    </button>
                </form>
                <div className="mt-4 text-center text-gray-400 text-xs">
                    Only .csv files are supported.
                </div>
                {error && <div className="mt-4 text-red-500 text-center">{error}</div>}
                {stats && (
                    <div className="mt-8 w-full">
                        <h3 className="text-xl font-semibold mb-4 text-center capitalize">Results</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center">
                            <div className="bg-indigo-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Precision</div>
                                <div className="text-lg font-bold">
                                    {stats.precision.toFixed(4)}
                                </div>
                            </div>
                            <div className="bg-indigo-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Recall</div>
                                <div className="text-lg font-bold">{stats.recall.toFixed(4)}</div>
                            </div>
                            <div className="bg-indigo-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">F1 Score</div>
                                <div className="text-lg font-bold">{stats.f1_score.toFixed(4)}</div>
                            </div>
                            <div className="bg-indigo-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Accuracy</div>
                                <div className="text-lg font-bold">{stats.accuracy.toFixed(4)}</div>
                            </div>
                        </div>
                        <div className="mb-6">
                            <span className="font-medium text-gray-700">Confusion Matrix:</span>
                            <ConfusionMatrix
                                matrix={stats.confusion_matrix}
                                labels={stats.labels}
                            />
                        </div>
                        <ClassificationReport report={stats.classification_report} />
                    </div>
                )}
            </div>
        </div>
    );
}
