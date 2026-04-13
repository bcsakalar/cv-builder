import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { CVDetail } from "@/services/cv.api";
import { useSectionMutation } from "@/hooks/useCV";
import { useSuggestSkills } from "@/hooks/useAI";
import { Plus, Trash2, Sparkles, Loader2, X, Check } from "lucide-react";
import { skillCategoryLabelKeys, skillLevelLabelKeys } from "@/i18n/helpers";

const CATEGORIES = ["TECHNICAL", "SOFT", "LANGUAGE", "TOOL", "FRAMEWORK", "OTHER"] as const;
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

const createSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("common.required")).max(100),
  category: z.enum(CATEGORIES),
  proficiencyLevel: z.enum(LEVELS),
  yearsOfExperience: z.preprocess(
    (value) => value === "" ? null : value,
    z.coerce.number().min(0).max(50).nullable().default(null)
  ),
  orderIndex: z.number().default(0),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

export function SkillsSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const { addSkill, removeSkill } = useSectionMutation(cv.id);
  const suggestMut = useSuggestSkills();

  const skills = cv.skills as (FormData & { id: string })[];
  const existingNames = new Set(skills.map((s) => s.name.toLowerCase()));

  const grouped = CATEGORIES.reduce(
    (acc, cat) => {
      const items = skills.filter((s) => s.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {} as Record<string, (FormData & { id: string })[]>
  );

  const handleSuggest = () => {
    suggestMut.mutate(cv.id, {
      onSuccess: (data) => {
        const filtered = data
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0 && skill.length <= 100 && !existingNames.has(skill.toLowerCase()));
        setSuggestedSkills(filtered);
      },
    });
  };

  const handleAcceptSkill = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100 || existingNames.has(trimmedName.toLowerCase())) {
      setSuggestedSkills((prev) => prev.filter((skill) => skill !== name));
      return;
    }

    addSkill.mutate({ name: trimmedName, category: "TECHNICAL", proficiencyLevel: "INTERMEDIATE", yearsOfExperience: null, orderIndex: skills.length } as Record<string, unknown>);
    setSuggestedSkills((prev) => prev.filter((s) => s !== name));
  };

  return (
    <div className="space-y-6">
      {/* AI Suggest Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSuggest}
          disabled={suggestMut.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
        >
          {suggestMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {t("editorSections.skills.suggest")}
        </button>
      </div>

      {/* Suggested Skills */}
      {suggestedSkills.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/50">
          <p className="mb-2 text-xs font-medium text-purple-700 dark:text-purple-300">{t("editorSections.skills.suggestedInstructions")}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedSkills.map((skill) => (
              <div key={skill} className="flex items-center gap-1 rounded-full border border-purple-300 bg-white px-2.5 py-1 text-xs dark:border-purple-700 dark:bg-purple-900">
                <span>{skill}</span>
                <button onClick={() => handleAcceptSkill(skill)} className="rounded-full p-0.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900">
                  <Check size={12} />
                </button>
                <button onClick={() => setSuggestedSkills((prev) => prev.filter((s) => s !== skill))} className="rounded-full p-0.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-semibold capitalize">{t(skillCategoryLabelKeys[category] ?? "editorSections.skills.categories.other")}</h3>
          <div className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <div
                key={skill.id}
                className="group flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm"
              >
                <span>{skill.name}</span>
                <span className="text-xs text-muted-foreground">
                  · {t(skillLevelLabelKeys[skill.proficiencyLevel] ?? "editorSections.skills.levels.intermediate")}
                </span>
                <button
                  onClick={() => removeSkill.mutate(skill.id)}
                  className="ml-1 hidden rounded-full p-0.5 text-destructive hover:bg-destructive/10 group-hover:block"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {isAdding ? (
        <SkillForm
          orderIndex={skills.length}
          onSubmit={(data) => {
            addSkill.mutate(data as Record<string, unknown>);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          <Plus size={16} /> {t("editorSections.skills.add")}
        </button>
      )}
    </div>
  );
}

function SkillForm({ orderIndex, onSubmit, onCancel }: { orderIndex: number; onSubmit: (d: FormData) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const formId = useId();
  const schema = createSchema(t);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "TECHNICAL", proficiencyLevel: "INTERMEDIATE", yearsOfExperience: null, orderIndex },
  });
  const nameId = `${formId}-name`;
  const categoryId = `${formId}-category`;
  const proficiencyId = `${formId}-proficiency`;
  const yearsId = `${formId}-years`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-lg border p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={nameId} className="mb-1 block text-xs font-medium">{t("editorSections.skills.name")}</label><input id={nameId} maxLength={100} {...form.register("name")} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
        <div>
          <label htmlFor={categoryId} className="mb-1 block text-xs font-medium">{t("editorSections.skills.category")}</label>
          <select id={categoryId} {...form.register("category")} className="w-full rounded-lg border px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(skillCategoryLabelKeys[c] ?? "editorSections.skills.categories.other")}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={proficiencyId} className="mb-1 block text-xs font-medium">{t("editorSections.skills.proficiency")}</label>
          <select id={proficiencyId} {...form.register("proficiencyLevel")} className="w-full rounded-lg border px-3 py-2 text-sm">
            {LEVELS.map((l) => <option key={l} value={l}>{t(skillLevelLabelKeys[l] ?? "editorSections.skills.levels.intermediate")}</option>)}
          </select>
        </div>
        <div><label htmlFor={yearsId} className="mb-1 block text-xs font-medium">{t("editorSections.skills.years")}</label><input id={yearsId} {...form.register("yearsOfExperience")} type="number" className="w-full rounded-lg border px-3 py-2 text-sm" /></div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{t("common.add")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">{t("common.cancel")}</button>
      </div>
    </form>
  );
}
