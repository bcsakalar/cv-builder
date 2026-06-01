import type {
  CandidateRecommendation,
  CreateRecruiterJobInput,
  RecruiterBatchStatus,
  RecruiterCandidateFilters,
} from "@cvbuilder/shared";
import {
  ArrowUpDown,
  BriefcaseBusiness,
  FileSearch,
  Files,
  Filter,
  Gauge,
  Search,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  useUpdateCandidateMetadata,
  useCompareCandidates,
} from "@/hooks/useRecruiter";
import { recruiterApi } from "@/services/recruiter.api";
import {
  Chip,
  ScoreRing,
  SectionCard,
  batchStatusClass,
  formatDate,
  parseSkillsInput,
  recommendationClass,
} from "./recruiter-ui";
import { CandidateFunnel } from "./CandidateFunnel";
import { CandidateDetailDrawer } from "./CandidateDetailDrawer";

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

export function RecruiterWorkbench() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("tr") ? "tr-TR" : "en-US";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jobForm, setJobForm] = useState<CreateRecruiterJobInput>(EMPTY_JOB_FORM);
  const [mustHaveText, setMustHaveText] = useState("");
  const [niceToHaveText, setNiceToHaveText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedJobIdOverride, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidateIdOverride, setSelectedCandidateId] = useState("");
  const [filters, setFilters] = useState<RecruiterCandidateFilters>(DEFAULT_FILTERS);

  const jobsQuery = useRecruiterJobs();
  const createJobMutation = useCreateRecruiterJob();

  const selectedJobId = selectedJobIdOverride ?? jobsQuery.data?.[0]?.id ?? "";

  const selectedJobFromList = useMemo(
    () => jobsQuery.data?.find((job) => job.id === selectedJobId) ?? null,
    [jobsQuery.data, selectedJobId]
  );

  const isLive = ACTIVE_BATCH_STATUSES.has(selectedJobFromList?.latestBatchStatus ?? "COMPLETED");
  const jobDetailQuery = useRecruiterJob(selectedJobId, isLive);
  const latestBatchId = jobDetailQuery.data?.batches[0]?.id ?? "";
  const latestBatchQuery = useRecruiterBatch(latestBatchId, isLive);
  const candidatesQuery = useRecruiterCandidates(selectedJobId, filters, isLive);
  const uploadBatchMutation = useCreateRecruiterBatch(selectedJobId);
  const candidateList = candidatesQuery.data?.items ?? [];
  const selectedCandidateId = candidateList.some((item) => item.id === selectedCandidateIdOverride)
    ? selectedCandidateIdOverride
    : candidateList[0]?.id ?? "";
  const candidateQuery = useRecruiterCandidate(selectedCandidateId);
  const reEvaluateMutation = useReEvaluateCandidate(selectedCandidateId);
  const updateMetadataMutation = useUpdateCandidateMetadata(selectedCandidateId);
  const compareMutation = useCompareCandidates();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-5)));
  };

  const runCompare = () => {
    if (compareIds.length >= 2) {
      compareMutation.mutate(compareIds);
      setShowCompare(true);
    }
  };

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

              <CandidateFunnel
                candidates={candidateList}
                activeRecommendation={filters.recommendation}
                onSelectRecommendation={(recommendation) => updateFilters({ recommendation })}
              />

              <div className="space-y-6">
                <SectionCard
                  title={t("recruiter.candidates.title")}
                  subtitle={t("recruiter.candidates.subtitle", {
                    count: candidatesQuery.data?.meta.total ?? 0,
                    page: candidatesQuery.data?.meta.page ?? 1,
                  })}
                  actions={
                    selectedJobId && (candidatesQuery.data?.meta.total ?? 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid="recruiter-compare-open"
                          onClick={runCompare}
                          disabled={compareIds.length < 2 || compareMutation.isPending}
                          className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {t("recruiter.actions.compare", "Compare")} ({compareIds.length})
                        </button>
                        <button
                          type="button"
                          data-testid="recruiter-export-csv"
                          onClick={async () => {
                          try {
                            const blob = await recruiterApi.exportCandidatesCsv(selectedJobId);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `candidates-${selectedJobId}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          } catch {
                            // toast handled by axios interceptor
                          }
                        }}
                        className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
                      >
                        {t("recruiter.actions.exportCsv", "Export CSV")}
                      </button>
                      </div>
                    ) : null
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="pb-3 pr-2 font-medium w-8"></th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.candidate")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.score")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.skills")}</th>
                          <th className="pb-3 pr-4 font-medium">{t("recruiter.table.links")}</th>
                          <th className="pb-3 font-medium">{t("recruiter.table.updatedAt")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {candidateList.map((item, index) => (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedCandidateId(item.id);
                              setDetailOpen(true);
                            }}
                            className={`cursor-pointer align-top transition hover:bg-accent/40 ${
                              selectedCandidateId === item.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                data-testid={`recruiter-compare-${item.id}`}
                                checked={compareIds.includes(item.id)}
                                onChange={() => toggleCompare(item.id)}
                                aria-label="Select for compare"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                                  {((filters.page ?? 1) - 1) * (filters.limit ?? 20) + index + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{item.fullName || t("recruiter.common.unknownCandidate")}</p>
                                  <p className="text-muted-foreground">{item.headline || item.email || "—"}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.yearsOfExperience != null
                                      ? t("recruiter.candidates.experienceYears", { count: item.yearsOfExperience })
                                      : t("recruiter.common.notAvailable")}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <ScoreRing value={item.evaluation?.overallScore} size={44} />
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

                <div className="grid gap-6 lg:grid-cols-2">

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

      <CandidateDetailDrawer
        candidate={candidate ?? null}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onReEvaluate={() => reEvaluateMutation.mutate({ force: true })}
        reEvaluating={reEvaluateMutation.isPending}
        onSaveMetadata={(data) => updateMetadataMutation.mutate(data)}
        savingMetadata={updateMetadataMutation.isPending}
        locale={i18n.language}
      />

      {showCompare && compareMutation.data && compareMutation.data.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="recruiter-comparison-modal"
          onClick={() => setShowCompare(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-auto rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("recruiter.compare.title", "Candidate comparison")}</h3>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
                data-testid="recruiter-comparison-close"
              >
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Field</th>
                    {compareMutation.data.map((c) => (
                      <th key={c.id} className="pb-2 pr-4 font-medium">{c.fullName || c.email || c.id.slice(0, 8)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: "Overall", get: (c: typeof compareMutation.data[number]) => c.evaluation?.overallScore ?? "—" },
                    { label: "Must-have", get: (c: typeof compareMutation.data[number]) => c.evaluation?.mustHaveScore ?? "—" },
                    { label: "Keywords", get: (c: typeof compareMutation.data[number]) => c.evaluation?.keywordScore ?? "—" },
                    { label: "Experience", get: (c: typeof compareMutation.data[number]) => c.evaluation?.experienceScore ?? "—" },
                    { label: "Readability", get: (c: typeof compareMutation.data[number]) => c.evaluation?.readabilityScore ?? "—" },
                    { label: "Recommendation", get: (c: typeof compareMutation.data[number]) => c.evaluation?.recommendation ?? "—" },
                    { label: "Years exp.", get: (c: typeof compareMutation.data[number]) => c.yearsOfExperience ?? "—" },
                    { label: "Tags", get: (c: typeof compareMutation.data[number]) => (c.tags ?? []).join(", ") || "—" },
                    { label: "Notes", get: (c: typeof compareMutation.data[number]) => c.notes ?? "—" },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 pr-4 font-medium">{row.label}</td>
                      {compareMutation.data!.map((c) => (
                        <td key={c.id} className="py-2 pr-4">{String(row.get(c))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
