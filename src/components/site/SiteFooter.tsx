import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Linkedin, Instagram, Facebook } from "lucide-react";
import { Logo } from "./Logo";
import { NAV_LINKS } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-gradient-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo variant="light" />
          <p className="mt-4 max-w-xs text-sm text-navy-foreground/70">
            Building brands. Growing businesses. Creating impact.
          </p>
          <div className="mt-5 flex gap-3">
            {[Linkedin, Instagram, Facebook].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Buzmark social profile"
                className="inline-flex size-9 items-center justify-center rounded-full border border-navy-foreground/20 text-navy-foreground/80 transition-colors hover:border-brand hover:text-brand"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-navy-foreground/75">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Services</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-navy-foreground/75">
            {[
              "Brand Strategy",
              "Digital Marketing",
              "Website Development",
              "Photography & Video",
              "Business Consulting",
            ].map((s) => (
              <li key={s}>
                <Link to="/services" className="transition-colors hover:text-brand">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-navy-foreground/75">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> Westlands, Nairobi, Kenya
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand" /> +254 700 000 000
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" /> hello@buzmark.com
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-navy-foreground/55 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Buzmark Marketing & Consulting Agency.</p>
          <p>Building Brands. Growing Businesses. Creating Impact.</p>
        </div>
      </div>
    </footer>
  );
}
