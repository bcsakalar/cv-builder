import { useState, type FormEvent } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { rootRoute } from "../__root";
import { useLogin, useRegister } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth.store";

type AuthMode = "login" | "register";

interface AuthFormState {
  name: string;
  email: string;
  password: string;
}

const INITIAL_FORM: AuthFormState = {
  name: "",
  email: "",
  password: "",
};

export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const login = useLogin();
  const register = useRegister();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const loginSchema = z.object({
    email: z.string().email(t("common.invalidEmail")),
    password: z.string().min(8, t("auth.passwordMin")),
  });
  const registerSchema = loginSchema.extend({
    name: z.string().trim().min(2, t("auth.nameMin")),
  });

  const isSubmitting = login.isPending || register.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (mode === "login") {
      const parsed = loginSchema.safeParse({ email: form.email, password: form.password });

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? t("auth.invalidForm"));
        return;
      }

      await login.mutateAsync(parsed.data);
    } else {
      const parsed = registerSchema.safeParse(form);

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? t("auth.invalidForm"));
        return;
      }

      await register.mutateAsync(parsed.data);
    }

    await navigate({ to: "/" });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_28%)]" />
      <section className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-xl backdrop-blur md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {t("auth.kicker")}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance">
            {t("auth.title")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            {t("auth.subtitle")}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeatureCard title={t("auth.featureOneTitle")} description={t("auth.featureOneDesc")} />
            <FeatureCard title={t("auth.featureTwoTitle")} description={t("auth.featureTwoDesc")} />
            <FeatureCard title={t("auth.featureThreeTitle")} description={t("auth.featureThreeDesc")} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-xl md:p-10">
          <div className="flex rounded-full bg-muted p-1">
            <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
              {t("auth.signIn")}
            </ModeButton>
            <ModeButton active={mode === "register"} onClick={() => setMode("register")}>
              {t("auth.createAccount")}
            </ModeButton>
          </div>

          <div className="mt-8 space-y-2">
            <h2 className="text-2xl font-semibold">
              {mode === "login" ? t("auth.welcomeBack") : t("auth.getStarted")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? t("auth.signInHint") : t("auth.registerHint")}
            </p>
            {user && <p className="text-xs text-info">{t("auth.activeSession", { name: user.name })}</p>}
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <Field
                id="name"
                label={t("auth.name")}
                autoComplete="name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              />
            )}

            <Field
              id="email"
              label={t("auth.email")}
              type="email"
              autoComplete={mode === "login" ? "username" : "email"}
              spellCheck={false}
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            />

            <Field
              id="password"
              label={t("auth.password")}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            />

            {formError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" aria-live="polite">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t("auth.submitting")
                : mode === "login"
                  ? t("auth.signIn")
                  : t("auth.createAccount")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  spellCheck?: boolean;
}

function Field({ id, label, value, onChange, type = "text", autoComplete, spellCheck }: FieldProps) {
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border bg-background px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

interface ModeButtonProps {
  active: boolean;
  children: string;
  onClick: () => void;
}

function ModeButton({ active, children, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}