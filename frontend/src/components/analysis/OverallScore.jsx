function scoreLabel(score) {
    if (score >= 85) return "Excellent — your resume is in great shape";
    if (score >= 70) return "Good — your resume has a solid foundation";
    if (score >= 50) return "Fair — a few key improvements will help";
    return "Needs work — several important gaps to address";
}

function scoreColor(score) {
    if (score >= 85) return "#2F9E68"; // success
    if (score >= 70) return "#E8A33D"; // signal
    return "#C4432B"; // danger
}

export default function OverallScore({ score }) {
    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = scoreColor(score);

    return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white p-6 sm:flex-row sm:gap-6">
            <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`Overall resume score: ${score} out of 100`}>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#DCD7CC" strokeWidth="12" />
                <circle
                    cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    transform="rotate(-90 80 80)"
                />
                <text x="80" y="76" textAnchor="middle" fontSize="30" fontWeight="600" fill="#1B2430" fontFamily="inherit">{score}</text>
                <text x="80" y="98" textAnchor="middle" fontSize="12" fill="#1B243099" fontFamily="inherit">/100</text>
            </svg>
            <div className="text-center sm:text-left">
                <h2 className="font-display text-base font-semibold text-ink">Overall Resume Score</h2>
                <p className="mt-1 text-sm text-ink/60">{scoreLabel(score)}</p>
            </div>
        </div>
    );
}