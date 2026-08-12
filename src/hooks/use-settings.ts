import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
] as const;

export type DashboardSettings = {
  theme: "light" | "dark";
  language: string;
  email_notifications: boolean;
};

const DEFAULTS: DashboardSettings = { theme: "light", language: "en", email_notifications: true };

export function useSettings() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DashboardSettings> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("theme, language, email_notifications")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        theme: data.theme === "dark" ? "dark" : "light",
        language: data.language ?? "en",
        email_notifications: data.email_notifications,
      };
    },
  });
}

export function useSaveSettings() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<DashboardSettings>) => {
      const current = qc.getQueryData<DashboardSettings>(["user-settings", user?.id]) ?? DEFAULTS;
      const next = { ...current, ...patch };
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: user!.id, ...next }, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["user-settings", user?.id], next),
  });
}

/** Applies the saved theme + language to the document while the dashboard is mounted. */
export function useApplyPreferences() {
  const { data } = useSettings();
  const theme = data?.theme ?? "light";
  const language = data?.language ?? "en";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    return () => {
      root.classList.remove("dark");
      root.dir = "ltr";
      root.lang = "en";
    };
  }, [theme, language]);

  return { theme, language };
}
