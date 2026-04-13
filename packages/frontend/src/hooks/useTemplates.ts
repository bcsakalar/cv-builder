import { useQuery } from "@tanstack/react-query";
import { templateApi } from "@/services/template.api";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => templateApi.getAll(),
  });
}
