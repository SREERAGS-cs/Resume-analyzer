function Line({ w = "w-full", h = "h-1", tone = "bg-ink/10" }) {
    return <div className={`${h} ${w} rounded-full ${tone}`} />;
}

function ModernThumbnail() {
    return (
        <div className="flex h-full w-full overflow-hidden rounded-md border border-line bg-white">
            <div className="flex w-[34%] flex-col gap-3 bg-ink px-2.5 py-3">
                <div className="h-6 w-6 rounded-full bg-paper/20" />
                <div className="flex flex-col gap-1">
                    <Line w="w-full" h="h-1" tone="bg-paper/40" />
                    <Line w="w-4/5" h="h-1" tone="bg-paper/25" />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                    <span className="text-[5px] font-semibold uppercase tracking-wide text-signal">Skills</span>
                    <Line w="w-full" h="h-1" tone="bg-paper/25" />
                    <Line w="w-2/3" h="h-1" tone="bg-paper/25" />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 px-3 py-3">
                <div>
                    <span className="text-[7px] font-bold text-ink">YOUR NAME</span>
                    <Line w="w-1/2" h="h-1" tone="bg-ink/20" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[5px] font-semibold uppercase tracking-wide text-signal">Experience</span>
                    <Line w="w-full" /><Line w="w-11/12" /><Line w="w-3/4" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[5px] font-semibold uppercase tracking-wide text-signal">Education</span>
                    <Line w="w-4/5" /><Line w="w-1/2" />
                </div>
            </div>
        </div>
    );
}

function ProfessionalThumbnail() {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-line bg-white px-3 py-3">
            <div className="mb-2 border-b border-ink/15 pb-2 text-center">
                <span className="text-[7px] font-bold text-ink">YOUR NAME</span>
                <div className="mx-auto mt-1 w-2/3"><Line w="w-full" h="h-1" tone="bg-ink/15" /></div>
            </div>
            <div className="flex flex-col gap-2">
                {["Experience", "Education", "Skills"].map((label) => (
                    <div key={label} className="flex flex-col gap-1">
                        <span className="text-[5px] font-semibold uppercase tracking-wide text-ink/60">{label}</span>
                        <Line w="w-full" /><Line w="w-4/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MinimalThumbnail() {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-line bg-white px-3.5 py-4">
            <span className="text-[7px] font-medium text-ink">Your Name</span>
            <Line w="w-1/3" h="h-1" tone="bg-ink/15" />
            <div className="mt-4 flex flex-col gap-3">
                {["Experience", "Education", "Skills"].map((label) => (
                    <div key={label} className="flex flex-col gap-1.5">
                        <span className="text-[5px] font-normal uppercase tracking-widest text-ink/40">{label}</span>
                        <Line w="w-full" tone="bg-ink/[0.07]" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ExecutiveThumbnail() {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-line bg-white">
            <div className="bg-ink px-3 py-3">
                <span className="text-[8px] font-bold tracking-wide text-paper">YOUR NAME</span>
                <div className="mt-1 h-0.5 w-8 bg-signal" />
            </div>
            <div className="flex flex-col gap-2 px-3 py-3">
                {["Experience", "Education", "Skills"].map((label) => (
                    <div key={label} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[5px] font-bold uppercase tracking-wide text-ink">{label}</span>
                            <div className="h-px flex-1 bg-ink/15" />
                        </div>
                        <Line w="w-full" /><Line w="w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}

const VARIANTS = {
    modern: ModernThumbnail,
    professional: ProfessionalThumbnail,
    minimal: MinimalThumbnail,
    executive: ExecutiveThumbnail,
};

export default function TemplateThumbnail({ templateId }) {
    const Variant = VARIANTS[templateId] || ProfessionalThumbnail;
    return (
        <div className="aspect-[3/4] w-full">
            <Variant />
        </div>
    );
}