import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../common/FormField";
import {
    validateSignupForm,
    getPasswordStrength,
} from "../../utils/validation";
import { registerUser } from "../../services/authService";

const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["bg-danger", "bg-danger", "bg-signal", "bg-signal", "bg-success"];

export default function SignupForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    const strength = getPasswordStrength(formData.password);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");

        const validationErrors = validateSignupForm({ ...formData, termsAccepted });
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            await registerUser({
                full_name: formData.fullName,
                email: formData.email,
                password: formData.password,
            });
            navigate("/login");
        } catch (err) {
            if (err.response?.status === 409 || err.response?.status === 400) {
                setServerError("This email is already registered.");
            } else if (!err.response) {
                setServerError("Unable to connect to the server. Please try again.");
            } else {
                setServerError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {serverError && (
                <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {serverError}
                </div>
            )}

            <FormField
                id="fullName"
                label="Full name"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
                placeholder="Jane Doe"
                autoComplete="name"
            />

            <FormField
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
                autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
                <FormField
                    id="password"
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Create a password"
                    autoComplete="new-password"
                />
                {formData.password && (
                    <div className="flex items-center gap-2 pt-1">
                        <div className="flex flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${i < strength ? strengthColors[strength] : "bg-line"
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-ink/60 w-16 text-right">
                            {strengthLabels[strength]}
                        </span>
                    </div>
                )}
            </div>

            <FormField
                id="confirmPassword"
                label="Confirm password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="Re-enter your password"
                autoComplete="new-password"
            />

            <label className="flex items-start gap-2 text-sm text-ink/70 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-signal focus:ring-signal/30"
                />
                <span>
                    I agree to the{" "}
                    <span className="font-medium text-ink">Terms and Conditions</span>
                </span>
            </label>
            {errors.terms && <p className="text-sm text-danger -mt-3">{errors.terms}</p>}

            <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-md bg-ink py-2.5 text-[15px] font-medium text-paper
          transition-colors duration-150 hover:bg-ink/90
          disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {loading ? "Creating account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-ink/70">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-ink hover:text-signal transition-colors">
                    Log in
                </Link>
            </p>
        </form>
    );
}