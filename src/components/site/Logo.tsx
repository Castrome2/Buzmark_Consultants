import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "dark",
  withText = true,
}: {
  className?: string;
  variant?: "dark" | "light";
  withText?: boolean;
}) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={logo.url}
        alt="Buzmark Marketing and Consulting Consultants logo"
        className={cn(
          "h-10 w-10 rounded-md object-cover object-center",
          variant === "light" && "bg-navy-foreground",
        )}
        style={{ objectPosition: "50% 35%" }}
      />
      {withText && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-lg font-extrabold tracking-tight",
              variant === "light" ? "text-navy-foreground" : "text-navy",
            )}
          >
            BUZ<span className="text-brand">MARK</span>
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              variant === "light" ? "text-navy-foreground/60" : "text-muted-foreground",
            )}
          >
            Consultants
          </span>
        </span>
      )}
    </Link>
  );
}
