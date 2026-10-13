const SCORE_LEVELS = {
    LOW: {
        label: "LOW",
        description: "Your resume currently has significant gaps for this target role. Review the missing skills and priority improvements below.",
        badgeClassName: "bg-rose-100 text-rose-800 border border-rose-200",
        accentClassName: "text-rose-600",
    },
    MEDIUM: {
        label: "MEDIUM",
        description: "Your resume has a reasonable match for this target role, but several areas can be strengthened.",
        badgeClassName: "bg-amber-100 text-amber-800 border border-amber-200",
        accentClassName: "text-amber-600",
    },
    HIGH: {
        label: "HIGH",
        description: "Your resume demonstrates strong alignment with this target role. Review the recommendations below for further improvement.",
        badgeClassName: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        accentClassName: "text-emerald-600",
    },
};

export default function ATSOverallScore({ score }) {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Number(score))) : 0;
    const level = safeScore <= 49 ? "LOW" : safeScore <= 74 ? "MEDIUM" : "HIGH";
    const details = SCORE_LEVELS[level];

    return (
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">ATS Score</p>
                    <div className="mt-3 flex items-end gap-2">
                        <span className="font-display text-5xl font-bold tracking-tight text-ink">{safeScore}</span>
                        <span className="pb-2 text-xl font-medium text-ink/45">/ 100</span>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${details.badgeClassName}`}>
                        {details.label}
                    </span>
                    <p className={`max-w-xl text-sm leading-6 ${details.accentClassName}`}>
                        {details.description}
                    </p>
                </div>
            </div>
        </div>
    );
}
