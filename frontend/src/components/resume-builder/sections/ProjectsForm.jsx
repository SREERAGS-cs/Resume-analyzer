import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "projectName", label: "Project Name", placeholder: "Resume Analyzer" },
    { key: "description", label: "Description", type: "textarea", placeholder: "What the project does" },
    { key: "technologies", label: "Technologies", type: "list", placeholder: "One per line" },
    { key: "projectLink", label: "Project Link", placeholder: "https://…" },
];

export default function ProjectsForm() {
    const { projects, projectActions, blankProject } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={projects}
            fields={FIELDS}
            onAdd={() => projectActions.add(blankProject)}
            onUpdate={projectActions.update}
            onRemove={projectActions.remove}
            emptyLabel="No projects added yet."
            addLabel="Add Project"
        />
    );
}