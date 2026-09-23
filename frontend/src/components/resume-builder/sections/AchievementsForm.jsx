import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "title", label: "Title", placeholder: "Hackathon Winner" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Optional details" },
    { key: "date", label: "Date", placeholder: "2025" },
];

export default function AchievementsForm() {
    const { achievements, achievementActions, blankAchievement } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={achievements}
            fields={FIELDS}
            onAdd={() => achievementActions.add(blankAchievement)}
            onUpdate={achievementActions.update}
            onRemove={achievementActions.remove}
            emptyLabel="No achievements added yet."
            addLabel="Add Achievement"
        />
    );
}