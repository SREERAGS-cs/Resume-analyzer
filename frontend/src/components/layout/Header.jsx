import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Menu, User, Settings, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header({ title, onToggleSidebar, onOpenMobileSidebar, collapsed }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
                <button onClick={onOpenMobileSidebar} className="text-ink/60 hover:text-ink lg:hidden">
                    <Menu size={20} />
                </button>
                <button onClick={onToggleSidebar} className="hidden text-ink/60 hover:text-ink lg:block">
                    {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                </button>
                <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative text-ink/60 hover:text-ink" aria-label="Notifications">
                    <Bell size={20} />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-signal" />
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen((o) => !o)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ink/5 transition-colors"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
                            {initials}
                        </div>
                        <span className="hidden text-sm font-medium text-ink sm:block">
                            {user?.full_name || "User"}
                        </span>
                        <ChevronDown size={16} className="text-ink/50" />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md border border-line bg-white py-1.5 shadow-lg">
                            <button
                                onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-ink/80 hover:bg-ink/5"
                            >
                                <User size={16} /> Profile
                            </button>
                            <button
                                onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-ink/80 hover:bg-ink/5"
                            >
                                <Settings size={16} /> Settings
                            </button>
                            <div className="my-1 border-t border-line" />
                            <button
                                onClick={logout}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger hover:bg-danger/5"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}