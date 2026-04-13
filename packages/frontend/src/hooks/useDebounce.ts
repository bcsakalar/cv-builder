import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { UseFormWatch } from "react-hook-form";
import { useCVStore } from "@/stores/cv.store";

export function useDebounce<T>(value: T, delay = 800): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useAutoSave<T extends Record<string, unknown>>(
  watch: UseFormWatch<T>,
  onSave: (data: T) => void,
  delay = 800
) {
  const setSaveStatus = useCVStore((s) => s.setSaveStatus);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const handleSave = useEffectEvent((data: T, serialized: string) => {
    try {
      onSave(data);
      lastSavedRef.current = serialized;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  });

  useEffect(() => {
    const subscription = watch((data) => {
      const serialized = JSON.stringify(data);
      if (serialized === lastSavedRef.current) return;

      // Debounce the status update too to avoid re-render on every keystroke
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus("saving"), 300);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        handleSave(data as T, serialized);
      }, delay);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [watch, delay, setSaveStatus]);
}
