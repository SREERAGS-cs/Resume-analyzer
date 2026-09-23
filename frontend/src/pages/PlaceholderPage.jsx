import DashboardLayout from "../components/layout/DashboardLayout";
import { Construction } from "lucide-react";

export default function PlaceholderPage({ title }) {
    return (
        <DashboardLayout title={title}>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white py-20 text-center">
                <Construction size={32} className="mb-3 text-ink/30" />
                <h3 className="font-display text-lg font-semibold text-ink">{title} — coming soon</h3>
                <p className="mt-1.5 max-w-sm text-sm text-ink/60">
                    This section will be built in a later phase.
                </p>
            </div>
        </DashboardLayout>
    );
}