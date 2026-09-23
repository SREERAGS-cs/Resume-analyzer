export default function ConfirmDeleteModal({ resume, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                <h3 className="font-display text-base font-semibold text-ink">Delete resume?</h3>
                <p className="mt-2 text-sm text-ink/60">
                    This will permanently delete <span className="font-medium text-ink">{resume.display_name}</span>. This action cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(resume.id)}
                        className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}