import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

export default function ATSPerformance({ data }) {
    const hasData = data && data.length > 0;

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            <h3 className="mb-1 font-display text-base font-semibold text-ink">ATS Performance</h3>
            <p className="mb-4 text-sm text-ink/60">Score improvement over time</p>

            {hasData ? (
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#DCD7CC" vertical={false} />
                            <XAxis dataKey="month" stroke="#1B2430" tick={{ fontSize: 12, fill: "#1B243099" }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#1B2430" tick={{ fontSize: 12, fill: "#1B243099" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, borderColor: "#DCD7CC", fontSize: 13 }}
                                formatter={(value) => [`${value}%`, "ATS Score"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#E8A33D"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "#E8A33D" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex h-56 flex-col items-center justify-center text-center">
                    <LineChartIcon size={28} className="mb-2 text-ink/25" />
                    <p className="text-sm text-ink/50">
                        ATS performance will appear here after you analyze your resume.
                    </p>
                </div>
            )}
        </div>
    );
}