export default function EditableField({ label, value, onChange, editing, multiline = false }) {
    return (
        <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ink/40">{label}</label>
            {editing ? (
                multiline ? (
                    <textarea
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                    />
                ) : (
                    <input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                    />
                )
            ) : (
                <p className="text-sm text-ink">{value || <span className="text-ink/30">Not found</span>}</p>
            )}
        </div>
    );
}