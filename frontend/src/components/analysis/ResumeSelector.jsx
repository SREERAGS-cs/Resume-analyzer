export default function ResumeSelector({ resumes, selectedId, onChange, onAnalyze, analyzing }) {
    const effectiveValue = selectedId != null ? String(selectedId) : (resumes.length > 0 ? String(resumes[0].id) : "");
    return (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <label htmlFor="resume-select" className="text-sm font-medium text-ink/70">Resume</label>
                <select
                    id="resume-select"
                    value={effectiveValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full min-w-[220px] rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30 sm:w-auto"
                >
                    {resumes.map((r) => (
                        <option key={r.id} value={String(r.id)}>{r.display_name || r.name}</option>
                    ))}
                </select>
            </div>
            <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60 sm:w-auto"
            >
                {analyzing ? "Analyzing…" : "Analyze Resume"}
            </button>
        </div>
    );
}