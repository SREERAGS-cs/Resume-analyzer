import { Plus, Trash2 } from "lucide-react";
import TextField from "./fields/TextField";
import TextAreaField from "./fields/TextAreaField";

/**
 * fields: [{ key, label, placeholder, type: 'text' | 'textarea' | 'list' }]
 * 'list' fields are edited as newline-separated text, stored as string[].
 */
export default function RepeatingEntryForm({ entries, fields, onAdd, onUpdate, onRemove, emptyLabel, addLabel }) {
    return (
        <div className="flex flex-col gap-4">
            {entries.length === 0 && <p className="text-sm text-ink/40">{emptyLabel}</p>}

            {entries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-line p-4">
                    <div className="mb-3 flex justify-end">
                        <button onClick={() => onRemove(entry.id)} className="text-ink/40 hover:text-danger">
                            <Trash2 size={15} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {fields.map(({ key, label, placeholder, type }) => {
                            const isFullWidth = type === "textarea" || type === "list";
                            return (
                                <div key={key} className={isFullWidth ? "sm:col-span-2" : ""}>
                                    {type === "textarea" ? (
                                        <TextAreaField
                                            label={label}
                                            placeholder={placeholder}
                                            value={entry[key]}
                                            onChange={(value) => onUpdate(entry.id, key, value)}
                                        />
                                    ) : type === "list" ? (
                                        <TextAreaField
                                            label={label}
                                            placeholder={placeholder || "One per line"}
                                            value={(entry[key] || []).join("\n")}
                                            onChange={(value) => onUpdate(entry.id, key, value.split("\n").filter((l) => l.trim()))}
                                        />
                                    ) : (
                                        <TextField
                                            label={label}
                                            placeholder={placeholder}
                                            value={entry[key]}
                                            onChange={(value) => onUpdate(entry.id, key, value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <button
                onClick={onAdd}
                className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-line py-2.5 text-sm text-ink/60 hover:border-ink/30 hover:text-ink"
            >
                <Plus size={15} /> {addLabel}
            </button>
        </div>
    );
}