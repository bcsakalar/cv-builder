import { useState } from "react";
import { useConnectGitHub, useDisconnectGitHub, useGitHubOAuthAuthorize, useGitHubStatus } from "@/hooks/useGitHub";
import { Github, Loader2, LogOut, Key, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GitHubConnect() {
  const { t } = useTranslation();
  const { data: status, isLoading } = useGitHubStatus();
  const connectMutation = useConnectGitHub();
  const oauthMutation = useGitHubOAuthAuthorize();
  const disconnectMutation = useDisconnectGitHub();
  const [token, setToken] = useState("");
  const [showPatFallback, setShowPatFallback] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> {t("github.checkingConnection")}
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">
        <Github size={24} className="text-green-600" />
        <div className="flex-1">
          <p className="font-medium text-green-900">{t("github.connectedAs", { username: status.username })}</p>
          <p className="text-xs text-green-600">{t("github.integrationActive")}</p>
        </div>
        <button
          data-testid="github-disconnect-button"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="flex items-center gap-1 rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          <LogOut size={12} /> {t("github.disconnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="mb-1 flex items-center gap-2">
        <Github size={16} />
        <h3 className="text-sm font-medium">{t("github.connectGithub")}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("github.oauthPreferredDescription", {
          defaultValue: "Connect with GitHub OAuth for the smoothest experience. Personal access token fallback is still available for local setups.",
        })}
      </p>

      {status?.oauthConfigured && (
        <button
          type="button"
          data-testid="github-oauth-button"
          onClick={() => {
            oauthMutation.mutate(undefined, {
              onSuccess: ({ authUrl }) => {
                window.location.assign(authUrl);
              },
            });
          }}
          disabled={oauthMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {oauthMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {t("github.continueWithGitHub", { defaultValue: "Continue with GitHub" })}
        </button>
      )}

      <div className="rounded-lg border border-dashed p-3">
        <button
          type="button"
          onClick={() => setShowPatFallback((current) => !current)}
          className="flex w-full items-center justify-between text-left text-sm font-medium"
        >
          <span className="flex items-center gap-2"><Key size={15} /> {t("github.patFallback", { defaultValue: "Use personal access token instead" })}</span>
          {showPatFallback ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showPatFallback && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("github.tokenDescription")}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                data-testid="github-token-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("github.tokenPlaceholder")}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
              <button
                data-testid="github-connect-button"
                onClick={() => {
                  if (token.trim()) connectMutation.mutate(token.trim());
                }}
                disabled={!token.trim() || connectMutation.isPending}
                className="flex items-center gap-1 rounded bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {connectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
                {t("github.connect")}
              </button>
            </div>
          </div>
        )}
      </div>

      {!status?.oauthConfigured && (
        <p className="text-xs text-muted-foreground">
          {t("github.oauthNotConfigured", {
            defaultValue: "OAuth is not configured in this environment yet, so PAT mode is currently the available option.",
          })}
        </p>
      )}
    </div>
  );
}
