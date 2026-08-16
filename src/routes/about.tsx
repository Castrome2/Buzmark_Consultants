import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, Heart, Users } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Buzmark | Marketing & Consulting Agency in Nairobi" },
      {
        name: "description",
        content:
          "Buzmark is a full-service marketing and consulting agency helping businesses build brands, grow revenue and create lasting impact.",
      },
      { property: "og:title", content: "About Buzmark Agency" },
      {
        property: "og:description",
        content: "Our story, mission, vision and the team behind Buzmark.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  { icon: Target, title: "Results first", body: "Every campaign is tied to a business outcome." },
  { icon: Heart, title: "Integrity", body: "Honest reporting, honest pricing, honest advice." },
  { icon: Users, title: "Partnership", body: "We work as an extension of your internal team." },
  { icon: Eye, title: "Creativity", body: "Ideas that stand out in crowded markets." },
];

function About() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title="We build brands that businesses are proud of"
        description="Buzmark Marketing and Consulting Agency partners with ambitious organisations to shape identity, win attention and grow sustainably."
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Our story" title="Built by marketers, run like a partner" />
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              Buzmark started with a simple observation: most businesses do not need more vendors,
              they need one partner who understands brand, marketing and business strategy at the
              same time.
            </p>
            <p>
              Today we manage full marketing operations for companies across finance, travel,
              technology and agribusiness, alongside project work for SMEs, schools, hospitals,
              hotels, NGOs and government agencies.
            </p>
            <p>
              Our client portal gives every customer visibility into their orders, bookings and
              project timeline, so nothing lives in an inbox.
            </p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="border-brand/25 bg-brand/6 p-6">
            <h3 className="font-display text-lg font-bold text-navy">Mission</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              To help businesses grow through strategic branding, marketing and consulting that
              delivers measurable results.
            </p>
          </Card>
          <Card className="border-navy/15 bg-navy/5 p-6">
            <h3 className="font-display text-lg font-bold text-navy">Vision</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              To be the growth partner of choice for ambitious businesses across Africa.
            </p>
          </Card>
          <Card className="sm:col-span-2 p-6">
            <h3 className="font-display text-lg font-bold text-navy">Promise</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Building brands. Growing businesses. Creating impact with transparent reporting on
              every shilling invested.
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-sand py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading align="center" eyebrow="Core values" title="How we work" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <Card key={v.title} className="p-6 shadow-card">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground">
                  <v.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-navy">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
