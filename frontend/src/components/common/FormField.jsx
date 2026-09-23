import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Reusable labeled input. Handles password show/hide when type="password".
 */
export default function FormField({
    id,
    label,
    type = "text",
    value,
    onChange,
    error,
    placeholder,
    autoComplete,
    rightSlot,
}) {
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (visible ? "text" : "password") : type;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className="text-sm font-medium text-ink">
                    {label}
                </label>
                {rightSlot}
            </div>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink/40
            transition-colors duration-150 outline-none
            focus:border-signal focus:ring-2 focus:ring-signal/30
            ${error ? "border-danger" : "border-line"}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-colors"
                        aria-label={visible ? "Hide password" : "Show password"}
                        tabIndex={-1}
                    >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && (
                <p id={`${id}-error`} className="text-sm text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}