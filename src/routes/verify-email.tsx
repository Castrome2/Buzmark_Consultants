import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { MailCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { AnimatedHeroBackdrop } from "@/components/site/AnimatedHeroBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify your email | Buzmark Consultants" },
      {
        name: "description",
        content:
          "Confirm your email address to activate your Buzmark Consultants client account and open your dashboard.",
      },
      { property: "og:title", content: "Verify your email | Buzmark Consultants" },
      {
        property: "og:description",
        content: "Confirm your email to activate your Buzmark Consultants client account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!stopped && data.user?.email_confirmed_at) {
        toast.success("Email verified — welcome to Buzmark Consultants!");
        navigate({ to: "/dashboard" });
      }
    }

    void check();
    const timer = setInterval(check, 4000);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user?.email_confirmed_at) navigate({ to: "/dashboard" });
    });

    return () => {
      stopped = true;
      clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function resend() {
    if (!email) {
      toast.error("Go back to sign up and enter your email again.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent again.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AnimatedHeroBackdrop />
      <Card className="relative w-full max-w-md border-border/60 bg-card/95 p-8 text-center shadow-brand backdrop-blur-xl">
        <div className="flex flex-col items-center">
          <Logo withText={false} className="scale-125" />
          <div className="mt-6 flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-navy">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link{email ? " to " : ""}
            {email ? <span className="font-semibold text-navy">{email}</span> : ""}. Open it and
            you'll be taken straight to your dashboard.
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Waiting for confirmation…
          </p>

          <Button
            variant="brand"
            className="mt-6 h-11 w-full"
            onClick={resend}
            disabled={resending}
          >
            {resending && <Loader2 className="animate-spin" />} Resend verification email
          </Button>

          <p className="mt-6 text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-navy hover:text-brand">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
