import TextAreaField from "../fields/TextAreaField";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

export default function SummaryForm() {
    const { summary, setSummary } = useResumeBuilder();

    return (
        <TextAreaField
            label="Professional Summary"
            value={summary}
            onChange={setSummary}
            placeholder="A brief overview of your experience and career goals…"
            rows={6}
        />
    );
}