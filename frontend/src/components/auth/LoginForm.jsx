import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormField from "../common/FormField";
import { validateLoginForm } from "../../utils/validation";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export default function LoginForm() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [remember, setRemember] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");

        const validationErrors = validateLoginForm(formData);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            const data = await loginUser(formData);
            login(data, remember);
            navigate("/dashboard");
        } catch (err) {
            if (err.response?.status === 401) {
                setServerError("Invalid email or password.");
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
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
                autoComplete="email"
            />

            <FormField
                id="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="Enter your password"
                autoComplete="current-password"
                rightSlot={
                    <Link to="/forgot-password" className="text-sm text-ink/60 hover:text-signal transition-colors">
                        Forgot password?
                    </Link>
                }
            />

            <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal/30"
                />
                Remember me
            </label>

            <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-md bg-ink py-2.5 text-[15px] font-medium text-paper
          transition-colors duration-150 hover:bg-ink/90
          disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {loading ? "Logging in…" : "Log in"}
            </button>

            <p className="text-center text-sm text-ink/70">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-ink hover:text-signal transition-colors">
                    Sign up
                </Link>
            </p>
        </form>
    );
}