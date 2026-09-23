import { useEffect, useRef, useState } from "react";
import TemplateRenderer from "./TemplateRenderer";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export default function ResumeCanvas({ templateId, resumeData, fontFamily, fontSizeScale }) {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(0.4);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / A4_WIDTH));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-md border border-line bg-white shadow-sm"
            style={{ height: A4_HEIGHT * scale }}
        >
            <div style={{ width: A4_WIDTH, height: A4_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <div style={{ fontFamily: fontFamily || undefined, zoom: fontSizeScale ? `${fontSizeScale}%` : undefined }}>
                    <TemplateRenderer templateId={templateId} resumeData={resumeData} />
                </div>
            </div>
        </div>
    );
}