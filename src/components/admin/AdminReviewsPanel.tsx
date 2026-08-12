import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/brand";

type Client = { id: string; first_name: string | null; last_name: string | null; email: string | null };

/** Admin slot showing every client review submitted from the client dashboard. */
export function AdminReviewsPanel({ clients }: { clients: Client[] }) {
  const reviewsQ = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = reviewsQ.data ?? [];
  const average = rows.length
    ? rows.reduce((sum, r) => sum + Number(r.rating), 0) / rows.length
    : 0;

  function nameOf(id: string) {
    const c = clients.find((x) => x.id === id);
    return [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Client";
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Average rating
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy">
            {average ? average.toFixed(1) : "—"} / 5
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Reviews received
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy">{rows.length}</p>
        </Card>
      </div>

      {reviewsQ.isLoading && <Skeleton className="h-48 w-full" />}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} className="space-y-2 p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-navy">{nameOf(r.user_id)}</p>
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < Number(r.rating)
                        ? "size-4 fill-brand text-brand"
                        : "size-4 text-muted-foreground/40"
                    }
                  />
                ))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{r.comment || "No comment provided."}</p>
            <p className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}</p>
          </Card>
        ))}
      </div>

      {!reviewsQ.isLoading && !rows.length && (
        <Card className="p-12 text-center text-muted-foreground">No client reviews yet.</Card>
      )}
    </div>
  );
}
