import { create } from "zustand";
import type { CVDetail } from "@/services/cv.api";

interface CVEditorState {
  activeCV: CVDetail | null;
  activeSection: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  setActiveCV: (cv: CVDetail | null) => void;
  setActiveSection: (section: string) => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
}

export const useCVStore = create<CVEditorState>((set) => ({
  activeCV: null,
  activeSection: "personalInfo",
  saveStatus: "idle",
  setActiveCV: (cv) => set({ activeCV: cv }),
  setActiveSection: (section) => set({ activeSection: section }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
