import AuthBrandPanel from "../components/common/AuthBrandPanel";
import SignupForm from "../components/auth/SignupForm";

export default function Signup() {
    return (
        <div className="flex min-h-screen">
            <AuthBrandPanel
                heading="Every resume has a story. Make sure yours reads clearly."
                subheading="Create an account to get instant, structured feedback on formatting, keywords, and impact."
            />
            <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="font-display text-2xl font-semibold text-ink">
                            Create your account
                        </h2>
                        <p className="mt-1.5 text-sm text-ink/60">
                            It takes less than a minute to get started.
                        </p>
                    </div>
                    <SignupForm />
                </div>
            </div>
        </div>
    );
}