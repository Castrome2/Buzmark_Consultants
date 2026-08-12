import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, Quote, Star, Sparkles, CheckCircle2 } from "lucide-react";
import {
  listServices,
  listCompanies,
  listProjects,
  listTestimonials,
} from "@/lib/data.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AnimatedHeroBackdrop } from "@/components/site/AnimatedHeroBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATS } from "@/lib/brand";

const homeQuery = queryOptions({
  queryKey: ["home-content"],
  queryFn: async () => {
    const [services, companies, projects, testimonials] = await Promise.all([
      listServices(),
      listCompanies(),
      listProjects(),
      listTestimonials(),
    ]);
    return { services, companies, projects, testimonials };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buzmark Agency | Branding, Marketing & Business Consulting" },
      {
        name: "description",
        content:
          "Buzmark Agency helps businesses build memorable brands, run winning marketing campaigns and grow through expert consulting. Book a free discovery call.",
      },
      { property: "og:title", content: "Buzmark Agency | Your Growth Partner" },
      {
        property: "og:description",
        content:
          "Branding, marketing, websites, content and business consulting for ambitious companies.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center" role="alert">
        <h1 className="text-2xl font-bold text-navy">This page didn&apos;t load</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">Nothing here yet.</div>
    </SiteLayout>
  ),
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <AnimatedHeroBackdrop />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-32">
          <div>
            <Badge
              variant="outline"
              className="rounded-full border-brand/40 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand"
            >
              <Sparkles className="mr-1.5 size-3" /> Buzmark Agency
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-navy-foreground sm:text-6xl">
              Your Growth Partner in{" "}
              <span className="text-gradient-brand">Branding, Marketing</span> &amp; Business
              Consulting
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-foreground/75">
              We help businesses build memorable brands, execute winning marketing strategies,
              manage digital presence, and accelerate growth through expert consulting.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="brand" size="pill">
                <Link to="/book">
                  Book Consultation <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="onNavy" size="pill">
                <Link to="/services">Explore Services</Link>
              </Button>
            </div>
            <dl className="mt-14 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="font-display text-3xl font-extrabold text-brand">{s.value}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-navy-foreground/60">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hidden lg:flex lg:items-center">
            <Card className="animate-float-slow w-full border-navy-foreground/15 bg-navy-foreground/8 p-6 text-navy-foreground backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand">
                Why Buzmark
              </p>
              <ul className="mt-5 space-y-4 text-sm">
                {[
                  "One partner for brand, marketing, web and consulting",
                  "Senior creative and strategy talent on every account",
                  "Transparent monthly reporting and campaign dashboards",
                  "A client portal for orders, bookings and project history",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="text-navy-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="What we do"
            title="Services built for measurable growth"
            description="Twelve disciplines under one roof, delivered by specialists who work as one team."
          />
          <Button asChild variant="brandOutline">
            <Link to="/services">
              View all services <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.services.slice(0, 6).map((service) => (
            <Card
              key={service.id}
              className="group relative overflow-hidden border-border p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                {service.category}
              </span>
              <h3 className="mt-3 text-xl font-bold text-navy">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.summary}
              </p>
              <span className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-brand transition-transform group-hover:scale-x-100" />
            </Card>
          ))}
        </div>
      </section>

      {/* MANAGED COMPANIES */}
      <section className="bg-gradient-navy py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            onNavy
            eyebrow="Companies we manage"
            title="Brands we run day to day"
            description="Buzmark manages full marketing and brand operations for companies across finance, travel, technology and agribusiness."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.companies.map((company) => (
              <Card
                key={company.id}
                className="border-navy-foreground/12 bg-navy-foreground/6 p-6 text-navy-foreground backdrop-blur transition-colors hover:border-brand/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-brand font-display text-lg font-extrabold text-brand-foreground">
                    {company.name.charAt(0)}
                  </span>
                  <div>
                    <h3 className="font-bold">{company.name}</h3>
                    <p className="text-xs text-navy-foreground/60">{company.industry}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-navy-foreground/75">{company.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {company.services.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-navy-foreground/20 px-2.5 py-0.5 text-[11px] text-navy-foreground/70"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <Link
                  to="/clients"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                >
                  View profile <ArrowRight className="size-3.5" />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Portfolio"
          title="Selected work and case studies"
          description="Real problems, deliberate solutions, measurable results."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((project) => (
            <Card key={project.id} className="overflow-hidden border-border shadow-card">
              <div className="bg-gradient-navy px-6 py-8">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
                  {project.category}
                </span>
                <h3 className="mt-2 text-lg font-bold text-navy-foreground">{project.title}</h3>
                <p className="text-xs text-navy-foreground/60">
                  {project.client} · {project.industry}
                </p>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-navy">Problem: </span>
                  {project.problem}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-navy">Solution: </span>
                  {project.solution}
                </p>
                <p className="rounded-lg bg-brand/8 p-3 font-semibold text-brand">
                  {project.results}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-sand py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            align="center"
            eyebrow="Testimonials"
            title="What our clients say"
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {data.testimonials.map((t) => (
              <Card key={t.id} className="flex flex-col border-border bg-card p-6 shadow-card">
                <Quote className="size-7 text-brand/40" />
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground">“{t.quote}”</p>
                <div className="mt-5 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-brand text-brand" />
                  ))}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-navy">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-navy py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,color-mix(in_oklab,var(--brand)_45%,transparent),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-navy-foreground sm:text-4xl">
            Ready to grow your business?
          </h2>
          <p className="mt-4 text-lg text-navy-foreground/75">
            Book a free discovery call and we&apos;ll map the fastest route to your next stage of
            growth.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="brand" size="pill">
              <Link to="/book">Schedule Meeting</Link>
            </Button>
            <Button asChild variant="onNavy" size="pill">
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
