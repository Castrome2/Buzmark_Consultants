import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-navy py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,color-mix(in_oklab,var(--brand)_32%,transparent),transparent_58%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold text-navy-foreground sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-lg text-navy-foreground/75">{description}</p>
        )}
      </div>
    </section>
  );
}
