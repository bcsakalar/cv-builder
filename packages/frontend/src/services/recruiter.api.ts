import type {
  CandidateProfile,
  CreateRecruiterJobInput,
  PaginatedResponse,
  ReevaluateCandidateInput,
  RecruiterBatchDetail,
  RecruiterCandidateFilters,
  RecruiterCandidateListItem,
  RecruiterJob,
  RecruiterJobDetail,
  RecruiterJobListItem,
} from "@cvbuilder/shared";
import { api, unwrap } from "@/lib/api";

export type RecruiterCandidateListResponse = PaginatedResponse<RecruiterCandidateListItem>;

export const recruiterApi = {
  listJobs: () => api.get("/recruiter/jobs").then(unwrap<RecruiterJobListItem[]>),

  createJob: (data: CreateRecruiterJobInput) =>
    api.post("/recruiter/jobs", data).then(unwrap<RecruiterJob>),

  getJob: (jobId: string) =>
    api.get(`/recruiter/jobs/${jobId}`).then(unwrap<RecruiterJobDetail>),

  createBatch: (jobId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return api
      .post(`/recruiter/jobs/${jobId}/batches`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap<RecruiterBatchDetail>);
  },

  getBatch: (batchId: string) =>
    api.get(`/recruiter/batches/${batchId}`).then(unwrap<RecruiterBatchDetail>),

  listCandidates: (jobId: string, filters: RecruiterCandidateFilters) =>
    api
      .get(`/recruiter/jobs/${jobId}/candidates`, { params: filters })
      .then(unwrap<RecruiterCandidateListResponse>),

  getCandidate: (candidateId: string) =>
    api.get(`/recruiter/candidates/${candidateId}`).then(unwrap<CandidateProfile>),

  reEvaluateCandidate: (candidateId: string, payload: ReevaluateCandidateInput = { force: true }) =>
    api.post(`/recruiter/candidates/${candidateId}/re-evaluate`, payload).then(unwrap<CandidateProfile>),

  exportCandidatesCsv: async (jobId: string): Promise<Blob> => {
    const res = await api.get(`/recruiter/jobs/${jobId}/candidates/export.csv`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  updateCandidateMetadata: (candidateId: string, data: { notes?: string | null; tags?: string[] }) =>
    api.patch(`/recruiter/candidates/${candidateId}/metadata`, data).then(unwrap<CandidateProfile>),

  compareCandidates: (candidateIds: string[]) =>
    api.post(`/recruiter/candidates/compare`, { candidateIds }).then(unwrap<CandidateProfile[]>),
};
