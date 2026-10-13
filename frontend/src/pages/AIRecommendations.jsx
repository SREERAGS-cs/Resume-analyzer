import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertCircle,
    Briefcase,
    Building2,
    CalendarDays,
    Check,
    ChevronDown,
    ExternalLink,
    Globe,
    LocateFixed,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    Sparkles,
    X,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getResumes } from "../services/resumeService";
import { searchJobs } from "../services/jobSearchService";
import {
    INDIAN_STATES,
    INTERNATIONAL_COUNTRIES,
    POPULAR_INDIAN_TECH_CITIES,
    getCitiesForState,
    normalizeCityQuery,
} from "../data/locationData";

const OPPORTUNITY_TYPES = ["Full-time", "Internship", "Part-time", "Contract", "Apprenticeship"];

const LOCATION_MODES = [
    { value: "anywhere_india", label: "Anywhere in India" },
    { value: "state_city", label: "State / UT & City" },
    { value: "specific_city", label: "Specific City" },
    { value: "multiple_cities", label: "Multiple Cities" },
    { value: "remote_only", label: "Remote across India" },
    { value: "near_me", label: "Near Me" },
    { value: "international", label: "International" },
];

const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const EXPERIENCE_LEVELS = ["Student / Fresher", "0–1 years", "1–2 years", "2–3 years", "Any"];
const RELEVANCE_ORDER = { "Strong Match": 3, "Partial Match": 2, "Significant Gaps": 1 };

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function OpportunityCard({ job, resumeId, onAnalyze }) {
    return (
        <article className="rounded-xl border border-line bg-white p-5 shadow-sm transition hover:border-ink/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{job.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink/75">
                        <Building2 size={16} className="text-signal" aria-hidden="true" />
                        {job.company || "Employer not disclosed"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs text-ink/65 font-medium">
                        via {job.source || "Adzuna"}
                    </span>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        job.relevance_label === "Strong Match"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : job.relevance_label === "Partial Match"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}>
                        {job.relevance_label}
                    </span>
                </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/65">
                <span className="inline-flex items-center gap-1.5 font-medium">
                    <MapPin size={14} className="text-ink/40" aria-hidden="true" />
                    {job.location || "Location not provided"}
                </span>
                <span className="rounded bg-paper px-2 py-0.5 font-medium">
                    {job.work_mode || "Work mode unstated"}
                </span>
                <span className="rounded bg-paper px-2 py-0.5 font-medium">
                    {job.employment_type || "Full-time"}
                </span>
                {formatDate(job.posted_at) && (
                    <span className="inline-flex items-center gap-1.5 text-ink/50">
                        <CalendarDays size={14} aria-hidden="true" /> Posted {formatDate(job.posted_at)}
                    </span>
                )}
            </div>

            {/* Fit Reason Box */}
            {job.fit_reason && (
                <div className="mt-4 rounded-lg border border-signal/20 bg-signal/5 p-3 text-xs text-ink/80">
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                        <Sparkles size={14} className="text-signal" /> Match Reason
                    </p>
                    <p className="mt-1 text-ink/70 leading-relaxed">{job.fit_reason}</p>
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-line px-2.5 py-1 text-ink/65">
                    Experience: <strong className="font-medium text-ink">{job.experience_compatibility}</strong>
                </span>
                <span className="rounded-full border border-line px-2.5 py-1 text-ink/65">
                    Location: <strong className="font-medium text-ink">{job.location_compatibility}</strong>
                </span>
                <span className="rounded-full border border-line px-2.5 py-1 text-ink/65">
                    Work mode: <strong className="font-medium text-ink">{job.work_mode_compatibility}</strong>
                </span>
            </div>

            <p className="mt-4 line-clamp-3 whitespace-pre-line text-sm leading-6 text-ink/75">
                {job.description || "No description provided by the job provider."}
            </p>

            {job.matched_skills.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Matched verified skills</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.matched_skills.map((skill) => (
                            <span key={skill} className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {job.missing_skills.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Skills not visible on resume</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.missing_skills.map((skill) => (
                            <span key={skill} className="rounded-full bg-paper border border-line px-2.5 py-0.5 text-xs text-ink/65">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => onAnalyze(job)}
                        disabled={!job.description || !resumeId}
                        className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Compare your resume against this job description in Job Matching"
                    >
                        <Sparkles size={15} /> Analyze in Job Matching
                    </button>
                    {job.application_url ? (
                        <a
                            href={job.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-paper"
                        >
                            Apply on Adzuna <ExternalLink size={15} />
                        </a>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm text-ink/40">
                            Apply link not provided
                        </span>
                    )}
                </div>
                <span className="text-xs text-ink/45">
                    Original listing verified
                </span>
            </div>
        </article>
    );
}

export default function AIRecommendations() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [resumeId, setResumeId] = useState("");
    const [loadingResumes, setLoadingResumes] = useState(true);

    // Search filters
    const [role, setRole] = useState("");
    const [company, setCompany] = useState("");
    const [opportunityType, setOpportunityType] = useState("Full-time");
    const [locationMode, setLocationMode] = useState("anywhere_india");

    // Location specific fields
    const [selectedState, setSelectedState] = useState("");
    const [stateCity, setStateCity] = useState("");
    const [specificCity, setSpecificCity] = useState("");
    const [selectedCities, setSelectedCities] = useState([]);
    const [cityInput, setCityInput] = useState("");
    const [nearMeCity, setNearMeCity] = useState("");
    const [geolocating, setGeolocating] = useState(false);
    const [internationalCountry, setInternationalCountry] = useState("us");
    const [internationalCity, setInternationalCity] = useState("");

    // Work modes & experience
    const [workModes, setWorkModes] = useState(["On-site", "Hybrid", "Remote"]);
    const [experienceLevel, setExperienceLevel] = useState("Student / Fresher");
    const [sortBy, setSortBy] = useState("relevance");

    // Search state
    const [jobs, setJobs] = useState([]);
    const [page, setPage] = useState(1);
    const [hasSearched, setHasSearched] = useState(false);
    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [lastQueryPayload, setLastQueryPayload] = useState(null);

    const verifiedResumes = useMemo(
        () => resumes.filter((resume) => resume.parsing_status === "verified"),
        [resumes],
    );

    const availableCitiesForState = useMemo(
        () => getCitiesForState(selectedState),
        [selectedState],
    );

    const sortedJobs = useMemo(() => {
        const sorted = [...jobs];
        if (sortBy === "recent") {
            sorted.sort((a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0));
        } else {
            sorted.sort((a, b) => (RELEVANCE_ORDER[b.relevance_label] || 0) - (RELEVANCE_ORDER[a.relevance_label] || 0));
        }
        return sorted;
    }, [jobs, sortBy]);

    useEffect(() => {
        let active = true;
        getResumes()
            .then((data) => {
                if (!active) return;
                const ownResumes = data || [];
                setResumes(ownResumes);
                const verified = ownResumes.find((resume) => resume.parsing_status === "verified");
                if (verified) setResumeId(String(verified.id));
            })
            .catch(() => {
                if (active) setErrorMessage("Unable to load your resumes. Please refresh and try again.");
            })
            .finally(() => {
                if (active) setLoadingResumes(false);
            });
        return () => { active = false; };
    }, []);

    const changeLocationMode = (mode) => {
        setLocationMode(mode);
        setErrorMessage("");
        if (mode === "remote_only") {
            setWorkModes(["Remote"]);
        } else if (workModes.length === 1 && workModes[0] === "Remote") {
            setWorkModes(["On-site", "Hybrid", "Remote"]);
        }
    };

    const addCityToMultiple = (cityToAdd) => {
        const clean = normalizeCityQuery(cityToAdd.trim());
        if (clean && !selectedCities.some((c) => c.toLowerCase() === clean.toLowerCase())) {
            if (selectedCities.length >= 10) {
                setErrorMessage("You can select up to 10 cities at once.");
                return;
            }
            setSelectedCities((prev) => [...prev, clean]);
        }
        setCityInput("");
    };

    const removeCityFromMultiple = (cityToRemove) => {
        setSelectedCities((prev) => prev.filter((c) => c !== cityToRemove));
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setErrorMessage("Geolocation is not supported by your browser. Please enter your city name.");
            return;
        }
        setGeolocating(true);
        setErrorMessage("");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
                    const data = await res.json();
                    const detected = data.address?.city || data.address?.town || data.address?.state_district || data.address?.county || "";
                    if (detected) {
                        setNearMeCity(detected);
                    } else {
                        setErrorMessage("Could not detect city automatically. Please enter your city name.");
                    }
                } catch {
                    setErrorMessage("Could not detect city automatically. Please enter your city name.");
                } finally {
                    setGeolocating(false);
                }
            },
            (error) => {
                setGeolocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    setErrorMessage("Location permission not granted. Please enter your city name below.");
                } else {
                    setErrorMessage("Unable to obtain location. Please enter your city name below.");
                }
            },
            { timeout: 7000 }
        );
    };

    const buildPayload = (searchPage = 1) => {
        let selectedLocations = [];
        let stateParam = null;
        let countryParam = "in";

        if (locationMode === "state_city") {
            if (!selectedState) {
                throw new Error("Please select a State or Union Territory.");
            }
            stateParam = selectedState;
            if (stateCity) {
                selectedLocations = [normalizeCityQuery(stateCity)];
            }
        } else if (locationMode === "specific_city") {
            if (!specificCity.trim()) {
                throw new Error("Please enter or select a city.");
            }
            selectedLocations = [normalizeCityQuery(specificCity.trim())];
        } else if (locationMode === "multiple_cities") {
            const currentList = [...selectedCities];
            if (cityInput.trim()) {
                const draft = normalizeCityQuery(cityInput.trim());
                if (!currentList.some((c) => c.toLowerCase() === draft.toLowerCase())) {
                    currentList.push(draft);
                }
            }
            if (currentList.length === 0) {
                throw new Error("Please add at least one city.");
            }
            selectedLocations = currentList;
        } else if (locationMode === "near_me") {
            if (!nearMeCity.trim()) {
                throw new Error("Enter your city or click 'Detect Location'. City-level only; no street address required.");
            }
            selectedLocations = [normalizeCityQuery(nearMeCity.trim())];
        } else if (locationMode === "international") {
            countryParam = internationalCountry;
            if (internationalCity.trim()) {
                selectedLocations = [internationalCity.trim()];
            }
        }

        return {
            resume_id: Number(resumeId),
            role: role.trim(),
            company: company.trim() || null,
            opportunity_type: opportunityType,
            location_mode: locationMode,
            locations: selectedLocations,
            state: stateParam,
            country: countryParam,
            work_modes: locationMode === "remote_only" ? ["Remote"] : workModes,
            experience_level: experienceLevel,
            page: searchPage,
        };
    };

    const handleSearch = async (event) => {
        if (event) event.preventDefault();
        setErrorMessage("");

        if (!role.trim()) {
            setErrorMessage("Enter a target role to discover jobs.");
            return;
        }
        if (!resumeId) {
            setErrorMessage("Verify a resume to get personalized job recommendations.");
            return;
        }

        let payload;
        try {
            payload = buildPayload(1);
        } catch (err) {
            setErrorMessage(err.message);
            return;
        }

        setSearching(true);
        setHasSearched(true);
        setJobs([]);
        setPage(1);
        setLastQueryPayload(payload);

        try {
            const response = await searchJobs(payload);
            setJobs(response.jobs || []);
        } catch (error) {
            setJobs([]);
            handleApiError(error);
        } finally {
            setSearching(false);
        }
    };

    const handleLoadMore = async () => {
        if (!lastQueryPayload || loadingMore) return;
        const nextPage = page + 1;
        setLoadingMore(true);
        try {
            const payload = { ...lastQueryPayload, page: nextPage };
            const response = await searchJobs(payload);
            const newJobs = response.jobs || [];
            if (newJobs.length > 0) {
                setJobs((prev) => [...prev, ...newJobs]);
                setPage(nextPage);
            } else {
                setErrorMessage("No additional openings found from the provider.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleApiError = (error) => {
        if (error.response?.status === 503) {
            setErrorMessage("Live job discovery is not configured on the backend. Please ensure ADZUNA_APP_ID and ADZUNA_APP_KEY are set in backend/.env.");
        } else if (error.response?.status === 429) {
            setErrorMessage("Job provider request quota exceeded. Please wait a moment and try again.");
        } else if (error.response?.status === 502) {
            setErrorMessage("We could not reach the live job provider right now. Please check your network and try again.");
        } else {
            setErrorMessage(error.response?.data?.detail || "Could not retrieve current job openings. Please try again.");
        }
    };

    const analyzeJob = (job) => {
        navigate("/job-matching", {
            state: {
                recommendationJob: {
                    resumeId: Number(resumeId),
                    title: job.title,
                    company: job.company,
                    description: job.description.slice(0, 20000),
                    location: job.location,
                    employmentType: job.employment_type,
                    sourceUrl: job.application_url || job.source_url,
                },
            },
        });
    };

    return (
        <DashboardLayout title="Live Job Discovery">
            <div className="mb-6 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink">
                            <Sparkles className="text-signal" size={24} /> Live Job Discovery
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-ink/65">
                            Search verified live openings in real time across employers and locations, personalized to your verified resume.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink/65 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Provider Active
                    </span>
                </div>
            </div>

            {!loadingResumes && verifiedResumes.length === 0 && (
                <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-amber-900 font-medium">Verify a resume to get personalized match scoring and skill alignment.</p>
                    <button
                        type="button"
                        onClick={() => navigate("/resumes")}
                        className="w-fit rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-amber-100"
                    >
                        Go to My Resumes
                    </button>
                </div>
            )}

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-7 rounded-xl border border-line bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {/* Target Role */}
                    <label className="text-sm font-medium text-ink">
                        Target Role <span className="text-danger">*</span>
                        <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Software Developer, Frontend Engineer"
                            maxLength={120}
                            required
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                        />
                    </label>

                    {/* Company (Optional) */}
                    <label className="text-sm font-medium text-ink">
                        Company Name <span className="text-xs font-normal text-ink/50">(Optional)</span>
                        <input
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g. Zoho, TCS, Infosys, Microsoft, Amazon"
                            maxLength={120}
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                        />
                        <span className="mt-1 block text-xs font-normal text-ink/50">
                            Search genuine openings at a specific employer.
                        </span>
                    </label>

                    {/* Opportunity Type */}
                    <label className="text-sm font-medium text-ink">
                        Opportunity Type
                        <select
                            value={opportunityType}
                            onChange={(e) => setOpportunityType(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                        >
                            {OPPORTUNITY_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </label>

                    {/* Verified Resume */}
                    <label className="text-sm font-medium text-ink">
                        Verified Resume
                        <select
                            value={resumeId}
                            onChange={(e) => setResumeId(e.target.value)}
                            disabled={!verifiedResumes.length}
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal disabled:opacity-60"
                        >
                            {!verifiedResumes.length && <option value="">No verified resumes</option>}
                            {verifiedResumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.display_name || resume.original_filename}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Location Scope */}
                    <label className="text-sm font-medium text-ink">
                        Location Scope
                        <select
                            value={locationMode}
                            onChange={(e) => changeLocationMode(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                        >
                            {LOCATION_MODES.map((mode) => (
                                <option key={mode.value} value={mode.value}>{mode.label}</option>
                            ))}
                        </select>
                    </label>

                    {/* State / UT & City cascading */}
                    {locationMode === "state_city" && (
                        <div className="grid gap-2 sm:grid-cols-2 xl:col-span-1">
                            <label className="text-sm font-medium text-ink">
                                State / Union Territory
                                <select
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value);
                                        setStateCity("");
                                    }}
                                    className="mt-1.5 w-full rounded-md border border-line bg-paper px-2.5 py-2.5 outline-none focus:border-signal text-sm"
                                >
                                    <option value="">Select State / UT</option>
                                    {INDIAN_STATES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-medium text-ink">
                                City / District <span className="font-normal text-xs text-ink/50">(Optional)</span>
                                <select
                                    value={stateCity}
                                    onChange={(e) => setStateCity(e.target.value)}
                                    disabled={!selectedState}
                                    className="mt-1.5 w-full rounded-md border border-line bg-paper px-2.5 py-2.5 outline-none focus:border-signal text-sm disabled:opacity-50"
                                >
                                    <option value="">All in {selectedState || "State"}</option>
                                    {availableCitiesForState.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}

                    {/* Specific City */}
                    {locationMode === "specific_city" && (
                        <div className="text-sm font-medium text-ink">
                            <label>
                                City
                                <input
                                    value={specificCity}
                                    onChange={(e) => setSpecificCity(e.target.value)}
                                    placeholder="e.g. Bengaluru, Pune, Hyderabad"
                                    maxLength={100}
                                    className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                                />
                            </label>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai"].map((quick) => (
                                    <button
                                        key={quick}
                                        type="button"
                                        onClick={() => setSpecificCity(quick)}
                                        className="rounded bg-paper px-2 py-0.5 text-[11px] text-ink/70 hover:bg-signal/10 hover:text-ink"
                                    >
                                        {quick}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Multiple Cities */}
                    {locationMode === "multiple_cities" && (
                        <fieldset className="text-sm font-medium text-ink xl:col-span-2">
                            <legend>Select Cities <span className="font-normal text-xs text-ink/50">(up to 10 cities)</span></legend>
                            <div className="mt-1.5 flex gap-2">
                                <input
                                    value={cityInput}
                                    onChange={(e) => setCityInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addCityToMultiple(cityInput);
                                        }
                                    }}
                                    placeholder="Type a city and press Add"
                                    maxLength={100}
                                    className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                                />
                                <button
                                    type="button"
                                    onClick={() => addCityToMultiple(cityInput)}
                                    className="rounded-md border border-line px-4 text-sm font-medium hover:bg-paper"
                                >
                                    Add
                                </button>
                            </div>
                            {/* Quick add popular cities */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-ink/50">Suggestions:</span>
                                {POPULAR_INDIAN_TECH_CITIES.slice(0, 6).map((city) => {
                                    const clean = normalizeCityQuery(city);
                                    const selected = selectedCities.includes(clean);
                                    return (
                                        <button
                                            key={city}
                                            type="button"
                                            disabled={selected}
                                            onClick={() => addCityToMultiple(clean)}
                                            className={`rounded px-2 py-0.5 text-[11px] transition ${
                                                selected
                                                    ? "bg-emerald-50 text-emerald-700 opacity-60"
                                                    : "bg-paper text-ink/70 hover:bg-signal/10 hover:text-ink"
                                            }`}
                                        >
                                            + {clean}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedCities.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    {selectedCities.map((city) => (
                                        <span
                                            key={city}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-signal/10 px-3 py-1 text-xs font-medium text-ink"
                                        >
                                            {city}
                                            <button
                                                type="button"
                                                onClick={() => removeCityFromMultiple(city)}
                                                className="text-ink/50 hover:text-ink"
                                                aria-label={`Remove ${city}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    )}

                    {/* Near Me */}
                    {locationMode === "near_me" && (
                        <div className="text-sm font-medium text-ink">
                            <label>Your City</label>
                            <div className="mt-1.5 flex gap-2">
                                <input
                                    value={nearMeCity}
                                    onChange={(e) => setNearMeCity(e.target.value)}
                                    placeholder="Enter your home city"
                                    maxLength={100}
                                    className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                                />
                                <button
                                    type="button"
                                    onClick={detectLocation}
                                    disabled={geolocating}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-paper disabled:opacity-60"
                                    title="Auto-detect city from browser without requesting street address"
                                >
                                    <LocateFixed size={14} className={geolocating ? "animate-spin text-signal" : "text-signal"} />
                                    {geolocating ? "Detecting..." : "Detect"}
                                </button>
                            </div>
                            <span className="mt-1 block text-xs font-normal text-ink/50">
                                City-level location only; no street address is needed or requested.
                            </span>
                        </div>
                    )}

                    {/* International */}
                    {locationMode === "international" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-sm font-medium text-ink">
                                Country
                                <select
                                    value={internationalCountry}
                                    onChange={(e) => setInternationalCountry(e.target.value)}
                                    className="mt-1.5 w-full rounded-md border border-line bg-paper px-2.5 py-2.5 outline-none focus:border-signal text-sm"
                                >
                                    {INTERNATIONAL_COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-medium text-ink">
                                City <span className="font-normal text-xs text-ink/50">(Optional)</span>
                                <input
                                    value={internationalCity}
                                    onChange={(e) => setInternationalCity(e.target.value)}
                                    placeholder="e.g. London, New York"
                                    maxLength={100}
                                    className="mt-1.5 w-full rounded-md border border-line bg-paper px-2.5 py-2.5 outline-none focus:border-signal text-sm"
                                />
                            </label>
                        </div>
                    )}

                    {/* Experience Level */}
                    <label className="text-sm font-medium text-ink">
                        Experience Level
                        <select
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none focus:border-signal"
                        >
                            {EXPERIENCE_LEVELS.map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </label>

                    {/* Work Mode */}
                    <fieldset className="text-sm font-medium text-ink">
                        <legend>Work Mode</legend>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                            {WORK_MODES.map((mode) => (
                                <label key={mode} className="inline-flex items-center gap-2 text-sm font-normal text-ink/75 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={locationMode === "remote_only" ? mode === "Remote" : workModes.includes(mode)}
                                        disabled={locationMode === "remote_only"}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setWorkModes((prev) => [...prev, mode]);
                                            } else {
                                                setWorkModes((prev) => prev.filter((m) => m !== mode));
                                            }
                                        }}
                                        className="accent-signal"
                                    />
                                    {mode}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <p className="text-xs text-ink/50">
                        Real-time listings are queried directly from verified job providers.
                    </p>
                    <button
                        type="submit"
                        disabled={searching || loadingResumes || verifiedResumes.length === 0}
                        className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Search size={16} />
                        {searching ? "Discovering Opportunities..." : "Discover Jobs"}
                    </button>
                </div>
            </form>

            {/* Error Message */}
            {errorMessage && (
                <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={17} className="shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleSearch()}
                        className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-semibold text-danger border border-danger/30 hover:bg-danger/10"
                    >
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {/* Loading Indicator */}
            {searching && (
                <div role="status" className="rounded-xl border border-line bg-white p-12 text-center shadow-sm">
                    <Briefcase className="mx-auto mb-3 animate-pulse text-signal" size={28} />
                    <p className="font-medium text-ink">Searching genuine vacancies across live providers...</p>
                    <p className="mt-1 text-xs text-ink/50">Applying role criteria, location normalization, and resume skill matching.</p>
                </div>
            )}

            {/* Empty State after Search */}
            {!searching && hasSearched && !errorMessage && sortedJobs.length === 0 && (
                <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
                    <Building2 className="mx-auto mb-3 text-ink/30" size={32} />
                    <p className="font-display text-base font-semibold text-ink">
                        {company
                            ? `No matching verified openings found for "${company}"`
                            : "No matching verified opportunities found"}
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                        {company
                            ? `We only display legitimate openings verified by authorized job providers and do not fabricate listings. Try clearing the company name, or widening your location scope.`
                            : `Try adjusting your target role (e.g. "Software Engineer"), switching location to "Anywhere in India", or selecting additional work modes.`}
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                        {company && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCompany("");
                                    setTimeout(() => handleSearch(), 50);
                                }}
                                className="rounded-md border border-line px-3.5 py-2 text-xs font-medium text-ink hover:bg-paper"
                            >
                                Clear Company Filter
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setLocationMode("anywhere_india");
                                setTimeout(() => handleSearch(), 50);
                            }}
                            className="rounded-md bg-ink px-3.5 py-2 text-xs font-medium text-paper hover:bg-ink/90"
                        >
                            Search Anywhere in India
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State before Search */}
            {!searching && !hasSearched && (
                <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
                    <Search className="mx-auto mb-3 text-ink/30" size={32} />
                    <p className="font-display text-base font-semibold text-ink">Live Job Discovery Ready</p>
                    <p className="mx-auto mt-1 max-w-lg text-sm text-ink/60">
                        Enter a target role and choose your location preferences above to discover current openings across India, specific employers, or international hubs.
                    </p>
                </div>
            )}

            {/* Job Results List */}
            {!searching && sortedJobs.length > 0 && (
                <section>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-display text-lg font-semibold text-ink">
                                Verified Live Openings
                            </h2>
                            <p className="text-sm text-ink/60">
                                Showing {sortedJobs.length} listing{sortedJobs.length === 1 ? "" : "s"}
                                {company ? ` at ${company}` : ""} from verified provider
                            </p>
                        </div>
                        <label className="text-sm text-ink/70 flex items-center gap-2">
                            Sort by:
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-signal"
                            >
                                <option value="relevance">Relevance & Match</option>
                                <option value="recent">Most Recent</option>
                            </select>
                        </label>
                    </div>

                    <div className="space-y-4">
                        {sortedJobs.map((job) => (
                            <OpportunityCard
                                key={job.id}
                                job={job}
                                resumeId={resumeId}
                                onAnalyze={analyzeJob}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    <div className="mt-8 flex justify-center">
                        <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-6 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:bg-paper disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <>
                                    <RefreshCw size={15} className="animate-spin text-signal" />
                                    Loading more listings...
                                </>
                            ) : (
                                <>
                                    <Plus size={15} />
                                    Load More Openings
                                </>
                            )}
                        </button>
                    </div>
                </section>
            )}
        </DashboardLayout>
    );
}
