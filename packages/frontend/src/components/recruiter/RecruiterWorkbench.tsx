import type {
  CandidateEvaluationBreakdown,
  CandidateRecommendation,
  CreateRecruiterJobInput,
  RecruiterBatchStatus,
  RecruiterCandidateFilters,
} from "@cvbuilder/shared";
import {
  ArrowUpDown,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  Files,
  Filter,
  Gauge,
  Link2,
  RefreshCcw,
  Search,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCreateRecruiterBatch,
  useCreateRecruiterJob,
  useReEvaluateCandidate,
  useRecruiterBatch,
  useRecruiterCandidate,
  useRecruiterCandidates,
  useRecruiterJob,
  useRecruiterJobs,
} from "@/hooks/useRecruiter";

const ACTIVE_BATCH_STATUSES = new Set<RecruiterBatchStatus>(["PENDING", "PROCESSING"]);

const DEFAULT_FILTERS: RecruiterCandidateFilters = {
  page: 1,
  limit: 20,
  sortBy: "overallScore",
  sortOrder: "desc",
  search: "",
};

const EMPTY_JOB_FORM: CreateRecruiterJobInput = {
  title: "",
  company: "",
  location: "",
  locale: "tr",
  description: "",
  mustHaveSkills: [],
  niceToHaveSkills: [],
  minimumYearsExperience: null,
};

const scoreLabelMap: Array<{ key: keyof CandidateEvaluationBreakdown; tone: string }> = [
  { key: "mustHaveScore", tone: "bg-emerald-500" },
  { key: "keywordScore", tone: "bg-blue-500" },
  { key: "experienceScore", tone: "bg-indigo-500" },
  { key: "readabilityScore", tone: "bg-amber-500" },
  { key: "linkQualityScore", tone: "bg-cyan-500" },
  { key: "riskPenalty", tone: "bg-rose-500" },
];

function parseSkillsInput(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function recommendationClass(recommendation?: CandidateRecommendation | null): string {
  switch (recommendation) {
    case "STRONG_MATCH":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "POTENTIAL_MATCH":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "WEAK_MATCH":
    default:
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  }
}

function batchStatusClass(status?: RecruiterBatchStatus | null): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "COMPLETED_WITH_ERRORS":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "FAILED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "PENDING":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  }
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale);
}

function Chip({ children, tone = "default" }: { children: string; tone?: "default" | "danger" | "success" | "warning" }) {
  const classes =
    tone === "danger"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : tone === "success"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : tone === "warning"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-muted text-muted-foreground";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>{children}</span>;
}

function SectionCard({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function RecruiterWorkbench() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jobForm, setJobForm] = useState<CreateRecruiterJobInput>(EMPTY_JOB_FORM);
  const [mustHaveText, setMustHaveText] = useState("");
  const [niceToHaveText, setNiceToHaveText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [filters, setFilters] = useState<RecruiterCandidateFilters>(DEFAULT_FILTERS);

  const jobsQuery = useRecruiterJobs();
  const createJobMutation = useCreateRecruiterJob();

  useEffect(() => {
    const firstJob = jobsQuery.data?.[0];
    if (!selectedJobId && firstJob) {
      setSelectedJobId(firstJob.id);
    }
  }, [jobsQuery.data, selectedJobId]);

  const selectedJobFromList = useMemo(
    () => jobsQuery.data?.find((job) => job.id === selectedJobId) ?? null,
    [jobsQuery.data, selectedJobId]
  );

  const isLive = ACTIVE_BATCH_STATUSES.has(selectedJobFromList?.latestBatchStatus ?? "COMPLETED");
  const jobDetailQuery = useRecruiterJob(selectedJobId, isLive);
  const latestBatchId = jobDetailQuery.data?.batches[0]?.id ?? "";
  const latestBatchQuery = useRecruiterBatch(latestBatchId, isLive);
  const candidatesQuery = useRecruiterCandidates(selectedJobId, filters, isLive);
  const candidateQuery = useRecruiterCandidate(selectedCandidateId);
  const uploadBatchMutation = useCreateRecruiterBatch(selectedJobId);
  const reEvaluateMutation = useReEvaluateCandidate(selectedCandidateId);

  useEffect(() => {
    const items = candidatesQuery.data?.items ?? [];
    if (!items.length) {
      setSelectedCandidateId("");
      return;
    }

    if (!selectedCandidateId || !items.some((item) => item.id === selectedCandidateId)) {
      setSelectedCandidateId(items[0]?.id ?? "");
    }
  }, [candidatesQuery.data?.items, selectedCandidateId]);

  useEffect(() => {
    setSelectedCandidateId("");
  }, [selectedJobId]);

  const summaryStats = useMemo(() => {
    const detail = jobDetailQuery.data;
    const latestBatch = latestBatchQuery.data;

    return [
      {
        label: t("recruiter.stats.totalCandidates"),
        value: detail?.candidateCount ?? 0,
        icon: Users,
      },
      {
        label: t("recruiter.stats.totalBatches"),
        value: detail?.batchCount ?? 0,
        icon: Files,
      },
      {
        label: t("recruiter.stats.latestBatch"),
        value: latestBatch?.status ?? detail?.latestBatchStatus ?? "—",
        icon: UploadCloud,
      },
      {
        label: t("recruiter.stats.minExperience"),
        value: detail?.minimumYearsExperience ?? "—",
        icon: Gauge,
      },
    ];
  }, [jobDetailQuery.data, latestBatchQuery.data, t]);

  async function handleCreateJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: CreateRecruiterJobInput = {
      ...jobForm,
      title: jobForm.title.trim(),
      description: jobForm.description.trim(),
      company: jobForm.company?.trim() || null,
      location: jobForm.location?.trim() || null,
      mustHaveSkills: parseSkillsInput(mustHaveText),
      niceToHaveSkills: parseSkillsInput(niceToHaveText),
      minimumYearsExperience:
        jobForm.minimumYearsExperience === null || jobForm.minimumYearsExperience === undefined || jobForm.minimumYearsExperience === ("" as never)
          ? null
          : Number(jobForm.minimumYearsExperience),
    };

    const created = await createJobMutation.mutateAsync(payload);
    setJobForm(EMPTY_JOB_FORM);
    setMustHaveText("");
    setNiceToHaveText("");
    setSelectedJobId(created.id);
  }

  async function handleUploadBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFiles.length) return;

    await uploadBatchMutation.mutateAsync(selectedFiles);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function updateFilters(patch: Partial<RecruiterCandidateFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  const candidate = candidateQuery.data;
  const candidateList = candidatesQuery.data?.items ?? [];
  const batchHistory = jobDetailQuery.data?.batches ?? [];
  const latestBatch = latestBatchQuery.data;

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles size={14} />
            {t("recruiter.kicker")}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("recruiter.title")}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t("recruiter.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone="success">{t("recruiter.features.bulkUpload")}</Chip>
          <Chip tone="warning">{t("recruiter.features.linkInspection")}</Chip>
          <Chip>{t("recruiter.features.dynamicScoring")}</Chip>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionCard
            title={t("recruiter.createJob.title")}
            subtitle={t("recruiter.createJob.subtitle")}
          >
            <form className="space-y-4" onSubmit={handleCreateJob}>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("recruiter.fields.title")}</label>
                <input
                  value={jobForm.title}
                  onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder={t("recruiter.placeholders.jobTitle")}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("recruiter.fields.company")}</label>
                  <input
                    value={jobForm.company ?? ""}
                    onChange={(event) => setJobForm((current) => ({ ...current, company: event.target.value }))}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    placeholder={t("recruiter.placeholders.company")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("recruiter.fields.location")}</label>
                  <input
                    value={jobForm.location ?? ""}
                    onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    placeholder={t("recruiter.placeholders.location")}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("recruiter.fields.locale")}</label>
                  <select
                    value={jobForm.locale ?? "tr"}
                    onChange={(event) => setJobForm((current) => ({ ...current, locale: event.target.value }))}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  >
                    <option value="tr">{t("languages.tr")}</option>
                    <option value="en">{t("languages.en")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("recruiter.fields.minimumYearsExperience")}</label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={jobForm.minimumYearsExperience ?? ""}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        minimumYearsExperience: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("recruiter.fields.description")}</label>
                <textarea
                  value={jobForm.description}
                  onChange={(event) => setJobForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-36 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder={t("recruiter.placeholders.description")}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("recruiter.fields.mustHaveSkills")}</label>
                <textarea
                  value={mustHaveText}
                  onChange={(event) => setMustHaveText(event.target.value)}
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder={t("recruiter.placeholders.skills")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("recruiter.fields.niceToHaveSkills")}</label>
                <textarea
                  value={niceToHaveText}
                  onChange={(event) => setNiceToHaveText(event.target.value)}
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder={t("recruiter.placeholders.skills")}
                />
              </div>

              <button
                type="submit"
                disabled={createJobMutation.isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BriefcaseBusiness className="mr-2" size={16} />
                {createJobMutation.isPending ? t("recruiter.actions.creatingJob") : t("recruiter.actions.createJob")}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title={t("recruiter.jobs.title")}
            subtitle={t("recruiter.jobs.subtitle")}
          >
            <div className="space-y-3">
              {(jobsQuery.data ?? []).map((job) => {
                const active = job.id === selectedJobId;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.company || t("recruiter.common.unassignedCompany")} · {job.location || t("recruiter.common.remote")}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${batchStatusClass(job.latestBatchStatus)}`}>
                        {job.latestBatchStatus ?? t("recruiter.common.noBatchYet")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>{t("recruiter.jobs.candidateCount", { count: job.candidateCount })}</div>
                      <div>{t("recruiter.jobs.batchCount", { count: job.batchCount })}</div>
                    </div>
                  </button>
                );
              })}

              {!jobsQuery.isLoading && !jobsQuery.data?.length ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  {t("recruiter.jobs.empty")}
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <Icon size={18} className="text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-semibold">{item.value}</p>
                </div>
              );
            })}
          </div>

          {selectedJobId ? (
            <>
              <SectionCard
                title={t("recruiter.upload.title")}
                subtitle={t("recruiter.upload.subtitle")}
              >
                <form className="space-y-4" onSubmit={handleUploadBatch}>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-background/60 px-6 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5">
                    <UploadCloud size={24} className="mb-3 text-primary" />
                    <span className="text-sm font-medium">{t("recruiter.upload.dropzoneTitle")}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{t("recruiter.upload.dropzoneHint")}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{t("recruiter.upload.selectedFiles", { count: selectedFiles.length })}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFiles.slice(0, 3).map((file) => file.name).join(" • ") || t("recruiter.upload.noFiles")}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={!selectedFiles.length || uploadBatchMutation.isPending}
                      className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UploadCloud size={16} className="mr-2" />
                      {uploadBatchMutation.isPending ? t("recruiter.actions.uploading") : t("recruiter.actions.uploadBatch")}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title={t("recruiter.filters.title")}
                subtitle={t("recruiter.filters.subtitle")}
                actions={
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {t("common.reset")}
                  </button>
                }
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="xl:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Search size={15} />
                      {t("recruiter.filters.search")}
                    </label>
                    <input
                      value={filters.search ?? ""}
                      onChange={(event) => updateFilters({ search: event.target.value })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      placeholder={t("recruiter.placeholders.searchCandidates")}
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Filter size={15} />
                      {t("recruiter.filters.recommendation")}
                    </label>
                    <select
                      value={filters.recommendation ?? ""}
                      onChange={(event) => updateFilters({ recommendation: (event.target.value || undefined) as CandidateRecommendation | undefined })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t("recruiter.filters.allRecommendations")}</option>
                      <option value="STRONG_MATCH">{t("recruiter.recommendations.STRONG_MATCH")}</option>
                      <option value="POTENTIAL_MATCH">{t("recruiter.recommendations.POTENTIAL_MATCH")}</option>
                      <option value="WEAK_MATCH">{t("recruiter.recommendations.WEAK_MATCH")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Gauge size={15} />
                      {t("recruiter.filters.minScore")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={filters.minScore ?? ""}
                      onChange={(event) => updateFilters({ minScore: event.target.value ? Number(event.target.value) : undefined })}
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      placeholder="70"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ArrowUpDown size={15} />
                      {t("recruiter.filters.sorting")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={filters.sortBy ?? "overallScore"}
                        onChange={(event) => updateFilters({ sortBy: event.target.value })}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      >
                        <option value="overallScore">{t("recruiter.sort.overallScore")}</option>
                        <option value="updatedAt">{t("recruiter.sort.updatedAt")}</option>
                        <option value="yearsOfExperience">{t("recruiter.sort.yearsOfExperience")}</option>
                        <option value="completenessScore">{t("recruiter.sort.completenessScore")}</option>
                      </select>
                      <select
                        value={filters.sortOrder ?? "desc"}
                        onChange={(event) => updateFilters({ sortOrder: event.target.value as "asc" | "desc" })}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                      >
                        <option value="desc">{t("recruiter.sort.desc")}</option>
                        <option value="asc">{t("recruiter.sort.asc")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-xl border bg-background/50 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.hasBrokenLinks)}
                    onChange={(event) => updateFilters({ hasBrokenLinks: event.target.checked || undefined })}
                    className="size-4 rounded border"
                  />
                  <span>{t("recruiter.filters.brokenLinksOnly")}</span>
                </label>
              </SectionCard>

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_420px]">
                <SectionCard
                  title={t("recruiter.candidates.title")}
                  subtitle={t("recruiter.candidates.subtitle", {
                    count: candidatesQuery.data?.meta.total ?? 0,
                    page: candidatesQuery.data?.meta.page ?? 1,
                  })}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.candidate")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.score")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.skills")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.links")}</th>
                          <th className="pb-3 font-medium">{t("recruiter.table.updatedAt")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {candidateList.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedCandidateId(item.id)}
                            className={`cursor-pointer align-top transition hover:bg-accent/40 ${
                              selectedCandidateId === item.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="py-3 pr-4">
                              <div>
                                <p className="font-medium">{item.fullName || t("recruiter.common.unknownCandidate")}</p>
                                <p className="text-muted-foreground">{item.headline || item.email || "—"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.yearsOfExperience != null
                                    ? t("recruiter.candidates.experienceYears", { count: item.yearsOfExperience })
                                    : t("recruiter.common.notAvailable")}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="space-y-2">
                                <div className="text-xl font-semibold">{item.evaluation?.overallScore ?? "—"}</div>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${recommendationClass(item.evaluation?.recommendation)}`}>
                                  {item.evaluation?.recommendation
                                    ? t(`recruiter.recommendations.${item.evaluation.recommendation}`)
                                    : t("recruiter.common.pending")}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-1.5">
                                {item.topSkills.slice(0, 4).map((skill) => (
                                  <Chip key={skill}>{skill}</Chip>
                                ))}
                                {item.topSkills.length > 4 ? <Chip>{t("recruiter.common.moreCount", { count: item.topSkills.length - 4 })}</Chip> : null}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div>{t("recruiter.candidates.accessibleLinks", { count: item.accessibleLinkCount })}</div>
                                <div>{t("recruiter.candidates.brokenLinks", { count: item.brokenLinkCount })}</div>
                              </div>
                            </td>
                            <td className="py-3">{formatDate(item.updatedAt, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!candidateList.length && !candidatesQuery.isLoading ? (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      <FileSearch className="mx-auto mb-3" size={24} />
                      {t("recruiter.candidates.empty")}
                    </div>
                  ) : null}

                  {candidatesQuery.data?.meta ? (
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {t("recruiter.pagination.summary", {
                          page: candidatesQuery.data.meta.page,
                          totalPages: candidatesQuery.data.meta.totalPages,
                          total: candidatesQuery.data.meta.total,
                        })}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={(candidatesQuery.data.meta.page ?? 1) <= 1}
                          onClick={() => updateFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}
                          className="rounded-xl border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("recruiter.pagination.previous")}
                        </button>
                        <button
                          type="button"
                          disabled={!candidatesQuery.data.meta.hasMore}
                          onClick={() => updateFilters({ page: (filters.page ?? 1) + 1 })}
                          className="rounded-xl border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("recruiter.pagination.next")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </SectionCard>

                <div className="space-y-6">
                  <SectionCard
                    title={t("recruiter.candidateDetail.title")}
                    subtitle={candidate ? candidate.document.originalFileName : t("recruiter.candidateDetail.emptySubtitle")}
                    actions={
                      candidate ? (
                        <button
                          type="button"
                          onClick={() => reEvaluateMutation.mutate({ force: true })}
                          disabled={reEvaluateMutation.isPending}
                          className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCcw size={14} className="mr-2" />
                          {reEvaluateMutation.isPending ? t("recruiter.actions.reevaluating") : t("recruiter.actions.reEvaluate")}
                        </button>
                      ) : null
                    }
                  >
                    {candidate ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-background/70 p-4">
                          <div>
                            <h3 className="text-xl font-semibold">{candidate.fullName || t("recruiter.common.unknownCandidate")}</h3>
                            <p className="text-sm text-muted-foreground">{candidate.headline || candidate.email || t("recruiter.common.notAvailable")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {candidate.location || t("recruiter.common.remote")} • {candidate.phone || t("recruiter.common.notAvailable")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold">{candidate.evaluation?.overallScore ?? "—"}</div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${recommendationClass(candidate.evaluation?.recommendation)}`}>
                              {candidate.evaluation?.recommendation
                                ? t(`recruiter.recommendations.${candidate.evaluation.recommendation}`)
                                : t("recruiter.common.pending")}
                            </span>
                          </div>
                        </div>

                        {candidate.evaluation ? (
                          <>
                            <div className="grid gap-3">
                              {scoreLabelMap.map((item) => {
                                const score = candidate.evaluation?.[item.key] ?? 0;
                                return (
                                  <div key={item.key}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                      <span>{t(`recruiter.breakdown.${item.key}`)}</span>
                                      <span className="font-medium">{score}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                      <div
                                        className={`h-2 rounded-full ${item.tone}`}
                                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="space-y-2 rounded-2xl border bg-background/60 p-4">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <CheckCircle2 size={16} className="text-emerald-500" />
                                {t("recruiter.candidateDetail.summary")}
                              </div>
                              <p className="text-sm text-muted-foreground">{candidate.evaluation.shortSummary}</p>
                              {candidate.evaluation.explanation ? (
                                <p className="text-sm text-muted-foreground">{candidate.evaluation.explanation}</p>
                              ) : null}
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="rounded-2xl border p-4">
                                <p className="mb-3 text-sm font-medium">{t("recruiter.candidateDetail.strengths")}</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.evaluation.strengths.map((item) => (
                                    <Chip key={item} tone="success">{item}</Chip>
                                  ))}
                                  {!candidate.evaluation.strengths.length ? <p className="text-sm text-muted-foreground">—</p> : null}
                                </div>
                              </div>
                              <div className="rounded-2xl border p-4">
                                <p className="mb-3 text-sm font-medium">{t("recruiter.candidateDetail.missingSkills")}</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.evaluation.missingHardSkills.map((item) => (
                                    <Chip key={item} tone="warning">{item}</Chip>
                                  ))}
                                  {!candidate.evaluation.missingHardSkills.length ? <p className="text-sm text-muted-foreground">—</p> : null}
                                </div>
                              </div>
                              <div className="rounded-2xl border p-4">
                                <p className="mb-3 text-sm font-medium">{t("recruiter.candidateDetail.riskFlags")}</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.evaluation.riskFlags.map((item) => (
                                    <Chip key={item} tone="danger">{item}</Chip>
                                  ))}
                                  {!candidate.evaluation.riskFlags.length ? <p className="text-sm text-muted-foreground">—</p> : null}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : null}

                        <div className="rounded-2xl border p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <Link2 size={16} />
                            {t("recruiter.candidateDetail.links")}
                          </div>
                          <div className="space-y-3">
                            {candidate.links.map((link) => (
                              <div key={link.id} className="rounded-xl bg-background/70 p-3 text-sm">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                  <a href={link.finalUrl || link.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                                    {link.title || link.host}
                                  </a>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${link.accessible === false ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}>
                                    {link.accessible === false ? t("recruiter.links.broken") : t("recruiter.links.ok")}
                                  </span>
                                </div>
                                <p className="text-muted-foreground">{link.description || link.url}</p>
                              </div>
                            ))}
                            {!candidate.links.length ? <p className="text-sm text-muted-foreground">{t("recruiter.links.empty")}</p> : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <p className="mb-3 text-sm font-medium">{t("recruiter.candidateDetail.document")}</p>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>{candidate.document.originalFileName}</p>
                            <p>{t("recruiter.candidateDetail.documentStatus", { status: candidate.document.extractionStatus })}</p>
                            <p>{t("recruiter.candidateDetail.completeness", { score: candidate.completenessScore })}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <p className="mb-3 text-sm font-medium">{t("recruiter.candidateDetail.rawPreview")}</p>
                          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {candidate.rawTextSnippet}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {t("recruiter.candidateDetail.empty")}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard
                    title={t("recruiter.batchHistory.title")}
                    subtitle={t("recruiter.batchHistory.subtitle")}
                  >
                    <div className="space-y-3">
                      {batchHistory.slice(0, 5).map((batch) => (
                        <div key={batch.id} className="rounded-2xl border bg-background/60 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="font-medium">{formatDate(batch.createdAt, locale)}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${batchStatusClass(batch.status)}`}>
                              {batch.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <span>{t("recruiter.batchHistory.totalFiles", { count: batch.totalFiles })}</span>
                            <span>{t("recruiter.batchHistory.processedFiles", { count: batch.processedFiles })}</span>
                            <span>{t("recruiter.batchHistory.failedFiles", { count: batch.failedFiles })}</span>
                          </div>
                        </div>
                      ))}
                      {!batchHistory.length ? <p className="text-sm text-muted-foreground">{t("recruiter.batchHistory.empty")}</p> : null}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title={t("recruiter.latestBatch.title")}
                    subtitle={t("recruiter.latestBatch.subtitle")}
                  >
                    {latestBatch ? (
                      <div className="space-y-3">
                        {latestBatch.documents.slice(0, 8).map((document) => (
                          <div key={document.id} className="rounded-2xl border bg-background/60 p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="font-medium">{document.originalFileName}</p>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${batchStatusClass(document.extractionStatus === "FAILED" ? "FAILED" : document.extractionStatus === "PROCESSING" ? "PROCESSING" : document.extractionStatus === "EXTRACTED" ? "COMPLETED" : "PENDING")}`}>
                                {document.extractionStatus}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {document.parseError || formatDate(document.processedAt, locale)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("recruiter.latestBatch.empty")}</p>
                    )}
                  </SectionCard>
                </div>
              </div>
            </>
          ) : (
            <SectionCard
              title={t("recruiter.emptyState.title")}
              subtitle={t("recruiter.emptyState.subtitle")}
            >
              <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                <TriangleAlert className="mx-auto mb-3" size={28} />
                {t("recruiter.emptyState.description")}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
