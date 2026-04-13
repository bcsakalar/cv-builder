import { useState } from "react";
import { useSectionMutation } from "@/hooks/useCV";
import type { CVDetail } from "@/services/cv.api";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HobbiesSection({ cv }: { cv: CVDetail }) {
  const { t } = useTranslation();
  const { hobby } = useSectionMutation(cv.id);
  const [newHobby, setNewHobby] = useState("");

  const onAdd = () => {
    if (!newHobby.trim()) return;
    hobby.add.mutate({ name: newHobby.trim() }, {
      onSuccess: () => setNewHobby(""),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {cv.hobbies.map((h: Record<string, unknown>) => (
          <span
            key={h.id as string}
            className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm"
          >
            {h.name as string}
            <button
              onClick={() => hobby.remove.mutate(h.id as string)}
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newHobby}
          onChange={(e) => setNewHobby(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          placeholder={t("editorSections.hobbies.placeholder")}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={onAdd}
          disabled={!newHobby.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
