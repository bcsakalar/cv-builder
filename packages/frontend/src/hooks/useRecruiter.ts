import type {
  CandidateProfile,
  CreateRecruiterJobInput,
  ReevaluateCandidateInput,
  RecruiterCandidateFilters,
  RecruiterJob,
} from "@cvbuilder/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { translate } from "@/i18n/helpers";
import { recruiterApi } from "@/services/recruiter.api";

const ACTIVE_BATCH_STATUSES = new Set(["PENDING", "PROCESSING"]);

export const recruiterKeys = {
  all: ["recruiter"] as const,
  jobs: () => [...recruiterKeys.all, "jobs"] as const,
  job: (jobId: string) => [...recruiterKeys.all, "job", jobId] as const,
  batch: (batchId: string) => [...recruiterKeys.all, "batch", batchId] as const,
  candidates: (jobId: string, filters: RecruiterCandidateFilters) =>
    [...recruiterKeys.all, "candidates", jobId, filters] as const,
  candidate: (candidateId: string) => [...recruiterKeys.all, "candidate", candidateId] as const,
};

export function useRecruiterJobs() {
  return useQuery({
    queryKey: recruiterKeys.jobs(),
    queryFn: recruiterApi.listJobs,
  });
}

export function useRecruiterJob(jobId: string, live = false) {
  return useQuery({
    queryKey: recruiterKeys.job(jobId),
    queryFn: () => recruiterApi.getJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!live) return false;
      const job = query.state.data;
      return job?.latestBatchStatus && ACTIVE_BATCH_STATUSES.has(job.latestBatchStatus) ? 4000 : false;
    },
  });
}

export function useRecruiterBatch(batchId: string, live = false) {
  return useQuery({
    queryKey: recruiterKeys.batch(batchId),
    queryFn: () => recruiterApi.getBatch(batchId),
    enabled: !!batchId,
    refetchInterval: live ? 4000 : false,
  });
}

export function useRecruiterCandidates(jobId: string, filters: RecruiterCandidateFilters, live = false) {
  return useQuery({
    queryKey: recruiterKeys.candidates(jobId, filters),
    queryFn: () => recruiterApi.listCandidates(jobId, filters),
    enabled: !!jobId,
    refetchInterval: live ? 4000 : false,
  });
}

export function useRecruiterCandidate(candidateId: string) {
  return useQuery({
    queryKey: recruiterKeys.candidate(candidateId),
    queryFn: () => recruiterApi.getCandidate(candidateId),
    enabled: !!candidateId,
  });
}

export function useCreateRecruiterJob() {
  const qc = useQueryClient();

  return useMutation<RecruiterJob, Error, CreateRecruiterJobInput>({
    mutationFn: recruiterApi.createJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.jobs() });
      toast.success(translate("toasts.recruiter.jobCreated"));
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useCreateRecruiterBatch(jobId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => recruiterApi.createBatch(jobId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.jobs() });
      qc.invalidateQueries({ queryKey: recruiterKeys.job(jobId) });
      qc.invalidateQueries({ queryKey: recruiterKeys.all });
      toast.success(translate("toasts.recruiter.batchUploaded"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useReEvaluateCandidate(candidateId: string) {
  const qc = useQueryClient();

  return useMutation<CandidateProfile, Error, ReevaluateCandidateInput>({
    mutationFn: (payload) => recruiterApi.reEvaluateCandidate(candidateId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.all });
      qc.invalidateQueries({ queryKey: recruiterKeys.candidate(candidateId) });
      toast.success(translate("toasts.recruiter.reEvaluated"));
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateCandidateMetadata(candidateId: string) {
  const qc = useQueryClient();
  return useMutation<CandidateProfile, Error, { notes?: string | null; tags?: string[] }>({
    mutationFn: (data) => recruiterApi.updateCandidateMetadata(candidateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.all });
      qc.invalidateQueries({ queryKey: recruiterKeys.candidate(candidateId) });
      toast.success(translate("toasts.recruiter.candidateUpdated", { defaultValue: "Candidate updated" }));
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useCompareCandidates() {
  return useMutation<CandidateProfile[], Error, string[]>({
    mutationFn: (ids) => recruiterApi.compareCandidates(ids),
    onError: (error) => toast.error(error.message),
  });
}
