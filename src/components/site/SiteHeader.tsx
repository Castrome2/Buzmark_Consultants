import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-auth";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { AccountMenu } from "./AccountMenu";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useIdleLogout(!!user);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-navy",
                pathname === link.to && "bg-secondary text-navy",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="brand" size="sm">
                <Link to="/auth" search={{ tab: "register" }}>
                  Register
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user && <AccountMenu onNavigate={() => setOpen(false)} />}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!user && (
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="brand">
                <Link to="/auth" search={{ tab: "register" }} onClick={() => setOpen(false)}>
                  Register
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
