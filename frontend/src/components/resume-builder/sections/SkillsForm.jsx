import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

export default function SkillsForm() {
    const { skills, setSkills } = useResumeBuilder();
    const [input, setInput] = useState("");

    const addSkill = () => {
        const trimmed = input.trim();
        if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
        setInput("");
    };

    const removeSkill = (index) => setSkills(skills.filter((_, i) => i !== index));

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Skills</label>
            <div className="mb-3 flex flex-wrap gap-2">
                {skills.length === 0 && <p className="text-sm text-ink/40">No skills added yet.</p>}
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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="Add a skill and press Enter…"
                    className="flex-1 rounded-md border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-signal/30"
                />
                <button onClick={addSkill} className="flex items-center gap-1 rounded-md border border-line px-3.5 py-2 text-sm text-ink hover:bg-ink/5">
                    <Plus size={14} /> Add
                </button>
            </div>
        </div>
    );
}