import { useRef, useState } from "react";
import { useUploadPhoto, useDeletePhoto } from "@/hooks/useUpload";
import { resolveStaticAssetUrl } from "@/lib/assets";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProfilePhotoUploadProps {
  cvId: string;
  currentPhotoUrl?: string | null;
  onPhotoChange?: (nextPhotoUrl: string | null) => void;
}

export function ProfilePhotoUpload({ cvId, currentPhotoUrl, onPhotoChange }: ProfilePhotoUploadProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const uploadMut = useUploadPhoto(cvId);
  const deleteMut = useDeletePhoto(cvId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    uploadMut.mutate(file, {
      onSuccess: (result) => {
        setPreview(null);
        onPhotoChange?.(result.url);
      },
      onError: () => setPreview(null),
    });
  };

  const handleDelete = () => {
    deleteMut.mutate(undefined, {
      onSuccess: () => {
        setPreview(null);
        onPhotoChange?.(null);
      },
    });
  };

  const photoSrc = preview || resolveStaticAssetUrl(currentPhotoUrl);
  const isLoading = uploadMut.isPending || deleteMut.isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={t("upload.profileAlt")}
            className="h-20 w-20 rounded-full border-2 border-border object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
            <Camera size={24} className="text-muted-foreground/50" />
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 size={20} className="animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
        >
          {currentPhotoUrl ? t("upload.changePhoto") : t("upload.uploadPhoto")}
        </button>
        {currentPhotoUrl && (
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={12} /> {t("upload.removePhoto")}
          </button>
        )}
        <p className="text-[10px] text-muted-foreground">{t("upload.imageHint")}</p>
      </div>
    </div>
  );
}
