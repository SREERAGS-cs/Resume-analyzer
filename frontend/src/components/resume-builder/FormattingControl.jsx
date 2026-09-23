import { fontFamilyOptions, fontSizeOptions } from "../../config/fontOptions";
import { useResumeBuilder } from "../../context/ResumeBuilderContext";

export default function FormattingControls() {
    const { fontFamilyId, setFontFamilyId, fontSizeId, setFontSizeId } = useResumeBuilder();

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4">
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-ink/60">Font</label>
                <select
                    value={fontFamilyId}
                    onChange={(e) => setFontFamilyId(e.target.value)}
                    className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink outline-none focus:border-signal"
                >
                    {fontFamilyOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-ink/60">Size</label>
                <select
                    value={fontSizeId}
                    onChange={(e) => setFontSizeId(e.target.value)}
                    className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink outline-none focus:border-signal"
                >
                    {fontSizeOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>
        </div>
    );
}