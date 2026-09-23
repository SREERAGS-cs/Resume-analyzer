import { Plus, Trash2 } from "lucide-react";

/**
 * fields: [{ key, label, type: 'text' | 'textarea' | 'list' }]
 * 'list' fields are edited as newline-separated text and stored as string[]
 */
export default function ListSectionEditor({ items, fields, onChange, editing, emptyLabel, blankEntry }) {
    const updateItem = (index, key, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [key]: value };
        onChange(updated);
    };

    const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
    const addItem = () => onChange([...items, { ...blankEntry }]);

    if (!editing) {
        if (!items?.length) return <p className="text-sm text-ink/40">{emptyLabel}</p>;
        return (
            <div className="flex flex-col gap-4">
                {items.map((item, i) => (
                    <div key={i} className="border-l-2 border-line pl-3">
                        {fields.map(({ key, label, type }) => {
                            const value = item[key];
                            if (!value || (Array.isArray(value) && value.length === 0)) return null;
                            return (
                                <p key={key} className={type === "text" && key === fields[0].key ? "text-sm font-medium text-ink" : "text-xs text-ink/60"}>
                                    {Array.isArray(value) ? value.join(", ") : value}
                                </p>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {items.map((item, i) => (
                <div key={i} className="rounded-md border border-line p-4">
                    <div className="mb-2 flex justify-end">
                        <button onClick={() => removeItem(i)} className="text-ink/40 hover:text-danger">
                            <Trash2 size={15} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {fields.map(({ key, label, type }) => (
                            <div key={key}>
                                <label className="mb-1 block text-xs uppercase tracking-wide text-ink/40">{label}</label>
                                {type === "textarea" ? (
                                    <textarea
                                        value={item[key] || ""}
                                        onChange={(e) => updateItem(i, key, e.target.value)}
                                        rows={3}
                                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                                    />
                                ) : type === "list" ? (
                                    <textarea
                                        value={(item[key] || []).join("\n")}
                                        onChange={(e) => updateItem(i, key, e.target.value.split("\n").filter((l) => l.trim()))}
                                        rows={3}
                                        placeholder="One per line"
                                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                                    />
                                ) : (
                                    <input
                                        value={item[key] || ""}
                                        onChange={(e) => updateItem(i, key, e.target.value)}
                                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button
                onClick={addItem}
                className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2 text-sm text-ink/60 hover:border-ink/30 hover:text-ink"
            >
                <Plus size={15} /> Add entry
            </button>
        </div>
    );
}