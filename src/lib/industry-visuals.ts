import {
  Building2,
  GraduationCap,
  Stethoscope,
  HeartHandshake,
  Landmark,
  UtensilsCrossed,
  BedDouble,
  Banknote,
  Factory,
  Home,
  type LucideIcon,
} from "lucide-react";
import hero1 from "@/assets/hero-1.jpg.asset.json";
import hero2 from "@/assets/hero-2.jpg.asset.json";
import hero3 from "@/assets/hero-3.jpg.asset.json";

type IndustryVisual = { icon: LucideIcon; image: string; tint: string };

const DEFAULT: IndustryVisual = {
  icon: Building2,
  image: hero3.url,
  tint: "from-navy/85 via-navy/60 to-brand/45",
};

export const INDUSTRY_VISUALS: Record<string, IndustryVisual> = {
  "Businesses & SMEs": {
    icon: Building2,
    image: hero1.url,
    tint: "from-navy/85 via-navy/55 to-brand/45",
  },
  Schools: { icon: GraduationCap, image: hero2.url, tint: "from-navy/80 via-brand/45 to-navy/70" },
  Hospitals: { icon: Stethoscope, image: hero3.url, tint: "from-navy/85 via-navy/50 to-navy/25" },
  NGOs: { icon: HeartHandshake, image: hero1.url, tint: "from-brand/65 via-navy/70 to-navy/85" },
  Government: { icon: Landmark, image: hero3.url, tint: "from-navy/90 via-navy/60 to-navy/35" },
  Restaurants: {
    icon: UtensilsCrossed,
    image: hero2.url,
    tint: "from-brand/60 via-navy/70 to-navy/85",
  },
  Hotels: { icon: BedDouble, image: hero3.url, tint: "from-navy/80 via-navy/50 to-brand/50" },
  "Financial Institutions": {
    icon: Banknote,
    image: hero1.url,
    tint: "from-navy/90 via-navy/65 to-brand/40",
  },
  Manufacturing: { icon: Factory, image: hero2.url, tint: "from-navy/85 via-navy/60 to-navy/40" },
  "Real Estate": { icon: Home, image: hero3.url, tint: "from-navy/75 via-navy/55 to-brand/55" },
};

export function industryVisual(name: string): IndustryVisual {
  return INDUSTRY_VISUALS[name] ?? DEFAULT;
}
