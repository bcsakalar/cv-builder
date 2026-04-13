import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Trash2, Plus } from "lucide-react";
import { nullIfBlank } from "./form-utils";

const createCertSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("common.required")),
  issuingOrganization: z.string().trim().min(1, t("common.required")),
  issueDate: z.string().min(1, t("common.required")),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url(t("common.invalidUrl")).optional().or(z.literal("")),
});

type CertForm = z.infer<ReturnType<typeof createCertSchema>>;

export function CertificationsSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { certification } = useSectionMutation(cv.id);
  const certSchema = createCertSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CertForm>({ resolver: zodResolver(certSchema) });

  const onAdd = (data: CertForm) => {
    certification.add.mutate({
      name: data.name.trim(),
      issuingOrganization: data.issuingOrganization.trim(),
      issueDate: data.issueDate,
      expirationDate: nullIfBlank(data.expirationDate),
      credentialId: nullIfBlank(data.credentialId),
      credentialUrl: nullIfBlank(data.credentialUrl),
      orderIndex: cv.certifications.length,
    }, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="space-y-4">
      {cv.certifications.map((cert: Record<string, unknown>) => (
        <div key={String(cert.id)} className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{String(cert.name)}</p>
            <p className="text-sm text-muted-foreground">{String(cert.issuingOrganization)}</p>
            {!!cert.issueDate && (
              <p className="text-xs text-muted-foreground">{t("editorSections.certifications.issued")}: {String(cert.issueDate)}</p>
            )}
          </div>
          <button
            onClick={() => certification.remove.mutate(cert.id as string)}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <form onSubmit={handleSubmit(onAdd)} className="space-y-3 rounded-lg border border-dashed p-4">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Plus size={14} /> {t("editorSections.certifications.add")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input aria-label={t("editorSections.certifications.name")} {...register("name")} placeholder={t("editorSections.certifications.name")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.certifications.issuer")} {...register("issuingOrganization")} placeholder={t("editorSections.certifications.issuer")} className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.issuingOrganization && <p className="text-xs text-destructive mt-1">{errors.issuingOrganization.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.certifications.issueDate")} {...register("issueDate")} type="date" className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors.issueDate && <p className="text-xs text-destructive mt-1">{errors.issueDate.message}</p>}
          </div>
          <div>
            <input aria-label={t("editorSections.certifications.expiryDate")} {...register("expirationDate")} type="date" className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <input aria-label={t("editorSections.certifications.credentialId")} {...register("credentialId")} placeholder={t("editorSections.certifications.credentialId")} className="rounded-md border px-3 py-2 text-sm" />
          <input aria-label={t("editorSections.certifications.credentialUrl")} {...register("credentialUrl")} placeholder={t("editorSections.certifications.credentialUrl")} className="rounded-md border px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {t("common.add")}
        </button>
      </form>
    </div>
  );
}
