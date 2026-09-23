import { useNavigate } from "react-router-dom";
import { FilePlus2 } from "lucide-react";

export default function EmptyResumeState() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal/15 text-signal">
                <FilePlus2 size={26} />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">
                Welcome to Resume Analyzer!
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-ink/60">
                Let's get your career profile started. You haven't added a resume yet.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                    onClick={() => navigate("/upload-resume")}
                    className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 transition-colors"
                >
                    Upload Existing Resume
                </button>
                <button
                    onClick={() => navigate("/create-resume")}
                    className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 transition-colors"
                >
                    Create Your Own Resume
                </button>
            </div>
        </div>
    );
}