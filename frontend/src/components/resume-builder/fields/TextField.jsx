export default function TextField({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
            />
        </div>
    );
}