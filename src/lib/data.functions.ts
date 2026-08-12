import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string | null;
  items: string[];
  price_from: number | null;
  icon: string | null;
};

export type CompanyRow = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  description: string | null;
  website: string | null;
  services: string[];
};

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  client: string | null;
  industry: string | null;
  problem: string | null;
  solution: string | null;
  results: string | null;
  tech: string[];
};

export type TestimonialRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  quote: string;
  rating: number;
};

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("services")
    .select("id, slug, title, category, summary, description, items, price_from, icon")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceRow[];
});

export const listCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("companies")
    .select("id, slug, name, industry, description, website, services")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CompanyRow[];
});

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("portfolio_projects")
    .select("id, slug, title, category, client, industry, problem, solution, results, tech")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectRow[];
});

export const listTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("testimonials")
    .select("id, name, company, role, quote, rating")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as TestimonialRow[];
});
