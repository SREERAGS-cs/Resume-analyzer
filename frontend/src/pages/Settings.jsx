import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    getUserSettings,
    updateUserSettings,
    exportUserData,
    deleteUserAccount,
} from "../services/settingsService";
import { changeUserPassword } from "../services/userService";
import { applyTheme, getStoredTheme } from "../utils/theme";
import {
    SlidersHorizontal,
    Bell,
    Shield,
    Lock,
    Info,
    Sun,
    Moon,
    Laptop,
    Briefcase,
    MapPin,
    Building2,
    Calendar,
    Save,
    RotateCcw,
    Download,
    LogOut,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Check,
    X,
    Loader2,
    HardDrive,
    KeyRound,
    HelpCircle,
    ExternalLink,
    Sparkles,
} from "lucide-react";

const WORK_MODES = ["Any", "Remote", "Hybrid", "On-site"];
const OPPORTUNITY_TYPES = [
    "Full-time",
    "Internship",
    "Part-time",
    "Contract",
    "Apprenticeship",
];

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Active Tab
    const [activeTab, setActiveTab] = useState("general");

    // Loading & Feedback
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // General Preferences state
    const [theme, setTheme] = useState(getStoredTheme());
    const [targetRole, setTargetRole] = useState("");
    const [jobLocation, setJobLocation] = useState("");
    const [workMode, setWorkMode] = useState("Any");
    const [opportunityType, setOpportunityType] = useState("Full-time");

    // Notification Preferences state
    const [emailJobAlerts, setEmailJobAlerts] = useState(true);
    const [emailAnalysisAlerts, setEmailAnalysisAlerts] = useState(true);
    const [emailSecurityAlerts, setEmailSecurityAlerts] = useState(true);
    const [inAppNotifications, setInAppNotifications] = useState(true);

    // Initial state cache for reset action
    const [initialSettings, setInitialSettings] = useState(null);

    // Security state
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Data Export state
    const [exporting, setExporting] = useState(false);

    // Account Deletion modal/state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // Fetch user settings on mount
    useEffect(() => {
        let isMounted = true;
        async function fetchSettings() {
            try {
                setLoading(true);
                const data = await getUserSettings();
                if (isMounted) {
                    setInitialSettings(data);
                    setTheme(data.theme || "system");
                    applyTheme(data.theme || "system");

                    setTargetRole(data.target_role || "");
                    setJobLocation(data.job_location || "");
                    setWorkMode(data.work_mode || "Any");
                    setOpportunityType(data.opportunity_type || "Full-time");

                    setEmailJobAlerts(data.email_job_alerts !== false);
                    setEmailAnalysisAlerts(data.email_analysis_alerts !== false);
                    setEmailSecurityAlerts(data.email_security_alerts !== false);
                    setInAppNotifications(data.in_app_notifications !== false);
                }
            } catch (err) {
                if (isMounted) {
                    setErrorMessage(
                        err.response?.data?.detail || "Failed to load user settings."
                    );
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchSettings();
        return () => {
            isMounted = false;
        };
    }, []);

    // Handle theme toggle
    const handleThemeSelect = (selectedTheme) => {
        setTheme(selectedTheme);
        applyTheme(selectedTheme);
    };

    // Reset settings to initial loaded state
    const handleReset = () => {
        if (!initialSettings) return;
        setTheme(initialSettings.theme || "system");
        applyTheme(initialSettings.theme || "system");
        setTargetRole(initialSettings.target_role || "");
        setJobLocation(initialSettings.job_location || "");
        setWorkMode(initialSettings.work_mode || "Any");
        setOpportunityType(initialSettings.opportunity_type || "Full-time");
        setEmailJobAlerts(initialSettings.email_job_alerts !== false);
        setEmailAnalysisAlerts(initialSettings.email_analysis_alerts !== false);
        setEmailSecurityAlerts(initialSettings.email_security_alerts !== false);
        setInAppNotifications(initialSettings.in_app_notifications !== false);
        setErrorMessage("");
        setSuccessMessage("Settings reset to previous saved state.");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    // Save preferences
    const handleSaveSettings = async () => {
        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                theme,
                target_role: targetRole.trim() || null,
                job_location: jobLocation.trim() || null,
                work_mode: workMode,
                opportunity_type: opportunityType,
                email_job_alerts: emailJobAlerts,
                email_analysis_alerts: emailAnalysisAlerts,
                email_security_alerts: emailSecurityAlerts,
                in_app_notifications: inAppNotifications,
            };

            const updated = await updateUserSettings(payload);
            setInitialSettings(updated);
            applyTheme(updated.theme);

            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err) {
            setErrorMessage(
                err.response?.data?.detail || err.message || "Failed to save settings."
            );
        } finally {
            setSaving(false);
        }
    };

    // Password validation logic
    const hasMinLength = passwordData.new_password.length >= 8;
    const hasUppercase = /[A-Z]/.test(passwordData.new_password);
    const hasLowercase = /[a-z]/.test(passwordData.new_password);
    const hasNumber = /[0-9]/.test(passwordData.new_password);
    const passwordsMatch =
        passwordData.new_password &&
        passwordData.new_password === passwordData.confirm_password;
    const isNewPasswordValid =
        hasMinLength && hasUppercase && hasLowercase && hasNumber;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (!passwordData.current_password) {
            setPasswordError("Please enter your current password.");
            return;
        }

        if (!isNewPasswordValid) {
            setPasswordError("New password does not meet the complexity requirements.");
            return;
        }

        if (!passwordsMatch) {
            setPasswordError("New password and confirmation do not match.");
            return;
        }

        if (passwordData.new_password === passwordData.current_password) {
            setPasswordError("New password cannot be the same as your current password.");
            return;
        }

        setPasswordSaving(true);
        try {
            await changeUserPassword({
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
                confirm_password: passwordData.confirm_password,
            });

            setPasswordSuccess("Password updated successfully.");
            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });
            setTimeout(() => setPasswordSuccess(""), 4000);
        } catch (err) {
            setPasswordError(
                err.response?.data?.detail || err.message || "Failed to update password."
            );
        } finally {
            setPasswordSaving(false);
        }
    };

    // Export user data as JSON file
    const handleExportData = async () => {
        setExporting(true);
        try {
            const data = await exportUserData();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `resumeiq_data_export_${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setSuccessMessage("Personal data export downloaded successfully.");
            setTimeout(() => setSuccessMessage(""), 4000);
        } catch (err) {
            setErrorMessage(
                err.response?.data?.detail || "Failed to export personal data."
            );
        } finally {
            setExporting(false);
        }
    };

    // Delete user account
    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteError("");

        if (!deletePassword) {
            setDeleteError("Please enter your password to confirm account deletion.");
            return;
        }

        if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
            setDeleteError("You must type DELETE in all caps to confirm.");
            return;
        }

        setDeleting(true);
        try {
            await deleteUserAccount({
                password: deletePassword,
                confirmation: "DELETE",
            });
            logout();
            navigate("/signup");
        } catch (err) {
            setDeleteError(
                err.response?.data?.detail || "Failed to delete account. Please check your password."
            );
            setDeleting(false);
        }
    };

    const navItems = [
        { id: "general", label: "General Preferences", icon: SlidersHorizontal },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "privacy", label: "Privacy & Data", icon: Shield },
        { id: "security", label: "Account & Security", icon: Lock },
        { id: "about", label: "About ResumeIQ", icon: Info },
    ];

    return (
        <DashboardLayout title="Settings">
            <div className="mx-auto max-w-5xl space-y-6 pb-16">
                {/* Header Title */}
                <div>
                    <h2 className="font-display text-2xl font-bold text-ink">Settings</h2>
                    <p className="text-sm text-ink/60">
                        Manage your application preferences, notifications, privacy, and account security.
                    </p>
                </div>

                {/* Status Banners */}
                {successMessage && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success animate-fade-in">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {errorMessage && (
                    <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger animate-fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setErrorMessage("")} className="text-danger/70 hover:text-danger">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-line bg-white">
                        <div className="flex items-center gap-3 text-sm text-ink/60">
                            <Loader2 size={20} className="animate-spin text-signal" />
                            <span>Loading settings...</span>
                        </div>
                    </div>
                ) : (
                    /* Layout: Left Navigation + Main Panel */
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        {/* Left Sidebar Navigation */}
                        <div className="lg:col-span-1">
                            <nav className="flex flex-row overflow-x-auto gap-1 rounded-xl border border-line bg-white p-2 lg:flex-col shadow-xs">
                                {navItems.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            setActiveTab(id);
                                            setErrorMessage("");
                                        }}
                                        className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors shrink-0 text-left ${
                                            activeTab === id
                                                ? "bg-signal/15 text-signal font-semibold"
                                                : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                                        }`}
                                    >
                                        <Icon size={16} className="shrink-0" />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Main Content Panel */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* SECTION A: General Preferences */}
                            {activeTab === "general" && (
                                <div className="space-y-6 rounded-xl border border-line bg-white p-6 shadow-sm">
                                    <div className="border-b border-line pb-4">
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            General Preferences
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Customize your interface appearance and career search parameters.
                                        </p>
                                    </div>

                                    {/* Theme Selector */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                            Interface Theme
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Light */}
                                            <button
                                                type="button"
                                                onClick={() => handleThemeSelect("light")}
                                                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                                                    theme === "light"
                                                        ? "border-signal bg-signal/10 text-ink ring-2 ring-signal/30 font-semibold"
                                                        : "border-line bg-paper/30 text-ink/70 hover:border-line hover:bg-paper"
                                                }`}
                                            >
                                                <Sun size={20} className={theme === "light" ? "text-signal" : ""} />
                                                <span className="text-xs">Light</span>
                                            </button>

                                            {/* Dark */}
                                            <button
                                                type="button"
                                                onClick={() => handleThemeSelect("dark")}
                                                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                                                    theme === "dark"
                                                        ? "border-signal bg-signal/10 text-ink ring-2 ring-signal/30 font-semibold"
                                                        : "border-line bg-paper/30 text-ink/70 hover:border-line hover:bg-paper"
                                                }`}
                                            >
                                                <Moon size={20} className={theme === "dark" ? "text-signal" : ""} />
                                                <span className="text-xs">Dark</span>
                                            </button>

                                            {/* System */}
                                            <button
                                                type="button"
                                                onClick={() => handleThemeSelect("system")}
                                                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                                                    theme === "system"
                                                        ? "border-signal bg-signal/10 text-ink ring-2 ring-signal/30 font-semibold"
                                                        : "border-line bg-paper/30 text-ink/70 hover:border-line hover:bg-paper"
                                                }`}
                                            >
                                                <Laptop size={20} className={theme === "system" ? "text-signal" : ""} />
                                                <span className="text-xs">System</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Career Preferences */}
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-2">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/70">
                                                <Briefcase size={14} className="text-signal" />
                                                Default Target Role
                                            </label>
                                            <input
                                                type="text"
                                                value={targetRole}
                                                onChange={(e) => setTargetRole(e.target.value)}
                                                placeholder="e.g. Senior Full-Stack Engineer"
                                                className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                            />
                                            <p className="mt-1 text-xs text-ink/50">
                                                Pre-selects this role during ATS scans & intelligence checks.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/70">
                                                <MapPin size={14} className="text-signal" />
                                                Preferred Job Location
                                            </label>
                                            <input
                                                type="text"
                                                value={jobLocation}
                                                onChange={(e) => setJobLocation(e.target.value)}
                                                placeholder="e.g. Bangalore, India"
                                                className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                            />
                                            <p className="mt-1 text-xs text-ink/50">
                                                Default search city for Adzuna job matching.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Work Mode & Opportunity Type */}
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-2">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/70">
                                                <Building2 size={14} className="text-signal" />
                                                Preferred Work Mode
                                            </label>
                                            <select
                                                value={workMode}
                                                onChange={(e) => setWorkMode(e.target.value)}
                                                className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                            >
                                                {WORK_MODES.map((mode) => (
                                                    <option key={mode} value={mode}>
                                                        {mode}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/70">
                                                <Calendar size={14} className="text-signal" />
                                                Preferred Opportunity Type
                                            </label>
                                            <select
                                                value={opportunityType}
                                                onChange={(e) => setOpportunityType(e.target.value)}
                                                className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                            >
                                                {OPPORTUNITY_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            disabled={saving}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper transition-colors disabled:opacity-50"
                                        >
                                            <RotateCcw size={15} />
                                            <span>Reset</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Save size={16} />
                                            )}
                                            <span>{saving ? "Saving..." : "Save Preferences"}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SECTION B: Notifications */}
                            {activeTab === "notifications" && (
                                <div className="space-y-6 rounded-xl border border-line bg-white p-6 shadow-sm">
                                    <div className="border-b border-line pb-4">
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            Notification Preferences
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Choose which alerts and communication channels you want enabled.
                                        </p>
                                    </div>

                                    <div className="divide-y divide-line/60">
                                        {/* Job recommendation updates */}
                                        <div className="flex items-center justify-between py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-ink">
                                                    Job Recommendation Updates
                                                </p>
                                                <p className="text-xs text-ink/60 max-w-md">
                                                    Receive notifications when new high-match positions match your resume and target role.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={emailJobAlerts}
                                                    onChange={(e) => setEmailJobAlerts(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="h-6 w-11 rounded-full bg-line peer peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                                            </label>
                                        </div>

                                        {/* Resume analysis completion */}
                                        <div className="flex items-center justify-between py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-ink">
                                                    Resume Analysis Completion
                                                </p>
                                                <p className="text-xs text-ink/60 max-w-md">
                                                    Get notified whenever ATS score generation and AI recommendation reports complete.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={emailAnalysisAlerts}
                                                    onChange={(e) => setEmailAnalysisAlerts(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="h-6 w-11 rounded-full bg-line peer peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                                            </label>
                                        </div>

                                        {/* Important security & account */}
                                        <div className="flex items-center justify-between py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-ink">
                                                    Account & Security Notices
                                                </p>
                                                <p className="text-xs text-ink/60 max-w-md">
                                                    Alerts on password changes, new sessions, and account security changes.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={emailSecurityAlerts}
                                                    onChange={(e) => setEmailSecurityAlerts(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="h-6 w-11 rounded-full bg-line peer peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                                            </label>
                                        </div>

                                        {/* In-app badges */}
                                        <div className="flex items-center justify-between py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-semibold text-ink">
                                                    In-App Notification Indicator
                                                </p>
                                                <p className="text-xs text-ink/60 max-w-md">
                                                    Display the orange badge dot in the header navigation bar when alerts occur.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={inAppNotifications}
                                                    onChange={(e) => setInAppNotifications(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="h-6 w-11 rounded-full bg-line peer peer-checked:bg-signal peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                                        <button
                                            type="button"
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Save size={16} />
                                            )}
                                            <span>{saving ? "Saving..." : "Save Preferences"}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SECTION C: Privacy & Data */}
                            {activeTab === "privacy" && (
                                <div className="space-y-6 rounded-xl border border-line bg-white p-6 shadow-sm">
                                    <div className="border-b border-line pb-4">
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            Privacy & Data Control
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Control your stored personal data, download an archive, or remove your account.
                                        </p>
                                    </div>

                                    {/* Data summary card */}
                                    <div className="rounded-xl border border-line bg-paper/40 p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/70">
                                            <HardDrive size={15} className="text-signal" />
                                            <span>Stored Account Data Overview</span>
                                        </div>
                                        <p className="text-xs text-ink/70 leading-relaxed">
                                            ResumeIQ stores your profile, uploaded resumes, ATS scores, draft documents, and job recommendations securely in a dedicated MySQL database. Password hashes are salted using Bcrypt. Credentials and API keys are never stored in user documents.
                                        </p>
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={handleExportData}
                                                disabled={exporting}
                                                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-paper transition-colors disabled:opacity-50"
                                            >
                                                {exporting ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Download size={14} />
                                                )}
                                                <span>Download Personal Data Archive (.JSON)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sign out */}
                                    <div className="flex items-center justify-between border-t border-line/60 pt-4">
                                        <div>
                                            <p className="text-sm font-semibold text-ink">Current Session</p>
                                            <p className="text-xs text-ink/60">
                                                Sign out of ResumeIQ on this browser.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={logout}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:bg-paper transition-colors"
                                        >
                                            <LogOut size={14} />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>

                                    {/* Account Deletion */}
                                    <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-bold text-danger">
                                            <Trash2 size={16} />
                                            <span>Danger Zone: Delete Account</span>
                                        </div>
                                        <p className="text-xs text-danger/80 leading-relaxed">
                                            Permanently delete your ResumeIQ account, uploaded resume files, analysis records, draft documents, and settings. This action is irreversible.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteModal(true)}
                                            className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-xs font-semibold text-white hover:bg-danger/90 transition-colors shadow-xs"
                                        >
                                            <span>Delete Account</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SECTION D: Security */}
                            {activeTab === "security" && (
                                <div className="space-y-6">
                                    {/* Security overview */}
                                    <div className="rounded-xl border border-line bg-white p-6 shadow-sm space-y-4">
                                        <div className="border-b border-line pb-3">
                                            <h3 className="font-display text-lg font-semibold text-ink">
                                                Account Security
                                            </h3>
                                            <p className="text-sm text-ink/60">
                                                Review your security parameters and update your password.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                            <div className="rounded-lg border border-line bg-paper/40 p-3 space-y-1">
                                                <span className="text-[11px] font-bold uppercase text-ink/50">
                                                    Authentication
                                                </span>
                                                <p className="text-sm font-semibold text-ink">JWT Bearer Token</p>
                                            </div>
                                            <div className="rounded-lg border border-line bg-paper/40 p-3 space-y-1">
                                                <span className="text-[11px] font-bold uppercase text-ink/50">
                                                    Encryption
                                                </span>
                                                <p className="text-sm font-semibold text-ink">Bcrypt (Salted)</p>
                                            </div>
                                            <div className="rounded-lg border border-line bg-paper/40 p-3 space-y-1">
                                                <span className="text-[11px] font-bold uppercase text-ink/50">
                                                    Token Life
                                                </span>
                                                <p className="text-sm font-semibold text-ink">30 Minutes</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password update card */}
                                    <div className="rounded-xl border border-line bg-white p-6 shadow-sm space-y-5">
                                        <div className="flex items-center gap-2 text-ink">
                                            <KeyRound size={18} className="text-signal" />
                                            <h4 className="font-display text-base font-semibold">Change Password</h4>
                                        </div>

                                        {passwordSuccess && (
                                            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                                                <CheckCircle2 size={18} />
                                                <span>{passwordSuccess}</span>
                                            </div>
                                        )}

                                        {passwordError && (
                                            <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle size={18} />
                                                    <span>{passwordError}</span>
                                                </div>
                                                <button onClick={() => setPasswordError("")} className="text-danger/70 hover:text-danger">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleChangePassword} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                                    Current Password
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={passwordData.current_password}
                                                        onChange={(e) =>
                                                            setPasswordData((p) => ({
                                                                ...p,
                                                                current_password: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Enter current password"
                                                        required
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword((s) => !s)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                                    New Password
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={passwordData.new_password}
                                                        onChange={(e) =>
                                                            setPasswordData((p) => ({
                                                                ...p,
                                                                new_password: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Enter new password"
                                                        required
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword((s) => !s)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                                                    >
                                                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                                    Confirm New Password
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={passwordData.confirm_password}
                                                        onChange={(e) =>
                                                            setPasswordData((p) => ({
                                                                ...p,
                                                                confirm_password: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Re-enter new password"
                                                        required
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword((s) => !s)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Complexity checklist */}
                                            <div className="rounded-lg border border-line/70 bg-paper/40 p-3.5">
                                                <p className="text-xs font-semibold text-ink/70 mb-2">
                                                    Password Requirements:
                                                </p>
                                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
                                                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-success font-medium" : "text-ink/50"}`}>
                                                        <Check size={14} className={hasMinLength ? "text-success" : "text-ink/30"} />
                                                        <span>At least 8 characters</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-success font-medium" : "text-ink/50"}`}>
                                                        <Check size={14} className={hasUppercase ? "text-success" : "text-ink/30"} />
                                                        <span>One uppercase letter</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-success font-medium" : "text-ink/50"}`}>
                                                        <Check size={14} className={hasLowercase ? "text-success" : "text-ink/30"} />
                                                        <span>One lowercase letter</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 ${hasNumber ? "text-success font-medium" : "text-ink/50"}`}>
                                                        <Check size={14} className={hasNumber ? "text-success" : "text-ink/30"} />
                                                        <span>One numeric digit</span>
                                                    </div>
                                                    {passwordData.confirm_password && (
                                                        <div className={`col-span-full flex items-center gap-1.5 ${passwordsMatch ? "text-success font-medium" : "text-danger"}`}>
                                                            <Check size={14} className={passwordsMatch ? "text-success" : "text-danger"} />
                                                            <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        passwordSaving ||
                                                        !passwordData.current_password ||
                                                        !isNewPasswordValid ||
                                                        !passwordsMatch
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                                >
                                                    {passwordSaving ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <KeyRound size={16} />
                                                    )}
                                                    <span>{passwordSaving ? "Updating Password..." : "Update Password"}</span>
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* SECTION E: About ResumeIQ */}
                            {activeTab === "about" && (
                                <div className="space-y-6 rounded-xl border border-line bg-white p-6 shadow-sm">
                                    <div className="border-b border-line pb-4">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={20} className="text-signal" />
                                            <h3 className="font-display text-lg font-semibold text-ink">
                                                About ResumeIQ
                                            </h3>
                                        </div>
                                        <p className="text-sm text-ink/60">
                                            Version 1.0.0 — AI-powered resume intelligence & career accelerator.
                                        </p>
                                    </div>

                                    <div className="space-y-4 text-sm text-ink/80 leading-relaxed">
                                        <p>
                                            <strong>ResumeIQ</strong> is a comprehensive SaaS platform built to bridge the gap between job candidates and modern Applicant Tracking Systems (ATS). Using intelligent parsing, semantic role matching, and evidence-based AI recommendations, ResumeIQ empowers candidates to target high-impact career opportunities with confidence.
                                        </p>
                                    </div>

                                    {/* Core Modules Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div className="rounded-lg border border-line bg-paper/40 p-3.5 space-y-1">
                                            <p className="text-xs font-bold text-ink">Role-Aware ATS Scoring</p>
                                            <p className="text-xs text-ink/60">
                                                Evaluates skill matches, experience depth, qualification keywords, and ATS parsing readiness.
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-line bg-paper/40 p-3.5 space-y-1">
                                            <p className="text-xs font-bold text-ink">Live Job Matching</p>
                                            <p className="text-xs text-ink/60">
                                                Connects directly to live Adzuna listings with personalized skill matching and location compatibility.
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-line bg-paper/40 p-3.5 space-y-1">
                                            <p className="text-xs font-bold text-ink">AI Resume Intelligence</p>
                                            <p className="text-xs text-ink/60">
                                                Powered by Google Gemini 3.5 Flash for high-speed resume extraction and bullet optimization.
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-line bg-paper/40 p-3.5 space-y-1">
                                            <p className="text-xs font-bold text-ink">Interactive Resume Builder</p>
                                            <p className="text-xs text-ink/60">
                                                Design, draft, and preview PDF resumes with real-time styling and template rendering.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tech Stack Metadata */}
                                    <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-2 text-xs">
                                        <div className="flex items-center justify-between border-b border-line/50 pb-2">
                                            <span className="text-ink/60">Frontend Stack</span>
                                            <span className="font-semibold text-ink">React.js 18 · Vite · TailwindCSS</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-line/50 pb-2">
                                            <span className="text-ink/60">Backend Stack</span>
                                            <span className="font-semibold text-ink">FastAPI · Python 3.12 · SQLAlchemy</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-line/50 pb-2">
                                            <span className="text-ink/60">Database</span>
                                            <span className="font-semibold text-ink">MySQL · PyMySQL</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-ink/60">API Health Status</span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-success">
                                                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                                Operational (v1.0.0)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Account Deletion Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl space-y-4">
                        <div className="flex items-center gap-2.5 text-danger">
                            <AlertCircle size={22} />
                            <h4 className="font-display text-lg font-bold">Confirm Account Deletion</h4>
                        </div>

                        <p className="text-xs text-ink/70 leading-relaxed">
                            This action is permanent and cannot be undone. All your resumes, ATS analyses, job matches, and saved settings will be deleted immediately.
                        </p>

                        {deleteError && (
                            <div className="rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs text-danger">
                                {deleteError}
                            </div>
                        )}

                        <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                    Your Password
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter your account password"
                                    required
                                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                                    Type <span className="text-danger font-mono font-bold">DELETE</span> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="DELETE"
                                    required
                                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeletePassword("");
                                        setDeleteConfirmation("");
                                        setDeleteError("");
                                    }}
                                    disabled={deleting}
                                    className="rounded-md border border-line px-3.5 py-2 text-xs font-medium text-ink hover:bg-paper transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleting || !deletePassword || deleteConfirmation !== "DELETE"}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-xs font-bold text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
                                >
                                    {deleting && <Loader2 size={14} className="animate-spin" />}
                                    <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
