import { useState } from "react";
import { AlertCircle, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { CUSTOM_ROLE_OPTION, ROLE_PROFILES } from "../data/roleProfiles";
import { useAuth } from "../context/AuthContext";
import { analyzeResumeIntelligence } from "../services/atsService";

function RoleCard({ profile, selected, onSelect }) {
    const Icon = profile.icon;

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={`relative flex min-h-36 flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                selected
                    ? "border-signal bg-signal/10 ring-2 ring-signal/30"
                    : "border-line bg-white hover:border-ink/30 hover:bg-paper/60"
            }`}
        >
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${selected ? "bg-signal/20 text-ink" : "bg-paper text-ink/60"}`}>
                <Icon size={18} aria-hidden="true" />
            </span>
            <span className="pr-6 text-sm font-semibold text-ink">{profile.name}</span>
            <span className="mt-1 text-xs leading-5 text-ink/60">{profile.description}</span>
            {selected && (
                <span className="absolute right-3 top-3 text-ink" aria-label="Selected">
                    <Check size={16} />
                </span>
            )}
        </button>
    );
}

export default function TargetRole() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { logout } = useAuth();
    const resumeId = Number(location.state?.resumeId ?? searchParams.get("resume_id"));
    const hasResumeId = Number.isSafeInteger(resumeId) && resumeId > 0;

    const [selectedRole, setSelectedRole] = useState(null);
    const [customRoleName, setCustomRoleName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const selectPredefinedRole = (profile) => {
        setSelectedRole({ id: profile.id, name: profile.name, type: "predefined" });
        setError("");
    };

    const selectCustomRole = () => {
        setSelectedRole({ id: "custom", name: "", type: "custom" });
        setError("");
    };

    const roleName = selectedRole?.type === "custom" ? customRoleName.trim() : selectedRole?.name;
    const needsCustomRole = selectedRole?.type === "custom" && !roleName;
    const canAnalyze = hasResumeId && !!selectedRole && !!roleName && !submitting;

    const handleAnalyze = async () => {
        if (submitting) return;
        if (!hasResumeId) {
            setError("We couldn't find the resume to analyze. Return to your resumes and try again.");
            return;
        }
        if (!selectedRole) {
            setError("Please select a target role to continue.");
            return;
        }
        if (!roleName) {
            setError("Please enter your target role.");
            return;
        }
        if (selectedRole.type === "predefined" && !ROLE_PROFILES.some((profile) => profile.id === selectedRole.id)) {
            setError("Please select a valid role.");
            return;
        }

        const targetRole = {
            id: selectedRole.id,
            name: roleName,
            type: selectedRole.type,
        };
        setSubmitting(true);
        setError("");

        try {
            const report = await analyzeResumeIntelligence(resumeId, targetRole.name);
            navigate(`/resume-analysis/${resumeId}`, { state: { resumeId, targetRole, report } });
        } catch (requestError) {
            if (requestError.response?.status === 401) {
                logout();
                navigate("/login", {
                    replace: true,
                    state: { message: "Your session expired. Please sign in again." },
                });
                return;
            }
            if (requestError.response?.status === 422) {
                setError("Please enter a valid target role.");
            } else {
                const detail = requestError.response?.data?.detail;
                setError(typeof detail === "string" ? detail : "Unable to analyze this resume right now. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!hasResumeId) {
        return (
            <DashboardLayout title="Choose Your Target Role">
                <div className="mx-auto max-w-2xl rounded-lg border border-line bg-white p-6">
                    <h1 className="font-display text-xl font-semibold text-ink">Choose Your Target Role</h1>
                    <p className="mt-2 text-sm text-ink/60">We couldn't find the resume to analyze.</p>
                    <button
                        type="button"
                        onClick={() => navigate("/resumes")}
                        className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                    >
                        <ArrowLeft size={15} /> Return to My Resumes
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Choose Your Target Role">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6">
                    <h1 className="font-display text-2xl font-bold text-ink">Choose Your Target Role</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
                        Select the role you are targeting so we can evaluate your resume against the skills and requirements relevant to that role.
                    </p>
                </header>

                {error && (
                    <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ROLE_PROFILES.map((profile) => (
                        <RoleCard
                            key={profile.id}
                            profile={profile}
                            selected={selectedRole?.id === profile.id}
                            onSelect={() => selectPredefinedRole(profile)}
                        />
                    ))}
                    <RoleCard
                        profile={CUSTOM_ROLE_OPTION}
                        selected={selectedRole?.id === CUSTOM_ROLE_OPTION.id}
                        onSelect={selectCustomRole}
                    />
                </div>

                {selectedRole?.type === "custom" && (
                    <div className="mt-4 max-w-xl">
                        <label htmlFor="custom-role" className="mb-1 block text-sm font-medium text-ink">Enter your target role</label>
                        <input
                            id="custom-role"
                            type="text"
                            maxLength={120}
                            value={customRoleName}
                            onChange={(event) => {
                                setCustomRoleName(event.target.value);
                                setError("");
                            }}
                            placeholder="e.g. Computer Vision Engineer"
                            className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                        />
                        {needsCustomRole && <p className="mt-1 text-xs text-danger">Please enter your target role.</p>}
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-ink/50">
                        {!selectedRole ? "Please select a target role to continue." : "Your selected role will be saved with this analysis."}
                    </p>
                    <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={!canAnalyze}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {submitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                        {submitting ? `Analyzing your resume for ${roleName}...` : "Analyze My Resume"}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
