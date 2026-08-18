import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Quote, Star, ExternalLink } from "lucide-react";
import { listCompanies, listTestimonials } from "@/lib/data.functions";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Card } from "@/components/ui/card";

const clientsQuery = queryOptions({
  queryKey: ["clients-page"],
  queryFn: async () => {
    const [companies, testimonials] = await Promise.all([listCompanies(), listTestimonials()]);
    return { companies, testimonials };
  },
});

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients & Managed Companies | Buzmark Consultants" },
      {
        name: "description",
        content:
          "Meet the companies Buzmark manages day to day and read what our clients say about working with us.",
      },
      { property: "og:title", content: "Buzmark Clients & Managed Companies" },
      { property: "og:description", content: "Brands we run and clients who trust us." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQuery),
  component: Clients,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <p className="p-24 text-center" role="alert">
        {error.message}
      </p>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <p className="p-24 text-center">Nothing here yet.</p>
    </SiteLayout>
  ),
});

function Clients() {
  const { data } = useSuspenseQuery(clientsQuery);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Clients"
        title="Companies we manage and clients we serve"
        description="From full marketing management to focused project work."
      />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Managed companies" title="Brands under Buzmark management" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {data.companies.map((company) => (
            <Card key={company.id} className="p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-navy font-display text-xl font-extrabold text-navy-foreground">
                  {company.name.charAt(0)}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-navy">{company.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-brand">{company.industry}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{company.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {company.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-navy/6 px-2.5 py-1 text-[11px] font-medium text-navy"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                >
                  Visit website <ExternalLink className="size-3.5" />
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-sand py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading align="center" eyebrow="Testimonials" title="Client feedback" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {data.testimonials.map((t) => (
              <Card key={t.id} className="flex flex-col p-6 shadow-card">
                <Quote className="size-7 text-brand/40" />
                <p className="mt-3 flex-1 text-sm text-foreground">“{t.quote}”</p>
                <div className="mt-4 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-brand text-brand" />
                  ))}
                </div>
                <p className="mt-2 text-sm font-bold text-navy">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.role} · {t.company}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
