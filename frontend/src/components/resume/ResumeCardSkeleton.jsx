export default function ResumeCardSkeleton() {
    return (
        <div className="animate-pulse rounded-lg border border-line bg-white p-5">
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-md bg-ink/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-ink/10" />
                    <div className="h-3 w-1/2 rounded bg-ink/10" />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <div className="h-9 flex-1 rounded-md bg-ink/10" />
                <div className="h-9 flex-1 rounded-md bg-ink/10" />
            </div>
        </div>
    );
}