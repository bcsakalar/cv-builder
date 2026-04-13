import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi, type LoginPayload, type RegisterPayload } from "@/services/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { translate } from "@/i18n/helpers";

export function useRegister() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (session) => {
      setSession(session);
      queryClient.clear();
      toast.success(translate("toasts.auth.registerSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (session) => {
      setSession(session);
      queryClient.clear();
      toast.success(translate("toasts.auth.loginSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      toast.success(translate("toasts.auth.logoutSuccess"));
    },
    onError: () => {
      clearSession();
      queryClient.clear();
    },
  });
}