import { api, unwrap } from "@/lib/api";

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  previewImageUrl: string | null;
  isActive: boolean;
  isPremium: boolean;
  layoutConfig: Record<string, unknown>;
  defaultThemeConfig: Record<string, unknown>;
}

export const templateApi = {
  getAll: (params?: { category?: string }) =>
    api.get("/templates", { params }).then(unwrap<Template[]>),

  getById: (id: string) =>
    api.get(`/templates/${id}`).then(unwrap<Template>),
};
