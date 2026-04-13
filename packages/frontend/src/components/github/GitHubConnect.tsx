import { useState } from "react";
import { useConnectGitHub, useDisconnectGitHub, useGitHubStatus } from "@/hooks/useGitHub";
import { Github, Loader2, LogOut, Key } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GitHubConnect() {
  const { t } = useTranslation();
  const { data: status, isLoading } = useGitHubStatus();
  const connectMutation = useConnectGitHub();
  const disconnectMutation = useDisconnectGitHub();
  const [token, setToken] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> {t("github.checkingConnection")}
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-green-50 p-4">
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
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Key size={16} />
        <h3 className="text-sm font-medium">{t("github.connectGithub")}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
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
  );
}
