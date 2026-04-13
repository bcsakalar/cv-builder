import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadApi } from "@/services/upload.api";
import type { CVDetail } from "@/services/cv.api";
import { cvKeys } from "@/hooks/useCV";
import { toast } from "sonner";
import { translate } from "@/i18n/helpers";

function updatePhotoUrl(previous: CVDetail | undefined, photoUrl: string | null): CVDetail | undefined {
  if (!previous) {
    return previous;
  }

  return {
    ...previous,
    personalInfo: {
      ...(previous.personalInfo ?? {}),
      profilePhotoUrl: photoUrl,
    },
  };
}

export function useUploadPhoto(cvId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadApi.uploadPhoto(cvId, file),
    onSuccess: (result) => {
      queryClient.setQueryData<CVDetail | undefined>(
        cvKeys.detail(cvId),
        (previous) => updatePhotoUrl(previous, result.url),
      );

      toast.success(translate("toasts.upload.uploaded"));
      queryClient.invalidateQueries({ queryKey: cvKeys.detail(cvId) });
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: () => {
      toast.error(translate("toasts.upload.uploadFailed"));
    },
  });
}

export function useDeletePhoto(cvId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => uploadApi.deletePhoto(cvId),
    onSuccess: () => {
      queryClient.setQueryData<CVDetail | undefined>(
        cvKeys.detail(cvId),
        (previous) => updatePhotoUrl(previous, null),
      );

      toast.success(translate("toasts.upload.removed"));
      queryClient.invalidateQueries({ queryKey: cvKeys.detail(cvId) });
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: () => {
      toast.error(translate("toasts.upload.removeFailed"));
    },
  });
}
