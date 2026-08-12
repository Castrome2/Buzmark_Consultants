import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/brand";
import { industryVisual } from "@/lib/industry-visuals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries We Serve | Buzmark Agency" },
      {
        name: "description",
        content:
          "Buzmark serves SMEs, schools, hospitals, NGOs, government, restaurants, hotels, financial institutions, manufacturing and real estate.",
      },
      { property: "og:title", content: "Industries We Serve | Buzmark" },
      {
        property: "og:description",
        content: "Sector-specific marketing and consulting expertise.",
      },
    ],
  }),
  component: Industries,
});

function Industries() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Industries"
        title="Sector expertise that shortens the learning curve"
        description="We already know your buyers, your regulators and your seasonality."
      />
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => {
            const visual = industryVisual(industry.name);
            const Icon = visual.icon;
            return (
              <Card
                key={industry.name}
                className="group flex flex-col overflow-hidden p-0 shadow-card transition-colors hover:border-brand/40"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={visual.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className={cn("absolute inset-0 bg-gradient-to-br", visual.tint)} />
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-brand">
                      <Icon className="size-5" />
                    </span>
                    <h2 className="text-lg font-bold text-navy-foreground">{industry.name}</h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-muted-foreground">{industry.note}</p>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <Button asChild variant="brand" size="pill">
            <Link to="/book">
              Discuss your sector <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}

