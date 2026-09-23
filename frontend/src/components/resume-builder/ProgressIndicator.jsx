import { useResumeBuilder } from "../../context/ResumeBuilderContext";

export default function ProgressIndicator() {
    const { completionPercentage } = useResumeBuilder();

    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-ink/50">Resume completeness</span>
                <span className="font-medium text-ink">{completionPercentage}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                    className="h-full bg-signal transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                />
            </div>
        </div>
    );
}