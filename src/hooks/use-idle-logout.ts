import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const IDLE_MS = 300_000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "focus",
] as const;

/** Signs the user out after 5 minutes of inactivity. */
export function useIdleLogout(enabled: boolean) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let done = false;

    async function logout() {
      if (done) return;
      done = true;
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.info("Signed out after 5 minutes of inactivity. Please sign in again.");
      navigate({ to: "/auth", replace: true });
    }

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", reset);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [enabled, navigate, queryClient]);
}
