import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Phone, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/audit";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/site/Logo";
import { AnimatedHeroBackdrop } from "@/components/site/AnimatedHeroBackdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Buzmark Consultants Client Portal" },
      {
        name: "description",
        content:
          "Sign in or create your Buzmark client account to book services, track orders and view your project timeline.",
      },
      { property: "og:title", content: "Buzmark Client Portal Sign In" },
      {
        property: "og:description",
        content: "Access your Buzmark dashboard: bookings, orders and live project status.",
      },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pl-9 pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-brand"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login")) {
        toast.error("Incorrect email or password. Please try again.");
        return;
      }
      toast.error(error.message);
      return;
    }
    void logActivity("sign_in");
    await routeByRole();
  }

  /** Admins land in the admin console, clients in their dashboard. */
  async function routeByRole() {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    toast.success(isAdmin ? "Welcome back, administrator" : "Welcome back to Buzmark Portal");
    navigate({ to: isAdmin ? "/admin" : "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({
      fullName,
      email: regEmail,
      phone,
      password: regPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void logActivity("sign_up");
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        toast.error(signInError.message);
        return;
      }
    }
    toast.success("Account created. Welcome to Buzmark Portal!");
    navigate({ to: "/dashboard" });
  }


  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    await routeByRole();
  }

  async function handleForgot() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AnimatedHeroBackdrop />
      <Card className="relative w-full max-w-md border-border/60 bg-card/95 p-7 shadow-brand backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <Logo withText={false} className="scale-125" />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-navy">
            BUZ<span className="text-brand">MARK</span> Portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your brand, orders and bookings in one place.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-7">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="you@company.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9"
                    required
                  />
                </div>
              </div>
              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" variant="brand" className="h-11 w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />} SIGN IN
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    placeholder="Jane Wanjiru"
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 pl-9"
                    maxLength={80}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="regEmail">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    placeholder="you@company.com"
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-11 pl-9"
                    maxLength={255}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    placeholder="+254 700 000 000"
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 pl-9"
                    maxLength={20}
                    required
                  />
                </div>
              </div>
              <PasswordField
                id="regPassword"
                label="Password"
                value={regPassword}
                onChange={setRegPassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirmPassword"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              <Button type="submit" variant="brand" className="h-11 w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />} CREATE ACCOUNT
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="h-11 w-full" onClick={handleGoogle}>
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
            />
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="font-semibold text-navy hover:text-brand">
            ← Back to buzmark.com
          </Link>
        </p>
      </Card>
    </div>
  );
}
