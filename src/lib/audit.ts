import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Records a supervised activity entry for the signed-in user. Never throws. */
export async function logActivity(
  action: string,
  opts?: { path?: string; detail?: string | null },
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("activity_logs").insert({
      user_id: data.user.id,
      action,
      path: opts?.path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      detail: opts?.detail ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    /* auditing must never break the UI */
  }
}

/** Logs a page view on every route change (signed-in traffic supervision). */
export function usePageAudit() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    void logActivity("page_view", { path: pathname });
  }, [pathname]);
}
