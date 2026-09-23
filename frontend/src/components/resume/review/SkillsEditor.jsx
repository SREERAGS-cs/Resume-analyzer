import { useState } from "react";
import { X, Plus } from "lucide-react";

export default function SkillsEditor({ skills, onChange, editing }) {
    const [newSkill, setNewSkill] = useState("");

    const addSkill = () => {
        const trimmed = newSkill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
        }
        setNewSkill("");
    };

    const removeSkill = (index) => {
        onChange(skills.filter((_, i) => i !== index));
    };

    if (!editing) {
        return skills?.length ? (
            <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                    <span key={i} className="rounded-full bg-ink/5 px-3 py-1 text-xs text-ink">{skill}</span>
                ))}
            </div>
        ) : <p className="text-sm text-ink/40">No skills detected.</p>;
    }

    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs text-ink">
                        {skill}
                        <button onClick={() => removeSkill(i)} className="text-ink/40 hover:text-danger">
                            <X size={12} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="Add a skill…"
                    className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                />
                <button onClick={addSkill} className="flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-ink/5">
                    <Plus size={14} /> Add
                </button>
            </div>
        </div>
    );
}