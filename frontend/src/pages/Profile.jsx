import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
} from "../services/userService";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Linkedin,
    Github,
    Globe,
    GraduationCap,
    Briefcase,
    FileText,
    Lock,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Save,
    X,
    Edit3,
    Calendar,
    ExternalLink,
    Eye,
    EyeOff,
    Sparkles,
    Check,
    KeyRound,
    Loader2,
} from "lucide-react";

export default function Profile() {
    const { user: authUser, updateUser } = useAuth();

    // Tab state: "personal" | "professional" | "security"
    const [activeTab, setActiveTab] = useState("personal");

    // Profile state
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        location: "",
        linkedin_url: "",
        github_url: "",
        portfolio_url: "",
        education: "",
        target_role: "",
        bio: "",
    });

    const [loading, setLoading] = useState(true);
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingProfessional, setIsEditingProfessional] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

    // Password change state
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");

    // Load user profile on mount
    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setProfileError("");
                const data = await getUserProfile();
                if (isMounted) {
                    setProfile(data);
                    setFormData({
                        full_name: data.full_name || "",
                        email: data.email || "",
                        phone: data.phone || "",
                        location: data.location || "",
                        linkedin_url: data.linkedin_url || "",
                        github_url: data.github_url || "",
                        portfolio_url: data.portfolio_url || "",
                        education: data.education || "",
                        target_role: data.target_role || "",
                        bio: data.bio || "",
                    });
                    // Sync with auth context
                    updateUser(data);
                }
            } catch (err) {
                if (isMounted) {
                    setProfileError(
                        err.response?.data?.detail || "Failed to load profile. Please refresh."
                    );
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchProfile();
        return () => {
            isMounted = false;
        };
    }, []);

    // Format date string
    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
        try {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
            }).format(date);
        } catch {
            return "N/A";
        }
    };

    // Initials fallback
    const getInitials = (name) => {
        if (!name) return "?";
        return name
            .trim()
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("");
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (profileError) setProfileError("");
    };

    // Cancel editing personal info
    const handleCancelPersonal = () => {
        if (profile) {
            setFormData((prev) => ({
                ...prev,
                full_name: profile.full_name || "",
                email: profile.email || "",
                phone: profile.phone || "",
                location: profile.location || "",
                linkedin_url: profile.linkedin_url || "",
                github_url: profile.github_url || "",
                portfolio_url: profile.portfolio_url || "",
            }));
        }
        setIsEditingPersonal(false);
        setProfileError("");
    };

    // Cancel editing professional info
    const handleCancelProfessional = () => {
        if (profile) {
            setFormData((prev) => ({
                ...prev,
                education: profile.education || "",
                target_role: profile.target_role || "",
                bio: profile.bio || "",
            }));
        }
        setIsEditingProfessional(false);
        setProfileError("");
    };

    // Save profile changes
    const handleSaveProfile = async (section) => {
        setSaving(true);
        setProfileError("");
        setProfileSuccess("");

        try {
            // Validate client-side
            if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
                throw new Error("Full name must be at least 2 characters.");
            }
            if (!formData.email.trim()) {
                throw new Error("Email address is required.");
            }

            const payload = {
                full_name: formData.full_name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim() || null,
                location: formData.location.trim() || null,
                linkedin_url: formData.linkedin_url.trim() || null,
                github_url: formData.github_url.trim() || null,
                portfolio_url: formData.portfolio_url.trim() || null,
                education: formData.education.trim() || null,
                target_role: formData.target_role.trim() || null,
                bio: formData.bio.trim() || null,
            };

            const updated = await updateUserProfile(payload);
            setProfile(updated);
            setFormData({
                full_name: updated.full_name || "",
                email: updated.email || "",
                phone: updated.phone || "",
                location: updated.location || "",
                linkedin_url: updated.linkedin_url || "",
                github_url: updated.github_url || "",
                portfolio_url: updated.portfolio_url || "",
                education: updated.education || "",
                target_role: updated.target_role || "",
                bio: updated.bio || "",
            });

            // Immediately synchronize AuthContext (header, sidebar, etc.)
            updateUser(updated);

            setProfileSuccess("Profile updated successfully!");
            if (section === "personal") setIsEditingPersonal(false);
            if (section === "professional") setIsEditingProfessional(false);

            setTimeout(() => setProfileSuccess(""), 4000);
        } catch (err) {
            const message =
                err.response?.data?.detail || err.message || "Failed to update profile.";
            setProfileError(message);
        } finally {
            setSaving(false);
        }
    };

    // Password validations
    const hasMinLength = passwordData.new_password.length >= 8;
    const hasUppercase = /[A-Z]/.test(passwordData.new_password);
    const hasLowercase = /[a-z]/.test(passwordData.new_password);
    const hasNumber = /[0-9]/.test(passwordData.new_password);
    const passwordsMatch =
        passwordData.new_password &&
        passwordData.new_password === passwordData.confirm_password;
    const isNewPasswordValid =
        hasMinLength && hasUppercase && hasLowercase && hasNumber;

    // Handle password change
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

            setPasswordSuccess("Password changed successfully.");
            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });
            setTimeout(() => setPasswordSuccess(""), 4000);
        } catch (err) {
            const message =
                err.response?.data?.detail || err.message || "Failed to change password.";
            setPasswordError(message);
        } finally {
            setPasswordSaving(false);
        }
    };

    const initials = getInitials(profile?.full_name || authUser?.full_name);

    return (
        <DashboardLayout title="Profile">
            <div className="mx-auto max-w-5xl space-y-6 pb-12">
                {/* Notification banners */}
                {profileSuccess && (
                    <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success animate-fade-in">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span>{profileSuccess}</span>
                    </div>
                )}
                {profileError && (
                    <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger animate-fade-in">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{profileError}</span>
                        </div>
                        <button
                            onClick={() => setProfileError("")}
                            className="text-danger/70 hover:text-danger"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Loading state skeleton */}
                {loading && (
                    <div className="space-y-6">
                        <div className="h-44 w-full animate-pulse rounded-xl bg-ink/5" />
                        <div className="h-80 w-full animate-pulse rounded-xl bg-ink/5" />
                    </div>
                )}

                {!loading && profile && (
                    <>
                        {/* Section A: Profile Overview Hero Card */}
                        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
                            {/* Stylish Banner Top */}
                            <div className="relative h-28 bg-gradient-to-r from-ink via-[#243346] to-ink px-6 sm:h-32">
                                <div className="absolute inset-0 bg-[radial-gradient(#E8A33D_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                            </div>

                            {/* Banner Bottom / Content */}
                            <div className="relative px-6 pb-6 pt-0">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    {/* Avatar + Main Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
                                        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-ink shadow-md text-2xl sm:text-3xl font-bold font-display text-paper">
                                            {initials}
                                            <span
                                                className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-success"
                                                title="Account Active"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-display text-2xl font-bold text-ink">
                                                    {profile.full_name}
                                                </h2>
                                                {profile.target_role && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 px-2.5 py-0.5 text-xs font-semibold text-ink">
                                                        <Sparkles size={12} className="text-signal" />
                                                        {profile.target_role}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/70">
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={14} className="text-ink/40" />
                                                    <span>{profile.email}</span>
                                                </div>
                                                {profile.location && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={14} className="text-ink/40" />
                                                        <span>{profile.location}</span>
                                                    </div>
                                                )}
                                                {profile.created_at && (
                                                    <div className="flex items-center gap-1.5 text-ink/50 text-xs">
                                                        <Calendar size={13} />
                                                        <span>Joined {formatDate(profile.created_at)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center gap-2 pt-2 sm:pt-0">
                                        <button
                                            onClick={() => {
                                                setActiveTab("personal");
                                                setIsEditingPersonal(true);
                                            }}
                                            className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium text-ink shadow-xs hover:border-signal/50 hover:bg-white transition-colors"
                                        >
                                            <Edit3 size={15} />
                                            <span>Edit Profile</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modern Navigation Tabs */}
                            <div className="flex border-t border-line px-6 bg-paper/30">
                                <button
                                    onClick={() => setActiveTab("personal")}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-all ${
                                        activeTab === "personal"
                                            ? "border-signal text-ink font-semibold"
                                            : "border-transparent text-ink/60 hover:text-ink"
                                    }`}
                                >
                                    <User size={16} />
                                    <span>Personal Information</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("professional")}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-all ${
                                        activeTab === "professional"
                                            ? "border-signal text-ink font-semibold"
                                            : "border-transparent text-ink/60 hover:text-ink"
                                    }`}
                                >
                                    <Briefcase size={16} />
                                    <span>Professional Details</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("security")}
                                    className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-all ${
                                        activeTab === "security"
                                            ? "border-signal text-ink font-semibold"
                                            : "border-transparent text-ink/60 hover:text-ink"
                                    }`}
                                >
                                    <Lock size={16} />
                                    <span>Account & Security</span>
                                </button>
                            </div>
                        </div>

                        {/* Tab 1: Personal Information */}
                        {activeTab === "personal" && (
                            <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-line pb-4">
                                    <div>
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            Personal Information
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Manage your name, contact channels, and external links.
                                        </p>
                                    </div>
                                    {!isEditingPersonal ? (
                                        <button
                                            onClick={() => setIsEditingPersonal(true)}
                                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-ink/5 transition-colors"
                                        >
                                            <Edit3 size={15} />
                                            <span>Edit</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancelPersonal}
                                                disabled={saving}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper transition-colors disabled:opacity-50"
                                            >
                                                <X size={15} />
                                                <span>Cancel</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveProfile("personal")}
                                                disabled={saving}
                                                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <Loader2 size={15} className="animate-spin" />
                                                ) : (
                                                    <Save size={15} />
                                                )}
                                                <span>{saving ? "Saving..." : "Save Changes"}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!isEditingPersonal ? (
                                    /* Read-only Personal Info View */
                                    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
                                                Full Name
                                            </span>
                                            <p className="text-sm font-semibold text-ink">
                                                {profile.full_name || "—"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
                                                Email Address
                                            </span>
                                            <p className="text-sm font-semibold text-ink">
                                                {profile.email || "—"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
                                                Phone Number
                                            </span>
                                            <p className="text-sm text-ink">
                                                {profile.phone || (
                                                    <span className="italic text-ink/40">Not provided</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
                                                Location
                                            </span>
                                            <p className="text-sm text-ink">
                                                {profile.location || (
                                                    <span className="italic text-ink/40">Not provided</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="col-span-full border-t border-line/60 pt-4">
                                            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink/50">
                                                Links & Profiles
                                            </h4>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                {/* LinkedIn */}
                                                <div className="rounded-lg border border-line bg-paper/40 p-3.5">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-ink/60">
                                                        <Linkedin size={15} className="text-[#0A66C2]" />
                                                        <span>LinkedIn</span>
                                                    </div>
                                                    {profile.linkedin_url ? (
                                                        <a
                                                            href={profile.linkedin_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1.5 flex items-center gap-1 text-sm font-medium text-ink hover:text-signal truncate"
                                                        >
                                                            <span className="truncate">{profile.linkedin_url}</span>
                                                            <ExternalLink size={12} className="shrink-0 opacity-60" />
                                                        </a>
                                                    ) : (
                                                        <p className="mt-1.5 text-xs italic text-ink/40">Not linked</p>
                                                    )}
                                                </div>

                                                {/* GitHub */}
                                                <div className="rounded-lg border border-line bg-paper/40 p-3.5">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-ink/60">
                                                        <Github size={15} className="text-ink" />
                                                        <span>GitHub</span>
                                                    </div>
                                                    {profile.github_url ? (
                                                        <a
                                                            href={profile.github_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1.5 flex items-center gap-1 text-sm font-medium text-ink hover:text-signal truncate"
                                                        >
                                                            <span className="truncate">{profile.github_url}</span>
                                                            <ExternalLink size={12} className="shrink-0 opacity-60" />
                                                        </a>
                                                    ) : (
                                                        <p className="mt-1.5 text-xs italic text-ink/40">Not linked</p>
                                                    )}
                                                </div>

                                                {/* Portfolio */}
                                                <div className="rounded-lg border border-line bg-paper/40 p-3.5">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-ink/60">
                                                        <Globe size={15} className="text-signal" />
                                                        <span>Portfolio Website</span>
                                                    </div>
                                                    {profile.portfolio_url ? (
                                                        <a
                                                            href={profile.portfolio_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1.5 flex items-center gap-1 text-sm font-medium text-ink hover:text-signal truncate"
                                                        >
                                                            <span className="truncate">{profile.portfolio_url}</span>
                                                            <ExternalLink size={12} className="shrink-0 opacity-60" />
                                                        </a>
                                                    ) : (
                                                        <p className="mt-1.5 text-xs italic text-ink/40">Not linked</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Editable Personal Info Form */
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveProfile("personal");
                                        }}
                                        className="mt-6 space-y-5"
                                    >
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            {/* Full Name */}
                                            <div>
                                                <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    Full Name <span className="text-danger">*</span>
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type="text"
                                                        value={formData.full_name}
                                                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                                                        placeholder="Jane Doe"
                                                        required
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Email Address */}
                                            <div>
                                                <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    Email Address <span className="text-danger">*</span>
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={(e) => handleInputChange("email", e.target.value)}
                                                        placeholder="jane.doe@example.com"
                                                        required
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-ink/50">
                                                    Used for login notifications and account recovery.
                                                </p>
                                            </div>

                                            {/* Phone Number */}
                                            <div>
                                                <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    Phone Number
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type="tel"
                                                        value={formData.phone}
                                                        onChange={(e) => handleInputChange("phone", e.target.value)}
                                                        placeholder="+1 (555) 012-3456"
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div>
                                                <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    Location
                                                </label>
                                                <div className="relative mt-1.5">
                                                    <input
                                                        type="text"
                                                        value={formData.location}
                                                        onChange={(e) => handleInputChange("location", e.target.value)}
                                                        placeholder="City, State / Country"
                                                        className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Social Links Sub-form */}
                                        <div className="border-t border-line/60 pt-4 space-y-4">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-ink/60">
                                                Web & Professional Links
                                            </h4>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <div>
                                                    <label className="flex items-center gap-1.5 text-xs font-medium text-ink/70">
                                                        <Linkedin size={14} className="text-[#0A66C2]" />
                                                        <span>LinkedIn URL</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.linkedin_url}
                                                        onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                                                        placeholder="linkedin.com/in/janedoe"
                                                        className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-1.5 text-xs font-medium text-ink/70">
                                                        <Github size={14} className="text-ink" />
                                                        <span>GitHub URL</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.github_url}
                                                        onChange={(e) => handleInputChange("github_url", e.target.value)}
                                                        placeholder="github.com/janedoe"
                                                        className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-1.5 text-xs font-medium text-ink/70">
                                                        <Globe size={14} className="text-signal" />
                                                        <span>Portfolio Website</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.portfolio_url}
                                                        onChange={(e) => handleInputChange("portfolio_url", e.target.value)}
                                                        placeholder="janedoe.dev"
                                                        className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-3">
                                            <button
                                                type="button"
                                                onClick={handleCancelPersonal}
                                                disabled={saving}
                                                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                            >
                                                {saving && <Loader2 size={16} className="animate-spin" />}
                                                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* Tab 2: Professional Details */}
                        {activeTab === "professional" && (
                            <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-line pb-4">
                                    <div>
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            Professional Profile
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Configure target roles, qualifications, and your professional bio.
                                        </p>
                                    </div>
                                    {!isEditingProfessional ? (
                                        <button
                                            onClick={() => setIsEditingProfessional(true)}
                                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-ink/5 transition-colors"
                                        >
                                            <Edit3 size={15} />
                                            <span>Edit</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancelProfessional}
                                                disabled={saving}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper transition-colors disabled:opacity-50"
                                            >
                                                <X size={15} />
                                                <span>Cancel</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveProfile("professional")}
                                                disabled={saving}
                                                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <Loader2 size={15} className="animate-spin" />
                                                ) : (
                                                    <Save size={15} />
                                                )}
                                                <span>{saving ? "Saving..." : "Save Changes"}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Information box */}
                                <div className="my-5 flex items-start gap-3 rounded-lg border border-line bg-paper/60 p-3.5 text-xs text-ink/80">
                                    <Sparkles size={16} className="mt-0.5 shrink-0 text-signal" />
                                    <span>
                                        These preferences personalize your workspace and AI recommendations.
                                        Editing your profile is kept separate and will not overwrite individual resume files.
                                    </span>
                                </div>

                                {!isEditingProfessional ? (
                                    /* Read-only Professional View */
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/50">
                                                    <Briefcase size={14} />
                                                    Career Interest / Target Role
                                                </span>
                                                <p className="text-sm font-semibold text-ink">
                                                    {profile.target_role || (
                                                        <span className="italic font-normal text-ink/40">Not specified</span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/50">
                                                    <GraduationCap size={14} />
                                                    Current Education / Qualification
                                                </span>
                                                <p className="text-sm font-semibold text-ink">
                                                    {profile.education || (
                                                        <span className="italic font-normal text-ink/40">Not specified</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t border-line/60 pt-4">
                                            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/50">
                                                <FileText size={14} />
                                                Professional Bio
                                            </span>
                                            {profile.bio ? (
                                                <p className="whitespace-pre-line text-sm text-ink/85 leading-relaxed bg-paper/30 p-4 rounded-lg border border-line/50">
                                                    {profile.bio}
                                                </p>
                                            ) : (
                                                <p className="italic text-sm text-ink/40">
                                                    No professional bio added yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Editable Professional Form */
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveProfile("professional");
                                        }}
                                        className="space-y-5"
                                    >
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    <Briefcase size={14} />
                                                    Target Role / Career Interest
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.target_role}
                                                    onChange={(e) => handleInputChange("target_role", e.target.value)}
                                                    placeholder="e.g. Senior Full-Stack Engineer"
                                                    className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    <GraduationCap size={14} />
                                                    Education / Qualification
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.education}
                                                    onChange={(e) => handleInputChange("education", e.target.value)}
                                                    placeholder="e.g. B.S. in Computer Science"
                                                    className="mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink/70">
                                                    <FileText size={14} />
                                                    Professional Bio
                                                </label>
                                                <span className="text-xs text-ink/40">
                                                    {formData.bio.length} / 2000
                                                </span>
                                            </div>
                                            <textarea
                                                rows={4}
                                                maxLength={2000}
                                                value={formData.bio}
                                                onChange={(e) => handleInputChange("bio", e.target.value)}
                                                placeholder="Write a concise overview of your background, core strengths, and career ambitions..."
                                                className="mt-1.5 w-full rounded-md border border-line bg-white p-3 text-sm text-ink placeholder:text-ink/30 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 transition-all"
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-3">
                                            <button
                                                type="button"
                                                onClick={handleCancelProfessional}
                                                disabled={saving}
                                                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
                                            >
                                                {saving && <Loader2 size={16} className="animate-spin" />}
                                                <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* Tab 3: Security & Password */}
                        {activeTab === "security" && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                {/* Change Password Card */}
                                <div className="rounded-xl border border-line bg-white p-6 shadow-sm lg:col-span-2">
                                    <div className="border-b border-line pb-4">
                                        <h3 className="font-display text-lg font-semibold text-ink">
                                            Change Password
                                        </h3>
                                        <p className="text-sm text-ink/60">
                                            Update your password to keep your ResumeIQ account secure.
                                        </p>
                                    </div>

                                    {passwordSuccess && (
                                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                                            <CheckCircle2 size={18} />
                                            <span>{passwordSuccess}</span>
                                        </div>
                                    )}

                                    {passwordError && (
                                        <div className="mt-4 flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={18} />
                                                <span>{passwordError}</span>
                                            </div>
                                            <button
                                                onClick={() => setPasswordError("")}
                                                className="text-danger/70 hover:text-danger"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                                        {/* Current Password */}
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
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
                                                    required
                                                    autoComplete="current-password"
                                                    placeholder="Enter your current password"
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

                                        {/* New Password */}
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
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
                                                    required
                                                    autoComplete="new-password"
                                                    placeholder="Enter a new secure password"
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

                                        {/* Confirm New Password */}
                                        <div>
                                            <label className="block text-xs font-medium uppercase tracking-wider text-ink/70">
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
                                                    required
                                                    autoComplete="new-password"
                                                    placeholder="Re-enter your new password"
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

                                        {/* Password requirements checklist */}
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
                                                disabled={passwordSaving || !passwordData.current_password || !isNewPasswordValid || !passwordsMatch}
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

                                {/* Security Overview & Info Card */}
                                <div className="space-y-6">
                                    <div className="rounded-xl border border-line bg-white p-6 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 text-ink">
                                            <ShieldCheck size={20} className="text-success" />
                                            <h4 className="font-display text-base font-semibold">
                                                Account Security
                                            </h4>
                                        </div>
                                        <div className="space-y-3 text-xs text-ink/70">
                                            <div className="flex items-center justify-between border-b border-line/60 pb-2">
                                                <span>Authentication</span>
                                                <span className="font-semibold text-ink">JWT Bearer</span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-line/60 pb-2">
                                                <span>Password Hashing</span>
                                                <span className="font-semibold text-ink">Bcrypt (Salted)</span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-line/60 pb-2">
                                                <span>Account Status</span>
                                                <span className="inline-flex items-center gap-1 font-semibold text-success">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                                    Active
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>User Identifier</span>
                                                <span className="font-mono text-ink/60">#{profile.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
