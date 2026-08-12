import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LayoutDashboard, LogOut, Camera, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useIsAdmin } from "@/hooks/use-auth";
import { AvatarCircle, useAvatarUpload } from "./ProfileAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { input, open, uploading } = useAvatarUpload();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) return null;

  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.email ||
    user.email ||
    "My account";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      {input}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <AvatarCircle />
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-navy">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {profile?.email ?? user.email}
            </span>
            <span className="mt-1 w-fit rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              {isAdmin ? "Administrator" : "Client"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" onClick={onNavigate}>
                <Shield /> Admin console
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/dashboard" onClick={onNavigate}>
              <LayoutDashboard /> Client dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard" hash="profile" onClick={onNavigate}>
              <User /> My information
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); open(); }}>
            <Camera /> {uploading ? "Uploading…" : "Change photo"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => void signOut()}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
