import AuthBrandPanel from "../components/common/AuthBrandPanel";
import LoginForm from "../components/auth/LoginForm";

export default function Login() {
    return (
        <div className="flex min-h-screen">
            <AuthBrandPanel
                heading="Understand your resume the way recruiters do."
                subheading="AI-powered analysis that flags what's working, what's missing, and how to close the gap — before you hit submit."
            />
            <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="font-display text-2xl font-semibold text-ink">
                            Welcome back
                        </h2>
                        <p className="mt-1.5 text-sm text-ink/60">
                            Log in to continue reviewing your resumes.
                        </p>
                    </div>
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}