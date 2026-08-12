import {
  Palette,
  Megaphone,
  Camera,
  Globe,
  Briefcase,
  Video,
  GraduationCap,
  Users,
  Mic,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import hero1 from "@/assets/hero-1.jpg.asset.json";
import hero2 from "@/assets/hero-2.jpg.asset.json";
import hero3 from "@/assets/hero-3.jpg.asset.json";

type Visual = { icon: LucideIcon; image: string; tint: string };

const DEFAULT: Visual = {
  icon: Sparkles,
  image: hero3.url,
  tint: "from-navy/85 via-navy/60 to-brand/45",
};

export const SERVICE_VISUALS: Record<string, Visual> = {
  Branding: { icon: Palette, image: hero2.url, tint: "from-navy/85 via-navy/55 to-brand/50" },
  Marketing: { icon: Megaphone, image: hero1.url, tint: "from-brand/70 via-navy/70 to-navy/85" },
  Photography: { icon: Camera, image: hero2.url, tint: "from-navy/80 via-navy/50 to-navy/20" },
  Website: { icon: Globe, image: hero3.url, tint: "from-navy/85 via-navy/55 to-brand/40" },
  Consulting: { icon: Briefcase, image: hero1.url, tint: "from-navy/90 via-navy/60 to-navy/35" },
  Videography: { icon: Video, image: hero1.url, tint: "from-brand/60 via-navy/75 to-navy/90" },
  Training: {
    icon: GraduationCap,
    image: hero2.url,
    tint: "from-navy/80 via-brand/45 to-navy/70",
  },
  "Team Building": { icon: Users, image: hero3.url, tint: "from-navy/75 via-navy/55 to-brand/55" },
  "Event & MC": { icon: Mic, image: hero1.url, tint: "from-brand/65 via-navy/70 to-navy/85" },
};

export function serviceVisual(category: string): Visual {
  return SERVICE_VISUALS[category] ?? DEFAULT;
}
