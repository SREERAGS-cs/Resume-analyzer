import { useState } from "react";

export default function RenameResumeModal({ resume, onClose, onConfirm }) {
    const [name, setName] = useState(resume.display_name);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        if (!name.trim()) {
            setError("Name cannot be empty.");
            return;
        }
        setSaving(true);
        try {
            await onConfirm(resume.id, name.trim());
        } catch {
            setError("Failed to rename. Please try again.");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                <h3 className="font-display text-base font-semibold text-ink">Rename resume</h3>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-4 w-full rounded-md border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                />
                {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}