export default function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink/5 text-ink">
                    <Icon size={18} />
                </div>
                <p className="text-sm text-ink/60">{label}</p>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
        </div>
    );
}