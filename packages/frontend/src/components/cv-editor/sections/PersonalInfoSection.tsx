import { useCallback } from "react";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useAutoSave } from "@/hooks/useDebounce";
import { ProfilePhotoUpload } from "../../upload/ProfilePhotoUpload";

const createSchema = (t: TFunction) => z.object({
  firstName: z.string().min(1, t("common.required")),
  lastName: z.string().min(1, t("common.required")),
  professionalTitle: z.string().default(""),
  email: z.string().email(t("common.invalidEmail")),
  phone: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default(""),
  zipCode: z.string().default(""),
  website: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  linkedIn: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  github: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  twitter: z.string().url(t("common.invalidUrl")).nullable().or(z.literal("")).transform((v) => v || null),
  dateOfBirth: z.string().nullable().default(null),
  nationality: z.string().nullable().default(null),
  stackoverflow: z.string().nullable().default(null),
  medium: z.string().nullable().default(null),
  behance: z.string().nullable().default(null),
  dribbble: z.string().nullable().default(null),
  profilePhotoUrl: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

function Field({ name, label, type = "text", register, errors }: {
  name: keyof FormData;
  label: string;
  type?: string;
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        {...register(name)}
        type={type}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-destructive">{errors[name]?.message as string}</p>
      )}
    </div>
  );
}

export function PersonalInfoSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { upsertPersonalInfo } = useSectionMutation(cv.id);
  const schema = createSchema(t);

  const pi = cv.personalInfo as FormData | null;
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: pi ?? {
      firstName: "",
      lastName: "",
      professionalTitle: "",
      email: "",
      phone: "",
      city: "",
      country: "",
      zipCode: "",
      website: null,
      linkedIn: null,
      github: null,
      twitter: null,
      dateOfBirth: null,
      nationality: null,
      stackoverflow: null,
      medium: null,
      behance: null,
      dribbble: null,
      profilePhotoUrl: null,
      address: null,
    },
  });

  const onSave = useCallback(
    (data: FormData) => upsertPersonalInfo.mutate(data as Record<string, unknown>),
    [upsertPersonalInfo]
  );

  useAutoSave(form.watch, onSave);

  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6">
      <ProfilePhotoUpload cvId={cv.id} currentPhotoUrl={pi?.profilePhotoUrl} />
      <div className="grid grid-cols-2 gap-4">
        <Field name="firstName" label={t("editorSections.personalInfo.firstName")} register={register} errors={errors} />
        <Field name="lastName" label={t("editorSections.personalInfo.lastName")} register={register} errors={errors} />
      </div>
      <Field name="professionalTitle" label={t("editorSections.personalInfo.professionalTitle")} register={register} errors={errors} />
      <div className="grid grid-cols-2 gap-4">
        <Field name="email" label={t("editorSections.personalInfo.email")} type="email" register={register} errors={errors} />
        <Field name="phone" label={t("editorSections.personalInfo.phone")} register={register} errors={errors} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field name="city" label={t("editorSections.personalInfo.city")} register={register} errors={errors} />
        <Field name="country" label={t("editorSections.personalInfo.country")} register={register} errors={errors} />
        <Field name="zipCode" label={t("editorSections.personalInfo.zipCode")} register={register} errors={errors} />
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 text-sm font-semibold">{t("editorSections.personalInfo.socialLinks")}</h3>
        <div className="space-y-3">
          <Field name="website" label={t("editorSections.personalInfo.website")} type="url" register={register} errors={errors} />
          <Field name="linkedIn" label={t("editorSections.personalInfo.linkedIn")} type="url" register={register} errors={errors} />
          <Field name="github" label={t("editorSections.personalInfo.github")} type="url" register={register} errors={errors} />
          <Field name="twitter" label={t("editorSections.personalInfo.twitter")} type="url" register={register} errors={errors} />
        </div>
      </div>
    </div>
  );
}
