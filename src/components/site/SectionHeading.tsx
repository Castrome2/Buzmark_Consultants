import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  onNavy = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  onNavy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand">{eyebrow}</p>
      )}
      <h2
        className={cn(
          "mt-3 text-3xl font-extrabold sm:text-4xl",
          onNavy ? "text-navy-foreground" : "text-navy",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            onNavy ? "text-navy-foreground/70" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
