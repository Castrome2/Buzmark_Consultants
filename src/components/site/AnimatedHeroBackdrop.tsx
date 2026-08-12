import { useEffect, useState } from "react";
import hero1 from "@/assets/hero-1.jpg.asset.json";
import hero2 from "@/assets/hero-2.jpg.asset.json";
import hero3 from "@/assets/hero-3.jpg.asset.json";
import { cn } from "@/lib/utils";

const SLIDES = [
  { url: hero1.url, alt: "Buzmark team reviewing a campaign presentation" },
  { url: hero2.url, alt: "Brand identity boards, colour swatches and design work in progress" },
  { url: hero3.url, alt: "City skyline at dusk representing business growth" },
];

export function AnimatedHeroBackdrop({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden={false}>
      {SLIDES.map((slide, i) => (
        <img
          key={slide.url}
          src={slide.url}
          alt={slide.alt}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-[1600ms] ease-out",
            i === index ? "opacity-100 animate-ken-burns" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-navy opacity-[0.86]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,color-mix(in_oklab,var(--brand)_38%,transparent),transparent_55%)] opacity-70" />
    </div>
  );
}
