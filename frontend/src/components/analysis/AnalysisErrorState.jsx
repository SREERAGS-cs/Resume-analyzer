import { AlertTriangle } from "lucide-react";

export default function AnalysisErrorState({ onRetry, message }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/5 px-6 py-12 text-center">
            <AlertTriangle size={28} className="mb-2 text-danger" />
            <h3 className="font-display text-base font-semibold text-ink">Unable to analyze resume</h3>
            <p className="mt-1 text-sm text-ink/60">{message || "Something went wrong while analyzing your resume."}</p>
            <button onClick={onRetry} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90">
                Try Again
            </button>
        </div>
    );
}