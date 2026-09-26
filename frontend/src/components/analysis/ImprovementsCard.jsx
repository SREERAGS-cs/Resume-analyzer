import { AlertTriangle } from "lucide-react";

export default function ImprovementsCard({ improvements }) {
    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">Areas to Improve</h2>
            <ul className="flex flex-col gap-2">
                {improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink/80">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-signal" /> {s}
                    </li>
                ))}
            </ul>
        </div>
    );
}