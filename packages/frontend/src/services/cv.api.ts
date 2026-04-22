import { api, unwrap } from "@/lib/api";

export interface CVListItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  locale: string;
  updatedAt: string;
  createdAt: string;
  template: { id: string; name: string; slug: string };
  personalInfo: { firstName: string; lastName: string; professionalTitle: string } | null;
}

export interface CVDetail {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  locale: string;
  isAtsOptimized: boolean;
  sectionOrder: string[];
  themeConfig: Record<string, unknown>;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  template: { id: string; name: string; slug: string; defaultThemeConfig?: Record<string, unknown> };
  personalInfo: Record<string, unknown> | null;
  summary: { id: string; content: string; aiGenerated: boolean } | null;
  coverLetter: { id: string; content: string; aiGenerated: boolean } | null;
  experiences: Record<string, unknown>[];
  educations: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  languages: Record<string, unknown>[];
  volunteerExperiences: Record<string, unknown>[];
  publications: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  references: Record<string, unknown>[];
  hobbies: Record<string, unknown>[];
  customSections: Record<string, unknown>[];
}

export const cvApi = {
  getAll: () => api.get("/cv").then(unwrap<CVListItem[]>),

  getById: (id: string) => api.get(`/cv/${id}`).then(unwrap<CVDetail>),

  create: (data: { title: string; templateId: string; locale?: string }) =>
    api.post("/cv", data).then(unwrap<CVDetail>),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${id}`, data).then(unwrap<CVDetail>),

  clone: (id: string, data: { locale?: string; targetRole?: string; title?: string }) =>
    api.post(`/cv/${id}/clone`, data).then(unwrap<CVDetail>),

  remove: (id: string) => api.delete(`/cv/${id}`),

  updateSectionOrder: (id: string, sectionOrder: string[]) =>
    api.patch(`/cv/${id}/section-order`, { sectionOrder }).then(unwrap<CVDetail>),

  updateTheme: (id: string, themeConfig: Record<string, unknown>) =>
    api.patch(`/cv/${id}/theme`, { themeConfig }).then(unwrap<CVDetail>),

  // Section APIs
  upsertPersonalInfo: (cvId: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/personal-info`, data).then(unwrap),

  upsertSummary: (cvId: string, data: { content: string; aiGenerated?: boolean }) =>
    api.put(`/cv/${cvId}/summary`, data).then(unwrap),

  upsertCoverLetter: (cvId: string, data: { content: string; aiGenerated?: boolean }) =>
    api.put(`/cv/${cvId}/cover-letter`, data).then(unwrap),

  addExperience: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/experiences`, data).then(unwrap),

  updateExperience: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/experiences/${id}`, data).then(unwrap),

  removeExperience: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/experiences/${id}`),

  addEducation: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/educations`, data).then(unwrap),

  updateEducation: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/educations/${id}`, data).then(unwrap),

  removeEducation: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/educations/${id}`),

  addSkill: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/skills`, data).then(unwrap),

  updateSkill: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/skills/${id}`, data).then(unwrap),

  removeSkill: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/skills/${id}`),

  addProject: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/projects`, data).then(unwrap),

  updateProject: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/projects/${id}`, data).then(unwrap),

  removeProject: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/projects/${id}`),

  addCertification: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/certifications`, data).then(unwrap),

  updateCertification: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/certifications/${id}`, data).then(unwrap),

  removeCertification: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/certifications/${id}`),

  addLanguage: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/languages`, data).then(unwrap),

  updateLanguage: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/languages/${id}`, data).then(unwrap),

  removeLanguage: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/languages/${id}`),

  addVolunteer: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/volunteer-experiences`, data).then(unwrap),

  updateVolunteer: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/volunteer-experiences/${id}`, data).then(unwrap),

  removeVolunteer: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/volunteer-experiences/${id}`),

  addPublication: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/publications`, data).then(unwrap),

  updatePublication: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/publications/${id}`, data).then(unwrap),

  removePublication: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/publications/${id}`),

  addAward: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/awards`, data).then(unwrap),

  updateAward: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/awards/${id}`, data).then(unwrap),

  removeAward: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/awards/${id}`),

  addReference: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/references`, data).then(unwrap),

  updateReference: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/references/${id}`, data).then(unwrap),

  removeReference: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/references/${id}`),

  addHobby: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/hobbies`, data).then(unwrap),

  updateHobby: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/hobbies/${id}`, data).then(unwrap),

  removeHobby: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/hobbies/${id}`),

  addCustomSection: (cvId: string, data: Record<string, unknown>) =>
    api.post(`/cv/${cvId}/custom-sections`, data).then(unwrap),

  updateCustomSection: (cvId: string, id: string, data: Record<string, unknown>) =>
    api.put(`/cv/${cvId}/custom-sections/${id}`, data).then(unwrap),

  removeCustomSection: (cvId: string, id: string) =>
    api.delete(`/cv/${cvId}/custom-sections/${id}`),
};
