import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ title, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-paper">
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
            />

            <div className={`transition-all duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
                <Header
                    title={title}
                    collapsed={collapsed}
                    onToggleSidebar={() => setCollapsed((c) => !c)}
                    onOpenMobileSidebar={() => setMobileOpen(true)}
                />
                <main className="px-5 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>
        </div>
    );
}