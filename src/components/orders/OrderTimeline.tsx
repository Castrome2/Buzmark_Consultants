import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Clock, Tag, CalendarClock, Coins, FileText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_STEPS, EVENT_LABELS, labelize, formatDateTime } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type TimelineOrder = {
  id: string;
  order_number: string;
  title: string;
  category: string;
  status: string;
  deadline: string | null;
  created_at: string;
};

const EVENT_ICONS: Record<string, typeof Tag> = {
  created: FileText,
  status_changed: Clock,
  category_changed: Tag,
  deadline_changed: CalendarClock,
  amount_changed: Coins,
};

export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed" || status === "sold"
      ? "bg-success/12 text-success border-success/30"
      : status === "cancelled"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : status === "in_progress"
          ? "bg-brand/12 text-brand border-brand/30"
          : status === "closed"
            ? "bg-navy/10 text-navy border-navy/25"
            : "bg-warning/15 text-foreground border-warning/40";
  return (
    <Badge variant="outline" className={cn("rounded-full font-semibold", tone)}>
      {labelize(status)}
    </Badge>
  );
}

const STEP_TONE: Record<
  string,
  { line: string; activeCircle: string; doneCircle: string; text: string }
> = {
  pending: {
    line: "bg-warning",
    activeCircle: "border-warning bg-warning/20 text-foreground",
    doneCircle: "border-warning bg-warning text-navy",
    text: "text-warning",
  },
  in_progress: {
    line: "bg-brand",
    activeCircle: "border-brand bg-brand/15 text-brand",
    doneCircle: "border-brand bg-brand text-brand-foreground",
    text: "text-brand",
  },
  sold: {
    line: "bg-navy",
    activeCircle: "border-navy bg-navy/15 text-navy",
    doneCircle: "border-navy bg-navy text-navy-foreground",
    text: "text-navy",
  },
  completed: {
    line: "bg-success",
    activeCircle: "border-success bg-success/15 text-success",
    doneCircle: "border-success bg-success text-navy-foreground",
    text: "text-success",
  },
  closed: {
    line: "bg-muted-foreground",
    activeCircle: "border-muted-foreground bg-muted text-muted-foreground",
    doneCircle: "border-muted-foreground bg-muted-foreground text-background",
    text: "text-muted-foreground",
  },
};

function Stepper({ status }: { status: string }) {
  const cancelled = status === "cancelled";
  const currentIndex = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);

  return (
    <div className="rounded-xl border border-border bg-sand p-4">
      <div className="flex items-start justify-between gap-1">
        {ORDER_STEPS.map((step, i) => {
          const done = !cancelled && i < currentIndex;
          const active = !cancelled && i === currentIndex;
          const tone = STEP_TONE[step];
          return (
            <div key={step} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0 ? "opacity-0" : done || active ? tone.line : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done && tone.doneCircle,
                    active && cn(tone.activeCircle, "ring-4 ring-current/15"),
                    !done && !active && "border-border bg-card text-muted-foreground",
                    cancelled && "border-destructive/40 bg-card text-destructive/50",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : cancelled ? (
                    <XCircle className="size-4" />
                  ) : (
                    <Circle className={cn("size-2.5", active && "fill-current")} />
                  )}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === ORDER_STEPS.length - 1 ? "opacity-0" : done ? tone.line : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 text-[11px] font-semibold uppercase tracking-wide",
                  active || done ? tone.text : "text-muted-foreground",
                  active && "font-extrabold",
                )}
              >
                {labelize(step)}
              </span>
            </div>
          );
        })}
      </div>

      {cancelled && (
        <p className="mt-3 text-center text-xs font-semibold text-destructive">
          This order was cancelled.
        </p>
      )}
    </div>
  );
}

export function OrderTimeline({ order }: { order: TimelineOrder }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["order-events", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-navy p-4 text-navy-foreground">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
            Order {order.order_number}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold">{order.title}</h3>
          <p className="text-xs text-navy-foreground/70">
            {order.category} · opened {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Stepper status={order.status} />

      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          History
        </h4>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !events?.length ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.event_type] ?? Clock;
              return (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border border-brand/40 bg-card text-brand">
                    <Icon className="size-3" />
                  </span>
                  <div className="rounded-lg border border-border bg-card p-3 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy">
                        {EVENT_LABELS[event.event_type] ?? labelize(event.event_type)}
                      </p>
                      <time className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.event_type === "created"
                        ? (event.note ?? "Order created")
                        : `${labelize(event.from_value) ?? "—"} → ${labelize(event.to_value)}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
