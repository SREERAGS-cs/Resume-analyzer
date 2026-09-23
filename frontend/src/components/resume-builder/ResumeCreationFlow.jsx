import { Outlet } from "react-router-dom";
import { ResumeBuilderProvider } from "../../context/ResumeBuilderContext";

export default function ResumeCreationFlow() {
    return (
        <ResumeBuilderProvider>
            <Outlet />
        </ResumeBuilderProvider>
    );
}