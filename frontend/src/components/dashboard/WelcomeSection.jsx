export default function WelcomeSection({ name }) {
    return (
        <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Welcome back, {name}! 👋
            </h2>
            <p className="mt-1.5 text-sm text-ink/60 sm:text-base">
                Let's make your resume stronger and get you closer to your next opportunity.
            </p>
        </div>
    );
}