import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cvApi } from "@/services/cv.api";
import type { CVListItem, CVDetail } from "@/services/cv.api";
import { toast } from "sonner";
import { translate } from "@/i18n/helpers";

export const cvKeys = {
  all: ["cvs"] as const,
  detail: (id: string) => ["cvs", id] as const,
};

export function useGetCVs() {
  return useQuery<CVListItem[]>({
    queryKey: cvKeys.all,
    queryFn: cvApi.getAll,
  });
}

export function useGetCV(id: string) {
  return useQuery<CVDetail>({
    queryKey: cvKeys.detail(id),
    queryFn: () => cvApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cvApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cvKeys.all });
      toast.success(translate("toasts.cv.created"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCV(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cvApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cvKeys.detail(id) });
      qc.invalidateQueries({ queryKey: cvKeys.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cvApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cvKeys.all });
      toast.success(translate("toasts.cv.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCloneCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; locale?: string; targetRole?: string; title?: string }) =>
      cvApi.clone(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cvKeys.all });
      toast.success(translate("cvList.cloneSuccess", { defaultValue: "CV variant created." }));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSectionOrder(cvId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectionOrder: string[]) => cvApi.updateSectionOrder(cvId, sectionOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: cvKeys.detail(cvId) }),
  });
}

export function useUpdateTheme(cvId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (themeConfig: Record<string, unknown>) => cvApi.updateTheme(cvId, themeConfig),
    onSuccess: () => qc.invalidateQueries({ queryKey: cvKeys.detail(cvId) }),
  });
}

// ── Section Mutations ────────────────────────────────────

export function useSectionMutation(cvId: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: cvKeys.detail(cvId) });
  };

  return {
    upsertPersonalInfo: useMutation({
      mutationFn: (data: Record<string, unknown>) => cvApi.upsertPersonalInfo(cvId, data),
      onSuccess: invalidate,
    }),
    upsertSummary: useMutation({
      mutationFn: (data: { content: string; aiGenerated?: boolean }) => cvApi.upsertSummary(cvId, data),
      onSuccess: invalidate,
    }),
    upsertCoverLetter: useMutation({
      mutationFn: (data: { content: string; aiGenerated?: boolean }) => cvApi.upsertCoverLetter(cvId, data),
      onSuccess: invalidate,
    }),
    addExperience: useMutation({
      mutationFn: (data: Record<string, unknown>) => cvApi.addExperience(cvId, data),
      onSuccess: invalidate,
    }),
    updateExperience: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        cvApi.updateExperience(cvId, id, data),
      onSuccess: invalidate,
    }),
    removeExperience: useMutation({
      mutationFn: (id: string) => cvApi.removeExperience(cvId, id),
      onSuccess: invalidate,
    }),
    addEducation: useMutation({
      mutationFn: (data: Record<string, unknown>) => cvApi.addEducation(cvId, data),
      onSuccess: invalidate,
    }),
    updateEducation: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        cvApi.updateEducation(cvId, id, data),
      onSuccess: invalidate,
    }),
    removeEducation: useMutation({
      mutationFn: (id: string) => cvApi.removeEducation(cvId, id),
      onSuccess: invalidate,
    }),
    addSkill: useMutation({
      mutationFn: (data: Record<string, unknown>) => cvApi.addSkill(cvId, data),
      onSuccess: invalidate,
    }),
    updateSkill: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        cvApi.updateSkill(cvId, id, data),
      onSuccess: invalidate,
    }),
    removeSkill: useMutation({
      mutationFn: (id: string) => cvApi.removeSkill(cvId, id),
      onSuccess: invalidate,
    }),
    addProject: useMutation({
      mutationFn: (data: Record<string, unknown>) => cvApi.addProject(cvId, data),
      onSuccess: invalidate,
    }),
    removeProject: useMutation({
      mutationFn: (id: string) => cvApi.removeProject(cvId, id),
      onSuccess: invalidate,
    }),

    // ── Grouped section helpers ──
    certification: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addCertification(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeCertification(cvId, id),
        onSuccess: invalidate,
      }),
    },
    language: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addLanguage(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeLanguage(cvId, id),
        onSuccess: invalidate,
      }),
    },
    volunteer: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addVolunteer(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeVolunteer(cvId, id),
        onSuccess: invalidate,
      }),
    },
    publication: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addPublication(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removePublication(cvId, id),
        onSuccess: invalidate,
      }),
    },
    award: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addAward(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeAward(cvId, id),
        onSuccess: invalidate,
      }),
    },
    reference: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addReference(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeReference(cvId, id),
        onSuccess: invalidate,
      }),
    },
    hobby: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addHobby(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeHobby(cvId, id),
        onSuccess: invalidate,
      }),
    },
    customSection: {
      add: useMutation({
        mutationFn: (data: Record<string, unknown>) => cvApi.addCustomSection(cvId, data),
        onSuccess: invalidate,
      }),
      remove: useMutation({
        mutationFn: (id: string) => cvApi.removeCustomSection(cvId, id),
        onSuccess: invalidate,
      }),
    },
  };
}
