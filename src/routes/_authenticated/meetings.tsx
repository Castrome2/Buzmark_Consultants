import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineTrack } from "@/components/orders/PipelineTrack";
import { formatDate, formatDateTime, labelize, priceLabel } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Pipelines | Buzmark Agency" },
      {
        name: "description",
        content:
          "Track every Buzmark consultation meeting you booked and the pipeline that follows it.",
      },
      { property: "og:title", content: "Buzmark Meeting Pipelines" },
      { property: "og:description", content: "Your booked meetings and their progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Meetings,
});

function Meetings() {
  const { user } = useSession();
  const qc = useQueryClient();

  const bookingsQ = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ordersQ = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, booking_id, stage, amount, amount_paid, category")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meeting cancelled and removed");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookings = bookingsQ.data ?? [];

  return (
    <SiteLayout>
      <section className="bg-gradient-navy py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <CalendarDays className="size-3" /> Meeting pipelines
          </p>
          <h1 className="mt-4 text-3xl font-extrabold text-navy-foreground">Your booked meetings</h1>
          <p className="mt-2 max-w-xl text-navy-foreground/70">
            Meeting pipelines live here — separate from your service order pipelines.
          </p>
          <Button asChild variant="onNavy" size="sm" className="mt-5">
            <Link to="/dashboard" search={{ tab: "timeline" }}>
              <ArrowLeft /> Back to dashboard
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-4 px-4 py-12 sm:px-6">
        {bookingsQ.isLoading && <Skeleton className="h-40 w-full" />}
        {!bookingsQ.isLoading && !bookings.length && (
          <Card className="p-12 text-center text-muted-foreground">
            No meetings booked yet.{" "}
            <Link
              to="/dashboard"
              search={{ tab: "book" }}
              className="font-semibold text-brand hover:underline"
            >
              Book a meeting
            </Link>
          </Card>
        )}
        {bookings.map((b) => {
          const order = (ordersQ.data ?? []).find((o) => o.booking_id === b.id);
          return (
            <Card key={b.id} className="space-y-4 p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-navy">{b.service_category}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.booking_date)} at {b.booking_time} · {b.staff_preference}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Booked {formatDateTime(b.created_at)} ·{" "}
                    {priceLabel(b.service_category, Number(order?.amount ?? 0))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {labelize(b.status)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={deleteBooking.isPending}
                    onClick={() => {
                      if (confirm("Cancel and delete this meeting?")) deleteBooking.mutate(b.id);
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              </div>
              {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
              <PipelineTrack stage={order?.stage ?? "booking"} />
            </Card>
          );
        })}
      </section>
    </SiteLayout>
  );
}
