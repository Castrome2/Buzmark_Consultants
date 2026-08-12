import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  CalendarDays,
  ShoppingCart,
  Plus,
  Trash2,
  ClipboardList,
  Sparkles,
  ArrowRight,
  Wallet,
  Search,
  Layers,

} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { OrderTimeline, OrderStatusBadge, type TimelineOrder } from "@/components/orders/OrderTimeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  labelize,
  serviceMeta,
  depositFor,
  greeting,
  PAYMENT_STATUS_LABELS,
  priceLabel,
  isPricedCategory,
} from "@/lib/brand";
import { MessageThread } from "@/components/site/MessageThread";
import { PipelineTrack } from "@/components/orders/PipelineTrack";
import { ServiceThumb } from "@/components/site/ServiceThumb";
import { ProfileForm } from "@/components/site/ProfileForm";
import { BookingForm } from "@/components/orders/BookingForm";
import { BookingCalendar } from "@/components/orders/BookingCalendar";
import { NotificationsPanel, useUnreadCount } from "@/components/dashboard/NotificationsPanel";
import { ReviewsPanel } from "@/components/dashboard/ReviewsPanel";
import { DocumentsPanel } from "@/components/dashboard/DocumentsPanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { useApplyPreferences } from "@/hooks/use-settings";


export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: z.object({
    tab: z.string().optional(),
    service: z.string().optional(),
    add: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Client Dashboard | Buzmark Portal" },
      {
        name: "description",
        content:
          "Track your Buzmark orders, bookings and project timeline, book a meeting and add new services to your cart.",
      },
      { property: "og:title", content: "Buzmark Client Dashboard" },
      { property: "og:description", content: "Your orders, bookings and live project status." },
    ],
  }),
  component: Dashboard,
});

type OrderRow = TimelineOrder & {
  amount: number;
  amount_paid: number;
  payment_status: string;
  stage: string;
  group_id: string | null;
};


function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const tab = search.tab ?? "timeline";
  const setTab = (value: string) =>
    navigate({ to: "/dashboard", search: { ...search, tab: value, add: undefined } });

  useApplyPreferences();
  const { data: unreadCount = 0 } = useUnreadCount();





  const ordersQ = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, title, category, status, amount, deadline, created_at, stage, amount_paid, payment_status, group_id",
        )

        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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

  const servicesQ = useQuery({
    queryKey: ["service-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, category, price_from")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const cartQ = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, service:services(id, title, category, price_from)")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  /**
   * Adding a service starts its OWN service pipeline (stage: request) —
   * separate from the booking-meeting pipeline, so the client never has to
   * go back to the booking form.
   */
  const addToCart = useMutation({
    mutationFn: async (serviceId: string) => {
      const service = (servicesQ.data ?? []).find((s) => s.id === serviceId);
      const { error } = await supabase
        .from("cart_items")
        .insert({ service_id: serviceId, user_id: user!.id });
      if (error) throw error;

      const amount = isPricedCategory(service?.category)
        ? Number(service?.price_from ?? 0)
        : 0;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          title: service?.title ? `${service.title} (service request)` : "Service request",
          category: service?.category ?? "Consulting",
          amount,
          deposit_amount: depositFor(amount),
          stage: "request",
          status: "pending",
        })
        .select("id")
        .single();
      if (orderError) throw orderError;
      return order.id;
    },
    onSuccess: (orderId) => {
      toast.success("Service added — its pipeline has started in your order timeline");
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setActiveOrderId(orderId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Deep link from the Services page: add the requested service straight away.
  const autoAdded = useRef<string | null>(null);
  useEffect(() => {
    if (!search.add || !user || !servicesQ.data?.length) return;
    if (autoAdded.current === search.add) return;
    autoAdded.current = search.add;
    addToCart.mutate(search.add);
    navigate({ to: "/dashboard", search: { tab: "cart" }, replace: true });
  }, [search.add, user, servicesQ.data]);


  const removeFromCart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Clients can remove an order (and its timeline) while nothing has been paid on it. */
  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      setActiveOrderId(null);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * A client can pick several services AND a meeting engagement at once.
   * Grouping keeps every pick as its OWN pipeline (each shows its own
   * progress) but ties them to one order group: one combined total and one
   * deposit that moves every pipeline forward at the same time.
   */
  const combineOrders = useMutation({
    mutationFn: async (rows: OrderRow[]) => {
      const groupId =
        rows.find((o) => o.group_id)?.group_id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`);
      const { error } = await supabase
        .from("orders")
        .update({ group_id: groupId })
        .in(
          "id",
          rows.map((o) => o.id),
        );
      if (error) throw error;
      return rows[rows.length - 1].id;
    },
    onSuccess: (id) => {
      toast.success("Picks grouped — one order, one payment, each pipeline still tracked");
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setActiveOrderId(id);
      navigate({ to: "/checkout", search: { order: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = ordersQ.data ?? [];
  const combinable = (orders as OrderRow[]).filter(
    (o) => Number(o.amount_paid ?? 0) === 0 && o.stage !== "completed" && !o.group_id,
  );
  const combinableTotal = combinable.reduce((s, o) => s + Number(o.amount ?? 0), 0);


  const activeOrder =
    orders.find((o) => o.id === activeOrderId) ?? (orders[0] as TimelineOrder | undefined);

  /** Every pick that belongs to the same order group as the selected one. */
  const groupOrders = (activeOrder as OrderRow | undefined)?.group_id
    ? (orders as OrderRow[]).filter(
        (o) => o.group_id === (activeOrder as OrderRow).group_id,
      )
    : [];
  const groupTotal = groupOrders.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const groupPaid = groupOrders.reduce((s, o) => s + Number(o.amount_paid ?? 0), 0);

  const firstName =
    profile?.first_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  // First sign-in on this device gets the "Welcome to Buzmark Agency" greeting.
  const [firstVisit, setFirstVisit] = useState(false);
  useEffect(() => {
    if (!user) return;
    const key = `buzmark-welcomed-${user.id}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setFirstVisit(true);
  }, [user?.id]);


  const cartTotal = (cartQ.data ?? []).reduce(
    (sum, item) =>
      sum +
      (isPricedCategory(item.service?.category) ? (item.service?.price_from ?? 0) : 0) *
        item.quantity,
    0,
  );

  // Portal-wide search across orders, bookings and the service catalogue.
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => (v ?? "").toLowerCase().includes(term));
  const visibleOrders = orders.filter((o) =>
    match(o.order_number, o.title, o.category, o.status),
  );
  const visibleBookings = (bookingsQ.data ?? []).filter((b) =>
    match(b.service_category, b.status, b.description),
  );
  const visibleServices = (servicesQ.data ?? []).filter((s) => match(s.title, s.category));

  const stats = [
    { label: "Active orders", value: orders.filter((o) => o.status === "in_progress").length },
    { label: "Total orders", value: orders.length },
    { label: "Bookings", value: bookingsQ.data?.length ?? 0 },
    { label: "Cart items", value: cartQ.data?.length ?? 0 },
  ];


  return (
    <SiteLayout>
      {/* WELCOME BANNER */}
      <section className="relative overflow-hidden bg-gradient-navy py-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,color-mix(in_oklab,var(--brand)_35%,transparent),transparent_55%)]" />
        <div className="relative mx-auto flex w-full max-w-[1700px] flex-wrap items-end justify-between gap-6 px-4 sm:px-6 xl:px-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="size-3" /> Client dashboard
            </p>
            <h1 className="mt-4 text-3xl font-extrabold text-navy-foreground sm:text-4xl">
              {firstVisit ? (
                <>
                  Welcome to <span className="text-gradient-brand">Buzmark Agency</span>,{" "}
                  {firstName} 👋
                </>
              ) : (
                <>
                  {greeting()}, <span className="text-gradient-brand">{firstName}</span> 👋
                </>
              )}
            </h1>

            <p className="mt-2 max-w-xl text-navy-foreground/70">
              {firstVisit
                ? "You're all set — book a meeting or add a service to get started."
                : "Here's everything happening with your brand right now."}
            </p>
          </div>
        </div>


        <div className="relative mx-auto mt-10 grid w-full max-w-[1700px] grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4 xl:px-10">
          {stats.map((s) => (
            <Card
              key={s.label}
              className="border-navy-foreground/12 bg-navy-foreground/8 p-5 text-navy-foreground backdrop-blur"
            >
              <p className="font-display text-3xl font-extrabold text-brand">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-navy-foreground/60">
                {s.label}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1700px] px-4 py-14 sm:px-6 xl:px-10">
        <Tabs
          value={tab}
          onValueChange={setTab}
          orientation="vertical"
          className="flex flex-col gap-6 lg:flex-row lg:items-start"
        >
          <TabsList className="h-auto w-full shrink-0 flex-col items-stretch gap-1 rounded-2xl bg-navy p-3 lg:w-64">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy-foreground/50">
              Client menu
            </p>
            {[
              { value: "timeline", label: "Order timeline" },
              { value: "book", label: "Book meeting" },
              { value: "meetings", label: "Meeting pipelines", to: "/meetings" },
              { value: "services", label: "Browse services", to: "/services" },
              { value: "bookings", label: "Bookings" },
              { value: "calendar", label: "My calendar" },
              { value: "cart", label: "Service cart" },
              { value: "documents", label: "Proposals & invoices" },
              { value: "messages", label: "Messages" },
              { value: "notifications", label: "Notifications", badge: unreadCount },
              { value: "reviews", label: "Reviews" },
              { value: "profile", label: "My information" },
              { value: "settings", label: "Settings" },
            ].map((item) =>
              item.to ? (
                <Link
                  key={item.value}
                  to={item.to}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-foreground/75 transition-colors hover:bg-navy-foreground/10"
                >
                  {item.label}
                </Link>
              ) : (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-foreground/75 data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-brand"
                >
                  <span>{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground data-[state=active]:bg-navy">
                      {item.badge}
                    </span>
                  )}
                </TabsTrigger>
              ),
            )}
          </TabsList>

          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders, bookings and services…"
                aria-label="Search your dashboard"
                className="h-11 pl-9"
              />
            </div>



          <TabsContent value="book" className="mt-6">
            <div className="max-w-3xl">
              <BookingForm presetService={search.service} />
            </div>
          </TabsContent>


          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-6">
            {combinable.length > 1 && (
              <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-brand/40 bg-brand/6 p-5">
                <div className="flex items-start gap-3">
                  <Layers className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <p className="font-semibold text-navy">
                      You picked {combinable.length} services/engagements — process them as one
                      order
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Each pick keeps its own progress track, but they start together and settle
                      with one payment. Combined total {formatMoney(combinableTotal)} · initial
                      deposit {formatMoney(depositFor(combinableTotal))}.
                    </p>
                  </div>
                </div>
                <Button
                  variant="brand"
                  disabled={combineOrders.isPending}
                  onClick={() => {
                    if (confirm("Process these picks as one order with a single payment?"))
                      combineOrders.mutate(combinable);
                  }}
                >
                  <Layers /> Process together
                </Button>
              </Card>
            )}

            {ordersQ.isLoading ? (

              <Skeleton className="h-72 w-full" />
            ) : !orders.length ? (
              <Card className="p-12 text-center">
                <ClipboardList className="mx-auto size-10 text-brand" />
                <h2 className="mt-4 font-display text-lg font-bold text-navy">No orders yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Book a consultation and we&apos;ll open your first order.
                </p>
                <Button variant="brand" className="mt-6" onClick={() => setTab("book")}>
                  Book now <ArrowRight />
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                  {visibleOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setActiveOrderId(o.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        activeOrder?.id === o.id
                          ? "border-brand bg-brand/6"
                          : "border-border bg-card hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-brand">
                          {o.order_number}
                        </span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="mt-2 font-semibold text-navy">{o.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.category} · {formatMoney(Number(o.amount))}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {formatDate(o.deadline)}
                      </p>
                    </button>
                  ))}
                </div>
                <Card className="space-y-5 p-6 shadow-card">
                  {activeOrder && (
                    <>
                      {groupOrders.length > 1 ? (
                        <div className="space-y-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-2 font-semibold text-navy">
                              <Layers className="size-4 text-brand" /> One order ·{" "}
                              {groupOrders.length} picks running together
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Combined {formatMoney(groupTotal)} · {formatMoney(groupPaid)} paid
                            </p>
                          </div>
                          {groupOrders.map((g) => (
                            <div key={g.id} className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-navy">
                                  {g.title}{" "}
                                  <span className="font-mono text-xs text-brand">
                                    {g.order_number}
                                  </span>
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {g.category} · {formatMoney(Number(g.amount ?? 0))}
                                </span>
                              </div>
                              <PipelineTrack
                                compact
                                stage={g.stage ?? "request"}
                                priced={
                                  isPricedCategory(g.category) || Number(g.amount ?? 0) > 0
                                }
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <PipelineTrack
                          stage={(activeOrder as OrderRow).stage ?? "request"}
                          priced={
                            isPricedCategory(activeOrder.category) ||
                            Number((activeOrder as OrderRow).amount ?? 0) > 0
                          }
                        />
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-sand p-4">
                        <div className="text-sm">
                          <p className="font-semibold text-navy">
                            {groupOrders.length > 1
                              ? groupPaid >= groupTotal && groupPaid > 0
                                ? "Paid in full"
                                : groupPaid > 0
                                  ? "Deposit paid"
                                  : "Unpaid"
                              : (PAYMENT_STATUS_LABELS[(activeOrder as OrderRow).payment_status] ??
                                "Unpaid")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {groupOrders.length > 1
                              ? `${formatMoney(groupPaid)} paid of ${formatMoney(groupTotal)} across ${groupOrders.length} picks`
                              : `${formatMoney(Number((activeOrder as OrderRow).amount_paid ?? 0))} paid of ${formatMoney(Number((activeOrder as OrderRow).amount ?? 0))}`}
                          </p>
                        </div>
                        {(groupOrders.length > 1
                          ? groupPaid < groupTotal
                          : (activeOrder as OrderRow).payment_status !== "paid") && (
                          <Button asChild variant="brand" size="sm">
                            <Link to="/checkout" search={{ order: activeOrder.id }}>
                              <Wallet /> Pay now
                            </Link>
                          </Button>
                        )}
                      </div>

                      <OrderTimeline order={activeOrder as TimelineOrder} />
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground">
                          {Number((activeOrder as OrderRow).amount_paid ?? 0) > 0
                            ? "Paid orders stay on record — contact us to cancel."
                            : "Nothing paid yet — you can remove this request."}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={
                            deleteOrder.isPending ||
                            Number((activeOrder as OrderRow).amount_paid ?? 0) > 0
                          }
                          onClick={() => {
                            if (confirm("Delete this order and its timeline?"))
                              deleteOrder.mutate(activeOrder.id);
                          }}
                        >
                          <Trash2 /> Delete order
                        </Button>
                      </div>

                    </>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          {/* BOOKINGS */}
          <TabsContent value="bookings" className="mt-6">
            {bookingsQ.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !bookingsQ.data?.length ? (
              <Card className="p-12 text-center text-muted-foreground">
                No bookings yet.{" "}
                <button
                  type="button"
                  onClick={() => setTab("book")}
                  className="font-semibold text-brand hover:underline"
                >
                  Book a meeting
                </button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
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
                            if (confirm("Delete this meeting booking?")) deleteBooking.mutate(b.id);
                          }}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {b.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{b.description}</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Requested {formatDateTime(b.created_at)} ·{" "}
                      {priceLabel(b.service_category, null)}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CART */}
          <TabsContent value="cart" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="p-6 shadow-card">
                <h2 className="font-display text-lg font-bold text-navy">Add services</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visibleServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ServiceThumb category={s.category} title={s.title} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.category} · {priceLabel(s.category, s.price_from)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {serviceMeta(s.category).event} · {serviceMeta(s.category).duration}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="brandOutline"
                        aria-label={`Add ${s.title} to cart`}
                        onClick={() => addToCart.mutate(s.id)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="h-fit p-6 shadow-card">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
                  <ShoppingCart className="size-5 text-brand" /> Your cart
                </h2>
                <div className="mt-4 space-y-3">
                  {!cartQ.data?.length && (
                    <p className="text-sm text-muted-foreground">Cart is empty.</p>
                  )}
                  {(cartQ.data ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ServiceThumb
                          size="sm"
                          category={item.service?.category}
                          title={item.service?.title}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy">{item.service?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {priceLabel(item.service?.category, item.service?.price_from)}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove from cart"
                        onClick={() => removeFromCart.mutate(item.id)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Estimated total</span>
                  <span className="font-display text-lg font-extrabold text-navy">
                    {formatMoney(cartTotal)}
                  </span>
                </div>
                <Button
                  variant="brand"
                  className="mt-4 w-full"
                  disabled={!cartQ.data?.length}
                  onClick={() => setTab("timeline")}
                >
                  View service pipelines & pay
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Each added service opens its own pipeline in your order timeline — no need to go
                  back to the booking form.
                </p>
              </Card>
            </div>
          </TabsContent>
          {/* MY CALENDAR */}
          <TabsContent value="calendar" className="mt-6">
            <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-navy">Your schedule & availability</p>
                <p className="text-xs text-muted-foreground">
                  Highlighted days are meetings you already booked — free days are open for a new
                  session.
                </p>
              </div>
              <Button variant="brand" size="sm" onClick={() => setTab("book")}>
                <CalendarDays /> Book another day
              </Button>
            </Card>
            <BookingCalendar bookings={(bookingsQ.data ?? []) as never} />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">

            <div className="max-w-3xl">
              <MessageThread orderId={activeOrder?.id ?? null} />
            </div>
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationsPanel />
          </TabsContent>
          <TabsContent value="documents" className="mt-6">
            <DocumentsPanel clientName={firstName} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewsPanel
              orders={orders.map((o) => ({
                id: o.id,
                order_number: o.order_number,
                title: o.title,
              }))}
            />
          </TabsContent>
          <TabsContent value="profile" className="mt-6">
            <ProfileForm />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsPanel />
          </TabsContent>
          </div>
        </Tabs>
      </section>
    </SiteLayout>
  );
}
