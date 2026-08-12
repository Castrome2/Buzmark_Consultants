import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Loader2, Save, UserCog } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/use-auth";
import { AvatarCircle, useAvatarUpload } from "@/components/site/ProfileAvatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  first_name: z.string().trim().min(1, "Enter your first name").max(60),
  last_name: z.string().trim().max(60).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional(),
  company: z.string().trim().max(120).optional(),
});

export function ProfileForm() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const { input, open, uploading } = useAvatarUpload();

  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? user?.email ?? "",
      phone: profile.phone ?? "",
      company: profile.company ?? "",
    });
  }, [profile, user?.email]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase
        .from("profiles")
        .update(parsed.data)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your information has been updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (pw.next.length < 8) throw new Error("Password must be at least 8 characters");
      if (pw.next !== pw.confirm) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
    },
    onSuccess: () => {
      setPw({ next: "", confirm: "" });
      toast.success("Password updated — use it the next time you sign in");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card id="profile" className="p-6 shadow-card">
      {input}
      <div className="flex flex-wrap items-center gap-4">
        <AvatarCircle />
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <UserCog className="size-5 text-brand" /> My information
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep your contact details current — we use them for bookings and invoices.
          </p>
        </div>
        <Button variant="brandOutline" size="sm" className="ml-auto" onClick={open}>
          {uploading ? "Uploading…" : "Change photo"}
        </Button>
      </div>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pf">First name</Label>
          <Input id="pf" value={form.first_name} maxLength={60} onChange={(e) => set("first_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pl">Last name</Label>
          <Input id="pl" value={form.last_name} maxLength={60} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe">Email</Label>
          <Input id="pe" type="email" value={form.email} maxLength={255} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pp">Phone</Label>
          <Input id="pp" type="tel" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pc">Company</Label>
          <Input id="pc" value={form.company} maxLength={120} onChange={(e) => set("company", e.target.value)} />
        </div>
        <Button type="submit" variant="brand" className="h-11 sm:col-span-2" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save my information
        </Button>
      </form>

      <div className="mt-8 border-t border-border pt-6">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <KeyRound className="size-4 text-brand" /> Change password
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new password for your Buzmark client dashboard.
        </p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pw1">New password</Label>
            <div className="relative">
              <Input
                id="pw1"
                type={showPw ? "text" : "password"}
                value={pw.next}
                maxLength={72}
                autoComplete="new-password"
                onChange={(e) => setPw((v) => ({ ...v, next: e.target.value }))}
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm new password</Label>
            <Input
              id="pw2"
              type={showPw ? "text" : "password"}
              value={pw.confirm}
              maxLength={72}
              autoComplete="new-password"
              onChange={(e) => setPw((v) => ({ ...v, confirm: e.target.value }))}
            />
          </div>
          <Button
            type="submit"
            variant="brandOutline"
            className="h-11 sm:col-span-2"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />} Update
            password
          </Button>
        </form>
      </div>
    </Card>
  );
}
