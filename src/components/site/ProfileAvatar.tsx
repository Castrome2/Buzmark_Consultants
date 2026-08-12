import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function useAvatarUrl(path?: string | null) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Visual-only avatar circle for the current user. */
export function AvatarCircle({ className }: { className?: string }) {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const { data: url } = useAvatarUrl(profile?.avatar_url);

  const initials = (
    profile?.first_name?.[0] ??
    profile?.email?.[0] ??
    user?.email?.[0] ??
    "?"
  ).toUpperCase();

  return (
    <Avatar className={cn("size-10 ring-2 ring-brand/40", className)}>
      {url && <AvatarImage src={url} alt="Profile photo" />}
      <AvatarFallback className="bg-gradient-brand text-sm font-bold text-brand-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/** Hook that provides a hidden file input + trigger for uploading the avatar. */
export function useAvatarUpload() {
  const { user } = useSession();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["avatar-url"] });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const input = (
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
  );

  return { input, open: () => inputRef.current?.click(), uploading };
}

/** Standalone clickable avatar that uploads a photo. */
export function ProfileAvatar({ className }: { className?: string }) {
  const { user } = useSession();
  const { input, open, uploading } = useAvatarUpload();
  if (!user) return null;

  return (
    <>
      {input}
      <button
        type="button"
        aria-label="Upload profile photo"
        title="Upload profile photo"
        onClick={open}
        className={cn(
          "group relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition hover:ring-brand",
          className,
        )}
      >
        <AvatarCircle />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/60 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="size-4 animate-spin text-navy-foreground" />
          ) : (
            <Camera className="size-4 text-navy-foreground" />
          )}
        </span>
      </button>
    </>
  );
}
