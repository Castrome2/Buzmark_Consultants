import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Users,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Loader2,
  Wallet,
  Trash2,
  Search,
} from "lucide-react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { OrderTimeline, OrderStatusBadge, type TimelineOrder } from "@/components/orders/OrderTimeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/components/site/ProfileAvatar";
import { ServiceThumb } from "@/components/site/ServiceThumb";


import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Smartphone } from "lucide-react";
import { maskPhone } from "@/lib/mpesa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingCalendar } from "@/components/orders/BookingCalendar";
import { MessageThread } from "@/components/site/MessageThread";
import { PipelineTrack } from "@/components/orders/PipelineTrack";
import { Switch } from "@/components/ui/switch";
import { DocumentsAdminPanel } from "@/components/admin/DocumentsAdminPanel";
import { NotifyClientPanel } from "@/components/admin/NotifyClientPanel";
import { AdminReviewsPanel } from "@/components/admin/AdminReviewsPanel";
import { AccessRolesPanel } from "@/components/admin/AccessRolesPanel";
import {
  ORDER_STAGES,
  STAGE_LABELS,
  PAYMENT_STATUS_LABELS,
  ORDER_STATUSES,
  BOOKING_STATUSES,
  SERVICE_CATEGORIES,
  formatDate,
  formatDateTime,
  formatMoney,
  labelize,
  isPricedCategory,
} from "@/lib/brand";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console | Buzmark Portal" },
      {
        name: "description",
        content:
          "Buzmark admin console: manage clients, bookings, orders, statuses and the full order event history.",
      },
      { property: "og:title", content: "Buzmark Admin Console" },
      { property: "og:description", content: "Manage clients, bookings and order pipelines." },
    ],
  }),
  component: Admin,
});

type OrderRow = TimelineOrder & {
  amount: number;
  user_id: string;
  stage: string;
  amount_paid: number;
  payment_status: string;
  notes?: string | null;
};


/** Each stage must be earned before the next one unlocks. */
function stageBlocker(order: OrderRow, next: string): string | null {
  if (next === "payment" && Number(order.amount_paid) <= 0)
    return "No payment recorded yet for this order.";
  if ((next === "service" || next === "completed") && order.payment_status === "unpaid")
    return "A deposit must be received before work starts.";
  if (next === "completed" && order.payment_status !== "paid")
    return "Balance must be fully settled before completion.";
  return null;
}
type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  created_at: string;
};

function ClientAvatar({ profile, size = 10 }: { profile: ClientRow; size?: 10 | 14 }) {
  const { data: url } = useAvatarUrl(profile.avatar_url);
  const initials = (profile.first_name ?? profile.email ?? "?").charAt(0).toUpperCase();
  return (
    <Avatar className={size === 14 ? "size-14" : "size-10"}>
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className="bg-gradient-brand font-bold text-brand-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function Admin() {
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const qc = useQueryClient();
  const [timelineOrder, setTimelineOrder] = useState<OrderRow | null>(null);
  const [activeClient, setActiveClient] = useState<ClientRow | null>(null);
  const [override, setOverride] = useState(false);
  const [q, setQ] = useState("");
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [newOrder, setNewOrder] = useState({
    title: "",
    category: SERVICE_CATEGORIES[0] as string,
    amount: "",
    deadline: "",
  });



  const paymentsQ = useQuery({
    queryKey: ["admin-payments"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const trafficQ = useQuery({
    queryKey: ["admin-traffic"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });


  const ordersQ = useQuery({
    queryKey: ["admin-orders"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const bookingsQ = useQuery({
    queryKey: ["admin-bookings"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clientsQ = useQuery({
    queryKey: ["admin-clients"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { status?: string; category?: string; stage?: string };
    }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Order updated — history logged");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["order-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBooking = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status?: string;
        booking_date?: string;
        booking_time?: string;
        service_category?: string;
        description?: string;
      };
    }) => {
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Full admin edit of any order on a client's dashboard. */
  const saveOrder = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        title?: string;
        category?: string;
        amount?: number;
        deadline?: string | null;
        notes?: string | null;
        status?: string;
        stage?: string;
      };
    }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order saved");
      setEditOrder(null);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["order-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Admin can open a brand-new pipeline on a client's dashboard. */
  const createOrder = useMutation({
    mutationFn: async (payload: {
      user_id: string;
      title: string;
      category: string;
      amount: number;
      deadline: string | null;
    }) => {
      const { error } = await supabase.from("orders").insert({
        ...payload,
        deposit_amount: Math.round(payload.amount * 0.3),
        stage: "request",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order created for client");
      setNewOrder({ title: "", category: SERVICE_CATEGORIES[0], amount: "", deadline: "" });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  if (checking) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl p-24">
          <Skeleton className="h-40 w-full" />
        </div>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <ShieldCheck className="mx-auto size-10 text-brand" />
          <h1 className="mt-4 font-display text-2xl font-bold text-navy">Admins only</h1>
          <p className="mt-2 text-muted-foreground">
            Your account doesn&apos;t have admin access to the Buzmark console.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link to="/dashboard">Go to my dashboard</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const orders = ordersQ.data ?? [];
  // Revenue = money actually collected through recorded payments.
  const revenue = (paymentsQ.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const mpesaPayments = (paymentsQ.data ?? []).filter((p) => p.method === "mpesa");
  const mpesaTotal = mpesaPayments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = orders.reduce(
    (s, o) => s + Math.max(0, Number(o.amount) - Number(o.amount_paid ?? 0)),
    0,
  );

  // Console-wide search across orders, bookings and clients.
  const term = q.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => (v ?? "").toLowerCase().includes(term));
  const visibleOrders = orders.filter((o) =>
    match(o.order_number, o.title, o.category, o.status, o.stage),
  );
  const visibleBookings = (bookingsQ.data ?? []).filter((b) =>
    match(b.service_category, b.status, b.email, b.phone, b.description),
  );
  const visibleClients = (clientsQ.data ?? []).filter((c) =>
    match(c.first_name, c.last_name, c.email, c.phone, c.company),
  );

  const stats = [
    { icon: ClipboardList, label: "Orders", value: orders.length },
    { icon: CalendarDays, label: "Bookings", value: bookingsQ.data?.length ?? 0 },
    { icon: Users, label: "Clients", value: clientsQ.data?.length ?? 0 },
    { icon: TrendingUp, label: "Revenue collected", value: formatMoney(revenue) },
    { icon: Wallet, label: "Outstanding balance", value: formatMoney(outstanding) },
  ];


  return (
    <SiteLayout>
      <section className="bg-gradient-navy py-12">
        <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 xl:px-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <ShieldCheck className="size-3" /> Admin console
          </p>
          <h1 className="mt-4 text-3xl font-extrabold text-navy-foreground">
            Operations overview
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">

            {stats.map((s) => (
              <Card
                key={s.label}
                className="border-navy-foreground/12 bg-navy-foreground/8 p-5 text-navy-foreground backdrop-blur"
              >
                <s.icon className="size-5 text-brand" />
                <p className="mt-3 font-display text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs uppercase tracking-wide text-navy-foreground/60">
                  {s.label}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1700px] px-4 py-12 sm:px-6 xl:px-10">
        <Tabs
          defaultValue="orders"
          orientation="vertical"
          className="flex flex-col gap-6 lg:flex-row lg:items-start"
        >
          <TabsList className="h-auto w-full shrink-0 flex-col items-stretch gap-1 rounded-2xl bg-navy p-3 lg:w-64">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy-foreground/50">
              Admin menu
            </p>
            {[
              { value: "orders", label: "Orders" },
              { value: "bookings", label: "Bookings" },
              { value: "clients", label: "Clients" },
              { value: "calendar", label: "Calendar" },
              { value: "payments", label: "Payments" },
              { value: "documents", label: "Proposals & invoices" },
              { value: "notify", label: "Notify clients" },
              { value: "reviews", label: "Client reviews" },
              { value: "access", label: "Access & roles" },
              { value: "traffic", label: "Traffic audit" },
            ].map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="justify-start rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-foreground/75 data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-brand"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders, bookings and clients…"
                aria-label="Search the admin console"
                className="h-11 pl-9"
              />
            </div>


          <TabsContent value="orders" className="mt-6 space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-navy">Admin stage override</p>
                <p className="text-xs text-muted-foreground">
                  Stages normally unlock only when each step is completed. Turn this on to correct a
                  pipeline manually.
                </p>
              </div>
              <Switch checked={override} onCheckedChange={setOverride} aria-label="Admin override" />
            </Card>
            {ordersQ.isLoading && <Skeleton className="h-40 w-full" />}
            {visibleOrders.map((order) => (
              <Card key={order.id} className="grid gap-4 p-5 shadow-card lg:grid-cols-[1.4fr_1fr]">
                <div className="flex min-w-0 gap-4">
                  <ServiceThumb category={order.category} title={order.title} />
                  <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-brand">
                      {order.order_number}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs text-muted-foreground">
                      Opened {formatDateTime(order.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-navy">{order.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {order.category} · {formatMoney(Number(order.amount))} · due{" "}
                    {formatDate(order.deadline)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="brandOutline" size="sm" onClick={() => setTimelineOrder(order)}>
                      View timeline
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditOrder(order)}>
                      Edit
                    </Button>
                  </div>

                  </div>
                </div>


                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={order.status}
                      onValueChange={(status) =>
                        updateOrder.mutate({ id: order.id, patch: { status } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {labelize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Category
                    </label>
                    <Select
                      value={order.category}
                      onValueChange={(category) =>
                        updateOrder.mutate({ id: order.id, patch: { category } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <PipelineTrack
                    stage={order.stage ?? "request"}
                    priced={isPricedCategory(order.category) || Number(order.amount ?? 0) > 0}
                    compact
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {PAYMENT_STATUS_LABELS[order.payment_status] ?? "Unpaid"} ·{" "}
                      {formatMoney(Number(order.amount_paid))} of {formatMoney(Number(order.amount))}
                    </span>
                    {(() => {
                      const i = ORDER_STAGES.indexOf(order.stage as (typeof ORDER_STAGES)[number]);
                      const next = ORDER_STAGES[Math.max(0, i) + 1];
                      if (!next) return null;
                      const blocked = stageBlocker(order, next);
                      return (
                        <Button
                          size="sm"
                          variant="brand"
                          disabled={!override && !!blocked}
                          title={blocked ?? undefined}
                          onClick={() =>
                            updateOrder.mutate({ id: order.id, patch: { stage: next } })
                          }
                        >
                          Advance to {STAGE_LABELS[next]}
                        </Button>
                      );
                    })()}
                    {override && (
                      <Select
                        value={order.stage}
                        onValueChange={(stage) =>
                          updateOrder.mutate({ id: order.id, patch: { stage } })
                        }
                      >
                        <SelectTrigger className="h-9 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STAGES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {STAGE_LABELS[st]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto text-destructive"
                      disabled={deleteOrder.isPending}
                      onClick={() => {
                        if (confirm("Delete this order and its history?"))
                          deleteOrder.mutate(order.id);
                      }}
                    >
                      <Trash2 /> Delete order
                    </Button>
                    {!override &&
                      (() => {
                        const i = ORDER_STAGES.indexOf(order.stage as (typeof ORDER_STAGES)[number]);
                        const next = ORDER_STAGES[Math.max(0, i) + 1];
                        const blocked = next ? stageBlocker(order, next) : null;
                        return blocked ? (
                          <span className="text-xs font-medium text-warning">{blocked}</span>
                        ) : null;
                      })()}
                  </div>
                </div>
              </Card>
            ))}
            {!ordersQ.isLoading && !orders.length && (
              <Card className="p-12 text-center text-muted-foreground">No orders yet.</Card>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-6 grid gap-4 md:grid-cols-2">
            {visibleBookings.map((b) => (
              <Card key={b.id} className="p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <ServiceThumb category={b.service_category} title={b.service_category} />
                    <div className="min-w-0">
                    <h3 className="font-bold text-navy">{b.service_category}</h3>

                    <p className="text-xs text-muted-foreground">
                      {formatDate(b.booking_date)} at {b.booking_time} · {b.staff_preference}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.email} · {b.phone}
                    </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {labelize(b.status)}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete booking"
                      disabled={deleteBooking.isPending}
                      onClick={() => {
                        if (confirm("Delete this booking?")) deleteBooking.mutate(b.id);
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
                {b.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{b.description}</p>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Date
                    </label>
                    <Input
                      type="date"
                      defaultValue={b.booking_date}
                      onBlur={(e) =>
                        e.target.value !== b.booking_date &&
                        updateBooking.mutate({ id: b.id, patch: { booking_date: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Time
                    </label>
                    <Input
                      type="time"
                      defaultValue={b.booking_time}
                      onBlur={(e) =>
                        e.target.value !== b.booking_time &&
                        updateBooking.mutate({ id: b.id, patch: { booking_time: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <Select
                  value={b.status}
                  onValueChange={(status) => updateBooking.mutate({ id: b.id, patch: { status } })}
                >
                  <SelectTrigger className="mt-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {labelize(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </Card>
            ))}
            {!bookingsQ.isLoading && !bookingsQ.data?.length && (
              <Card className="p-12 text-center text-muted-foreground md:col-span-2">
                No bookings yet.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-6 grid gap-4 md:grid-cols-3">
            {[...visibleClients]
              .map((c) => {
                const cOrders = orders.filter((o) => o.user_id === c.id);
                const due = cOrders.reduce(
                  (s, o) => s + Math.max(0, Number(o.amount) - Number(o.amount_paid ?? 0)),
                  0,
                );
                return { c, cOrders, due };
              })
              .sort((a, b) => b.due - a.due)
              .map(({ c, cOrders, due }) => {
              const cBookings = (bookingsQ.data ?? []).filter((b) => b.user_id === c.id);
              return (
                <Card
                  key={c.id}
                  className={`p-5 shadow-card ${due > 0 ? "border-destructive/50 bg-destructive/4" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <ClientAvatar profile={c} />
                    <div>
                      <p className="font-semibold text-navy">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed client"}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                  {due > 0 && (
                    <Badge variant="destructive" className="mt-3 rounded-full">
                      Due {formatMoney(due)}
                    </Badge>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.company || "—"} · {c.phone || "no phone"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {formatDate(c.created_at)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-navy">
                    {cOrders.length} orders · {cBookings.length} bookings
                  </p>
                  <Button
                    variant="brandOutline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveClient(c)}
                  >
                    View client
                  </Button>
                </Card>
              );
            })}
            {!clientsQ.isLoading && !clientsQ.data?.length && (
              <Card className="p-12 text-center text-muted-foreground md:col-span-3">
                No clients yet.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <BookingCalendar bookings={(bookingsQ.data ?? []) as never} />
          </TabsContent>

          <TabsContent value="payments" className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "M-Pesa collected", value: formatMoney(mpesaTotal) },
                { label: "M-Pesa transactions", value: String(mpesaPayments.length) },
                { label: "Outstanding balance", value: formatMoney(outstanding) },
              ].map((s) => (
                <Card key={s.label} className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-navy">{s.value}</p>
                </Card>
              ))}
            </div>

            {paymentsQ.isLoading && <Skeleton className="h-40 w-full" />}

            <Card className="overflow-x-auto p-0 shadow-card">
              <div className="flex items-center gap-2 border-b border-border p-5">
                <Smartphone className="size-4 text-brand" />
                <h2 className="font-display text-base font-bold text-navy">
                  M-Pesa & payment transactions
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Method / Ref</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paymentsQ.data ?? []).map((p) => {
                    const order = orders.find((o) => o.id === p.order_id);
                    const client = clientsQ.data?.find((c) => c.id === p.user_id);
                    const due = order
                      ? Math.max(0, Number(order.amount) - Number(order.amount_paid ?? 0))
                      : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-navy">
                          {[client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
                            client?.email ||
                            "Client"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {maskPhone(p.payer_phone) !== "—"
                            ? p.payer_phone
                            : (client?.phone ?? "—")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-brand">
                          {order?.order_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {labelize(p.method)}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(p.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-navy">
                          {formatMoney(Number(p.amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          {due > 0 ? (
                            <Badge variant="outline" className="rounded-full border-destructive/40 text-destructive">
                              {formatMoney(due)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">
                              {order
                                ? (PAYMENT_STATUS_LABELS[order.payment_status] ?? "Settled")
                                : labelize(p.status)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!paymentsQ.isLoading && !paymentsQ.data?.length && (
                <p className="p-12 text-center text-muted-foreground">No payments yet.</p>
              )}
            </Card>
          </TabsContent>


          <TabsContent value="documents" className="mt-6">
            <DocumentsAdminPanel clients={clientsQ.data ?? []} />
          </TabsContent>

          <TabsContent value="notify" className="mt-6">
            <NotifyClientPanel clients={clientsQ.data ?? []} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <AdminReviewsPanel clients={clientsQ.data ?? []} />
          </TabsContent>

          <TabsContent value="access" className="mt-6">
            <AccessRolesPanel clients={clientsQ.data ?? []} />
          </TabsContent>

          <TabsContent value="traffic" className="mt-6">
            <Card className="p-6 shadow-card">
              <h2 className="font-display text-lg font-bold text-navy">
                Traffic & activity supervision
              </h2>
              <p className="text-sm text-muted-foreground">
                Latest 200 signed-in events: page views, sign-ins, bookings and payments.
              </p>
              {trafficQ.isLoading ? (
                <Skeleton className="mt-4 h-64 w-full" />
              ) : (
                <div className="mt-4 divide-y divide-border">
                  {(trafficQ.data ?? []).map((a) => {
                    const who = clientsQ.data?.find((c) => c.id === a.user_id);
                    return (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-navy">
                            {labelize(a.action)}
                            {a.path ? <span className="text-muted-foreground"> · {a.path}</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {who?.email ?? a.user_id?.slice(0, 8) ?? "Unknown"}
                            {a.detail ? ` · ${a.detail}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                    );
                  })}
                  {!trafficQ.data?.length && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
          </div>
        </Tabs>


      </section>

      <Dialog open={!!activeClient} onOpenChange={(open) => !open && setActiveClient(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client profile</DialogTitle>
          </DialogHeader>
          {activeClient && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <ClientAvatar profile={activeClient} size={14} />
                <div>
                  <p className="font-display text-lg font-bold text-navy">
                    {[activeClient.first_name, activeClient.last_name].filter(Boolean).join(" ") ||
                      "Unnamed client"}
                  </p>
                  <p className="text-sm text-muted-foreground">{activeClient.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeClient.company || "—"} · {activeClient.phone || "no phone"} · joined{" "}
                    {formatDate(activeClient.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Orders &amp; stages
                </h3>
                <div className="space-y-4">
                  {orders
                    .filter((o) => o.user_id === activeClient.id)
                    .map((o) => (
                      <Card key={o.id} className="p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-bold text-brand">
                            {o.order_number}
                          </span>
                          <OrderStatusBadge status={o.status} />
                          <span className="text-xs text-muted-foreground">
                            {o.category} · {formatMoney(Number(o.amount))} · due{" "}
                            {formatDate(o.deadline)}
                          </span>
                        </div>
                        <p className="mb-3 font-semibold text-navy">{o.title}</p>
                        <OrderTimeline order={o} />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditOrder(o)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteOrder.isPending}
                            onClick={() => {
                              if (confirm("Delete this order?")) deleteOrder.mutate(o.id);
                            }}
                          >
                            <Trash2 className="text-destructive" /> Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  {!orders.some((o) => o.user_id === activeClient.id) && (
                    <p className="text-sm text-muted-foreground">No orders for this client yet.</p>
                  )}
                </div>

                {/* Admin can open a new pipeline directly on this client's dashboard */}
                <form
                  className="mt-4 grid gap-3 rounded-xl border border-border bg-sand p-4 sm:grid-cols-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createOrder.mutate({
                      user_id: activeClient.id,
                      title: newOrder.title,
                      category: newOrder.category,
                      amount: Number(newOrder.amount || 0),
                      deadline: newOrder.deadline || null,
                    });
                  }}
                >
                  <Input
                    className="sm:col-span-2"
                    placeholder="New order title"
                    value={newOrder.title}
                    onChange={(e) => setNewOrder((s) => ({ ...s, title: e.target.value }))}
                    required
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newOrder.category}
                    onChange={(e) => setNewOrder((s) => ({ ...s, category: e.target.value }))}
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder((s) => ({ ...s, amount: e.target.value }))}
                  />
                  <Button type="submit" variant="brand" disabled={createOrder.isPending}>
                    Add order
                  </Button>
                </form>
              </div>


              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Bookings
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(bookingsQ.data ?? [])
                    .filter((b) => b.user_id === activeClient.id)
                    .map((b) => (
                      <Card key={b.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-navy">{b.service_category}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(b.booking_date)} at {b.booking_time} ·{" "}
                              {b.staff_preference}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Requested {formatDateTime(b.created_at)}
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {labelize(b.status)}
                          </Badge>
                        </div>
                        {b.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
                        )}
                      </Card>
                    ))}
                  {!(bookingsQ.data ?? []).some((b) => b.user_id === activeClient.id) && (
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                  )}
                </div>
              </div>

              <MessageThread clientId={activeClient.id} asAdmin title="Messages with this client" />
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={!!timelineOrder} onOpenChange={(open) => !open && setTimelineOrder(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order history</DialogTitle>
          </DialogHeader>
          {timelineOrder && <OrderTimeline order={timelineOrder} />}
          {updateOrder.isPending && <Loader2 className="mx-auto animate-spin text-brand" />}
        </DialogContent>
      </Dialog>

      {/* Admin full edit of any order on the client dashboard */}
      <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit order {editOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                saveOrder.mutate({
                  id: editOrder.id,
                  patch: {
                    title: String(f.get("title")),
                    category: String(f.get("category")),
                    amount: Number(f.get("amount") || 0),
                    deadline: (f.get("deadline") as string) || null,
                    notes: (f.get("notes") as string) || null,
                  },
                });
              }}
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Title
                </label>
                <Input name="title" defaultValue={editOrder.title} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editOrder.category}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Amount (KES)
                  </label>
                  <Input name="amount" type="number" min="0" defaultValue={editOrder.amount ?? 0} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Deadline
                </label>
                <Input name="deadline" type="date" defaultValue={editOrder.deadline ?? ""} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Notes
                </label>
                <Input name="notes" defaultValue={editOrder.notes ?? ""} />
              </div>
              <Button type="submit" variant="brand" disabled={saveOrder.isPending}>
                Save changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </SiteLayout>
  );
}
