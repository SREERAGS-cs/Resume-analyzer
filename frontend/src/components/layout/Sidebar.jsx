import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Upload,
    PenLine,
    History,
    ScanSearch,
    Target,
    Briefcase,
    Sparkles,
    User,
    Settings,
    LogOut,
    X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navSections = [
    {
        label: "Dashboard",
        items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Resumes",
        items: [
            { to: "/resumes", label: "My Resumes", icon: FileText },
            { to: "/upload-resume", label: "Upload Resume", icon: Upload },
            { to: "/choose-template", label: "Create Resume", icon: PenLine },
            { to: "/resume-history", label: "Resume History", icon: History },
        ],
    },
    {
        label: "Analysis",
        items: [
            { to: "/analysis", label: "Resume Analysis", icon: ScanSearch },
            { to: "/ats-score", label: "ATS Score", icon: Target },
        ],
    },
    {
        label: "Job Matching",
        items: [{ to: "/job-matching", label: "Job Matching", icon: Briefcase }],
    },
    {
        label: "Recommendations",
        items: [{ to: "/recommendations", label: "AI Recommendations", icon: Sparkles }],
    },
    {
        label: "Account",
        items: [
            { to: "/profile", label: "Profile", icon: User },
            { to: "/settings", label: "Settings", icon: Settings },
        ],
    },
];

/**
 * collapsed: desktop icon-only mode
 * mobileOpen / onCloseMobile: mobile drawer state, controlled by DashboardLayout
 */
export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
    const { logout } = useAuth();

    const linkClasses = ({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
     ${isActive ? "bg-signal/15 text-signal" : "text-paper/70 hover:bg-paper/5 hover:text-paper"}
     ${collapsed ? "justify-center" : ""}`;

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-ink/60 lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-ink text-paper transition-all duration-200
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                <div className="flex items-center justify-between px-5 py-5">
                    {!collapsed && (
                        <span className="font-display text-lg font-semibold tracking-tight">
                            Resume Analyzer
                        </span>
                    )}
                    <button onClick={onCloseMobile} className="text-paper/60 hover:text-paper lg:hidden">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 pb-4">
                    {navSections.map((section) => (
                        <div key={section.label} className="mb-5">
                            {!collapsed && (
                                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-paper/35">
                                    {section.label}
                                </p>
                            )}
                            <div className="flex flex-col gap-1">
                                {section.items.map(({ to, label, icon: Icon }) => (
                                    <NavLink key={to} to={to} className={linkClasses} title={collapsed ? label : undefined}>
                                        <Icon size={18} className="shrink-0" />
                                        {!collapsed && <span>{label}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-paper/10 px-3 py-4">
                    <button
                        onClick={logout}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-paper/70
              hover:bg-paper/5 hover:text-paper transition-colors ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? "Logout" : undefined}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}