import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Check, ArrowRight } from "lucide-react";
import { listServices } from "@/lib/data.functions";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { serviceVisual } from "@/lib/service-visuals";
import { cn } from "@/lib/utils";

const servicesQuery = queryOptions({ queryKey: ["services"], queryFn: () => listServices() });

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services | Branding, Marketing, Web & Consulting — Buzmark" },
      {
        name: "description",
        content:
          "Explore Buzmark services: brand strategy, digital marketing, websites, photography, videography, printing, consulting, training and team building.",
      },
      { property: "og:title", content: "Buzmark Services" },
      {
        property: "og:description",
        content: "Twelve growth disciplines delivered by one senior team.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  component: Services,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <p className="p-24 text-center" role="alert">
        {error.message}
      </p>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <p className="p-24 text-center">No services found.</p>
    </SiteLayout>
  ),
});

function Services() {
  const { data: services } = useSuspenseQuery(servicesQuery);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Services"
        title="Everything you need to build and grow a brand"
        description="Pick a single service or combine them into a retainer. Add services to your cart in the client portal and we'll quote within 24 hours."
      />
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const visual = serviceVisual(service.category);
            const Icon = visual.icon;
            return (
            <Card key={service.id} className="flex flex-col overflow-hidden p-0 shadow-card">
              <div className="relative h-36 overflow-hidden">
                <img
                  src={visual.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className={cn("absolute inset-0 bg-gradient-to-br", visual.tint)} />
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-brand">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-navy-foreground">
                    {service.category}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-5">
              <h2 className="text-xl font-bold text-navy">{service.title}</h2>

              <p className="mt-2 text-sm text-muted-foreground">{service.summary}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {service.items.map((item) => (
                  <li key={item} className="flex gap-2 text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="brand" size="sm">
                    <Link to="/dashboard" search={{ tab: "book", service: service.category }}>
                      Request — book meeting <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild variant="brandOutline" size="sm">
                    <Link to="/dashboard" search={{ tab: "cart", add: service.id }}>
                      Add this service
                    </Link>
                  </Button>
                </div>
              </div>
              </div>
            </Card>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
