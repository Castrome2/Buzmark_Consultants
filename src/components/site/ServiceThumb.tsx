import { serviceVisual } from "@/lib/service-visuals";
import { cn } from "@/lib/utils";

/**
 * Small photo + icon badge for a service, picked from the service title/category
 * so every listed service reads visually at a glance.
 */
export function ServiceThumb({
  category,
  title,
  size = "md",
  className,
}: {
  category: string | null | undefined;
  title?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const visual = serviceVisual(category ?? "");
  const Icon = visual.icon;
  const box = size === "sm" ? "size-10" : size === "lg" ? "size-20" : "size-14";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-6";

  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-xl", box, className)}
      aria-hidden="true"
      title={title ?? category ?? undefined}
    >
      <img src={visual.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      <span className={cn("absolute inset-0 bg-gradient-to-br", visual.tint)} />
      <span className="absolute inset-0 flex items-center justify-center text-navy-foreground">
        <Icon className={icon} />
      </span>
    </span>
  );
}
