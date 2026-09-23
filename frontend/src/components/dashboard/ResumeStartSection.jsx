import { useNavigate } from "react-router-dom";
import { UploadCloud, PenLine, ArrowRight } from "lucide-react";

export default function ResumeStartSection() {
    const navigate = useNavigate();

    return (
        <section className="mb-8">
            <h3 className="mb-1 font-display text-lg font-semibold text-ink">
                How would you like to start?
            </h3>
            <p className="mb-4 text-sm text-ink/60">
                Choose the path that fits where you are right now.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                <button
                    onClick={() => navigate("/upload-resume")}
                    className="group flex flex-col items-start rounded-lg border border-line bg-white p-6 text-left transition-all hover:border-signal/50 hover:shadow-md"
                >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-ink/5 text-ink">
                        <UploadCloud size={22} />
                    </div>
                    <h4 className="font-display text-base font-semibold text-ink">Upload Existing Resume</h4>
                    <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">
                        Already have a resume? Upload your PDF or DOCX and let Resume Analyzer analyze it.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-signal transition-colors">
                        Upload Resume <ArrowRight size={15} />
                    </span>
                </button>

                <button
                    onClick={() => navigate("/choose-template")}
                    className="group flex flex-col items-start rounded-lg border border-line bg-white p-6 text-left transition-all hover:border-signal/50 hover:shadow-md"
                >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-signal/15 text-signal">
                        <PenLine size={22} />
                    </div>
                    <h4 className="font-display text-base font-semibold text-ink">Create Your Own Resume</h4>
                    <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">
                        Don't have a resume yet? Build a professional resume from scratch with our guided resume builder.
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-signal transition-colors">
                        Create Resume <ArrowRight size={15} />
                    </span>
                </button>
            </div>
        </section>
    );
}