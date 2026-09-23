import { forwardRef } from "react";
import TemplateRenderer from "../resume/templates/TemplateRenderer";

const A4_WIDTH = 794;

const ResumeExportCanvas = forwardRef(function ResumeExportCanvas({ templateId, resumeData, fontFamily, fontSizeScale }, ref) {
    return (
        <div style={{ position: "fixed", top: 0, left: "-10000px", width: A4_WIDTH }}>
            <div ref={ref} style={{ width: A4_WIDTH, fontFamily: fontFamily || undefined, zoom: fontSizeScale ? `${fontSizeScale}%` : undefined }}>
                <TemplateRenderer templateId={templateId} resumeData={resumeData} />
            </div>
        </div>
    );
});

export default ResumeExportCanvas;