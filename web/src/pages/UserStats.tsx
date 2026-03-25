import apiClient from "@/cfg/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { LetterStat } from "@/types/letterStat";
import type { Label } from "@/types/label";

export function UserStats() {
    const [stats, setStats] = useState<LetterStat[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, labelsRes] = await Promise.all([
                    apiClient.get("api/users/stats/"),
                    apiClient.get("api/models/labels/?active=true"),
                ]);
                console.log("Stats data:", statsRes.data);
                console.log("Labels data:", labelsRes.data);
                setStats(statsRes.data);
                setLabels(labelsRes.data.labels);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getColor = (pct: number) => {
        if (pct >= 80) return "stroke-emerald-500";
        if (pct >= 50) return "stroke-amber-400";
        return "stroke-rose-500";
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-lg">
                Loading statistics…
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4 capitalize">
                User Statistics
            </h1>
            <div className="flex w-full items-center justify-center pb-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4 place-items-center">
                    {labels.map((label) => {
                        const data = stats.find(
                            (s) =>
                                s.target_letter.toLowerCase().trim() ===
                                label.name.toLowerCase().trim()
                        );

                        return (
                            <Card
                                className={cn(
                                    "w-40 h-40 text-gray-800 gap-0 border-2",
                                    getColor(data?.match_percentage || 0)
                                )}
                                key={label.id}
                            >
                                <p className="text-xl font-bold capitalize truncate p-2">
                                    {label.name}
                                </p>
                                <p>
                                    {data
                                        ? `${data.matched_count}/${data.total_count}`
                                        : "0/0"}
                                </p>
                                <p>
                                    {data
                                        ? new Intl.NumberFormat("en-US", {
                                              style: "percent",
                                              minimumFractionDigits: 2, // Minimum decimal places
                                              maximumFractionDigits: 2, // Maximum decimal places
                                          }).format(data.match_percentage / 100)
                                        : "-%"}
                                </p>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
