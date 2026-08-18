import { Download, FileText, Moon, ShieldCheck, Sun, Languages, Bell } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, useSettings, useSaveSettings } from "@/hooks/use-settings";

const DOWNLOADS = [
  {
    href: "/documents/buzmark-company-profile.html",
    file: "Buzmark-Consultants-Company-Profile.html",
    title: "Company profile",
    description: "Who we are, our services, industries and delivery approach.",
    icon: FileText,
  },
  {
    href: "/documents/buzmark-policy.html",
    file: "Buzmark-Consultants-Client-Policy.html",
    title: "Client & privacy policy",
    description: "Payment terms, deliverables, data protection and cancellations.",
    icon: ShieldCheck,
  },
];

export function SettingsPanel() {
  const { data } = useSettings();
  const save = useSaveSettings();
  const theme = data?.theme ?? "light";

  const set = (patch: Parameters<typeof save.mutate>[0]) =>
    save.mutate(patch, {
      onSuccess: () => toast.success("Settings saved"),
      onError: (e: Error) => toast.error(e.message),
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="font-display text-lg font-bold text-navy">Appearance</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how your dashboard looks. Your choice is saved to your account.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["light", "dark"] as const).map((mode) => {
            const Icon = mode === "light" ? Sun : Moon;
            const active = theme === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => set({ theme: mode })}
                className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                  active ? "border-brand bg-brand/8" : "border-border hover:bg-secondary"
                }`}
              >
                <Icon className={`size-5 ${active ? "text-brand" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold text-navy">
                  {mode === "light" ? "Light mode" : "Dark mode"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {mode === "light" ? "Bright, high contrast" : "Easier on the eyes at night"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
          <Languages className="size-5 text-brand" /> Language
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferred language for your dashboard and the updates we send you.
        </p>
        <div className="mt-5">
          <Select value={data?.language ?? "en"} onValueChange={(v) => set({ language: v })}>
            <SelectTrigger aria-label="Dashboard language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Bell className="size-4 text-brand" /> Email notifications
            </p>
            <p className="text-xs text-muted-foreground">
              Receive an email when your order or payment status changes.
            </p>
          </div>
          <Switch
            checked={data?.email_notifications ?? true}
            onCheckedChange={(v) => set({ email_notifications: v })}
            aria-label="Email notifications"
          />
        </div>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
          <Download className="size-5 text-brand" /> Downloads
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Grab our company documents for your records or procurement team.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {DOWNLOADS.map((d) => (
            <div
              key={d.href}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-brand/12 text-brand">
                  <d.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                </div>
              </div>
              <Button asChild variant="brand" size="sm">
                <a href={d.href} download={d.file}>
                  <Download /> Download
                </a>
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
