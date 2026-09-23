import { ScanText, Target, Sparkles } from "lucide-react";

const features = [
    {
        icon: ScanText,
        title: "Instant structural scan",
        text: "Flags formatting, section gaps, and ATS-readability issues in seconds.",
    },
    {
        icon: Target,
        title: "Keyword & role matching",
        text: "Shows exactly which skills and phrases a job description is looking for.",
    },
    {
        icon: Sparkles,
        title: "Actionable rewrite tips",
        text: "Concrete suggestions to strengthen weak bullet points and impact statements.",
    },
];

/**
 * Left-side branding panel shared by Login and Signup.
 */
export default function AuthBrandPanel({ heading, subheading }) {
    return (
        <div className="relative hidden lg:flex w-1/2 flex-col justify-between bg-ink px-14 py-12 text-paper overflow-hidden">
            <div className="font-display text-xl font-semibold tracking-tight">
                Resume Analyzer
            </div>

            <div className="max-w-md">
                <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
                    {heading}
                </h1>
                <p className="mt-4 text-base text-paper/70 leading-relaxed">
                    {subheading}
                </p>
            </div>

            <div className="flex flex-col gap-6">
                {features.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal/15">
                            <Icon size={18} className="text-signal" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-paper">{title}</p>
                            <p className="mt-0.5 text-sm text-paper/60 leading-relaxed">{text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}