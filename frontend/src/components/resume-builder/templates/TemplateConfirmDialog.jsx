export default function TemplateConfirmDialog({ template, onCancel, onConfirm }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-confirm-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            >
                <h3 id="template-confirm-title" className="font-display text-base font-semibold text-ink">
                    Use this template?
                </h3>
                <p className="mt-2 text-sm text-ink/60">
                    You're about to start your resume with the <span className="font-medium text-ink">"{template.name}"</span> template.
                    You can customize your resume content after entering the builder.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        autoFocus
                        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                    >
                        Use {template.name} Template
                    </button>
                </div>
            </div>
        </div>
    );
}