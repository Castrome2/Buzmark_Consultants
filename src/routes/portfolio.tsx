import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/data.functions";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const projectsQuery = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio & Case Studies | Buzmark Agency" },
      {
        name: "description",
        content:
          "Branding, campaign, web and content case studies from Buzmark — the problem, our solution and the measurable results.",
      },
      { property: "og:title", content: "Buzmark Portfolio & Case Studies" },
      { property: "og:description", content: "Selected work with measurable outcomes." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: Portfolio,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <p className="p-24 text-center" role="alert">
        {error.message}
      </p>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <p className="p-24 text-center">No projects yet.</p>
    </SiteLayout>
  ),
});

function Portfolio() {
  const { data: projects } = useSuspenseQuery(projectsQuery);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Portfolio"
        title="Work that moved the numbers"
        description="Case studies across branding, campaigns, websites and content production."
      />
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-20 sm:px-6">
        {projects.map((project) => (
          <Card key={project.id} className="grid gap-6 p-6 shadow-card lg:grid-cols-[1fr_2fr]">
            <div>
              <Badge className="rounded-full bg-brand/12 text-brand">{project.category}</Badge>
              <h2 className="mt-3 text-2xl font-bold text-navy">{project.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.client} · {project.industry}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Problem
                </h3>
                <p className="mt-1.5 text-sm text-foreground">{project.problem}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Solution
                </h3>
                <p className="mt-1.5 text-sm text-foreground">{project.solution}</p>
              </div>
              <div className="rounded-lg bg-brand/8 p-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-brand">Results</h3>
                <p className="mt-1.5 text-sm font-semibold text-navy">{project.results}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </SiteLayout>
  );
}
