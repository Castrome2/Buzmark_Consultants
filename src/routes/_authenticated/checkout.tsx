import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Wallet,
  Info,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/use-auth";
import { logActivity } from "@/lib/audit";
import { PAYMENT_ACCOUNTS, normalizeMpesaPhone } from "@/lib/mpesa";
import { requestMpesaPayment } from "@/lib/mpesa.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PipelineTrack } from "@/components/orders/PipelineTrack";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMoney,
  depositFor,
  DEPOSIT_RATE,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: z.object({ order: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Checkout & Deposit | Buzmark Portal" },
      {
        name: "description",
        content:
          "Confirm your Buzmark order and pay a deposit or the full package amount to start production.",
      },
      { property: "og:title", content: "Buzmark Checkout" },
      { property: "og:description", content: "Pay your project deposit and start production." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { order: orderId } = Route.useSearch();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mpesaPush = useServerFn(requestMpesaPayment);

  const [choice, setChoice] = useState<"deposit" | "full">("deposit");
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });
  const [paying, setPaying] = useState(false);
  const [phone, setPhone] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const orderQ = useQuery({
    queryKey: ["checkout-order", orderId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      const { data, error } = orderId ? await q.eq("id", orderId) : await q;
      if (error) throw error;
      const lead = data?.[0] ?? null;
      if (!lead?.group_id) return { order: lead, group: lead ? [lead] : [] };
      // Multiple picks made at once run as one order group: one total, one payment.
      const { data: group, error: groupError } = await supabase
        .from("orders")
        .select("*")
        .eq("group_id", lead.group_id)
        .order("created_at");
      if (groupError) throw groupError;
      return { order: lead, group: group?.length ? group : [lead] };
    },
  });

  const order = orderQ.data?.order;
  const group = orderQ.data?.group ?? [];
  const grouped = group.length > 1;
  const total = group.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const paid = group.reduce((s, o) => s + Number(o.amount_paid ?? 0), 0);
  const deposit = Math.max(0, depositFor(total) - paid);
  const balance = Math.max(0, total - paid);
  const payAmount = choice === "deposit" ? deposit : balance;


  useEffect(() => {
    if (order) void logActivity("checkout_viewed", { detail: order.order_number });
  }, [order?.id]);

  useEffect(() => {
    setPhone((p) => p || profile?.phone || "");
  }, [profile?.phone]);

  /** Ask M-Pesa to prompt the client, then pre-fill the transaction reference. */
  async function sendMpesaPrompt() {
    if (!order || payAmount <= 0) return;
    setPushing(true);
    try {
      const result = await mpesaPush({
        data: { phone, amount: payAmount, orderNumber: order.order_number },
      });
      setReference(result.reference);
      setPushMessage(result.message);
      toast.success("M-Pesa prompt sent — approve it on your phone.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the M-Pesa payment.");
    } finally {
      setPushing(false);
    }
  }

  async function pay() {
    if (!order || payAmount <= 0) return;
    const ref = reference.trim();
    if (!ref) return toast.error("A transaction reference is required to confirm payment.");
    if (method === "mpesa" && !normalizeMpesaPhone(phone))
      return toast.error("Enter the M-Pesa number that made the payment.");
    if (method === "card") {
      const digits = card.number.replace(/\s+/g, "");
      if (!/^\d{13,19}$/.test(digits)) return toast.error("Enter a valid card number.");
      if (!card.name.trim()) return toast.error("Enter the name on the card.");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry.trim()))
        return toast.error("Enter the card expiry as MM/YY.");
      if (!/^\d{3,4}$/.test(card.cvc.trim())) return toast.error("Enter the card CVC.");
    }
    setPaying(true);
    /**
     * One payment, many picks: the amount is split across every order in the
     * group (pro-rata by package value) so all pipelines advance at once.
     */
    const rows = group.map((o, i) => {
      const share =
        total > 0 ? Math.round((Number(o.amount ?? 0) / total) * payAmount) : Math.round(payAmount / group.length);
      return { order: o, amount: i === group.length - 1 ? 0 : share };
    });
    const allocated = rows.reduce((s, r) => s + r.amount, 0);
    rows[rows.length - 1].amount = Math.max(0, payAmount - allocated);

    const { error } = await supabase.from("payments").insert(
      rows
        .filter((r) => r.amount > 0)
        .map((r) => ({
          order_id: r.order.id,
          user_id: user!.id,
          amount: r.amount,
          kind: choice,
          method,
          reference: reference.trim(),
          payer_phone: method === "mpesa" ? normalizeMpesaPhone(phone) : null,
        })),
    );


    setPaying(false);
    if (error) return toast.error(error.message);

    await supabase.from("cart_items").delete().eq("user_id", user!.id);
    void logActivity("payment_made", {
      detail: `${order.order_number} · ${choice} · ${payAmount}`,
    });
    toast.success(
      choice === "deposit"
        ? "Deposit received — your project moves to production planning."
        : "Full payment received — your project is now in production.",
    );
    qc.invalidateQueries();
    navigate({ to: "/dashboard" });
  }

  if (orderQ.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Skeleton className="h-72 w-full" />
        </div>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <Wallet className="mx-auto size-10 text-brand" />
          <h1 className="mt-4 font-display text-2xl font-bold text-navy">Nothing to check out</h1>
          <p className="mt-2 text-muted-foreground">
            Start by requesting a service and booking your consultation.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link to="/book">
              Book a service <ArrowRight />
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6">
        <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/8 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm text-navy">
            Buzmark starts production once a{" "}
            <strong>{Math.round(DEPOSIT_RATE * 100)}% deposit</strong> of{" "}
            <strong>{formatMoney(depositFor(total))}</strong> is received on{" "}
            <strong>{order.order_number}</strong> ({formatMoney(total)} total). Pay the deposit now
            and settle the balance later, or pay in full and go straight to production.
          </p>
        </div>
      </div>


      <section className="bg-gradient-navy py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <ShieldCheck className="size-3" /> Secure checkout
          </p>
          <h1 className="mt-4 text-3xl font-extrabold text-navy-foreground">
            {grouped
              ? `Confirm & pay for ${group.length} picks`
              : `Confirm & pay for ${order.order_number}`}
          </h1>
          <p className="mt-2 text-navy-foreground/70">
            {grouped ? group.map((o) => o.title).join(" · ") : order.title}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6 shadow-card">
            <h2 className="font-display text-lg font-bold text-navy">
              {grouped ? "Pipelines running together" : "Project pipeline"}
            </h2>
            <div className="mt-4 space-y-4">
              {group.map((o) => (
                <div key={o.id} className="space-y-2">
                  {grouped && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-navy">{o.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {o.category} · {formatMoney(Number(o.amount ?? 0))}
                      </span>
                    </div>
                  )}
                  <PipelineTrack stage={o.stage} compact={grouped} />
                </div>
              ))}
            </div>
          </Card>


          <Card className="p-6 shadow-card">
            <h2 className="font-display text-lg font-bold text-navy">Choose what to pay</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  { key: "deposit" as const, label: `Deposit (${Math.round(DEPOSIT_RATE * 100)}%)`, amount: deposit },
                  { key: "full" as const, label: "Full package amount", amount: balance },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setChoice(opt.key)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    choice === opt.key
                      ? "border-brand bg-brand/6"
                      : "border-border hover:border-brand/40"
                  }`}
                >
                  <p className="text-sm font-semibold text-navy">{opt.label}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-brand">
                    {formatMoney(opt.amount)}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref">Transaction reference *</Label>
                <Input
                  id="ref"
                  required
                  value={reference}
                  maxLength={60}
                  placeholder="e.g. SJ84KD91X"
                  onChange={(e) => setReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required — we match your payment to this reference.
                </p>
              </div>
            </div>

            {method === "mpesa" && (
              <div className="mt-5 space-y-4 rounded-xl border border-brand/30 bg-brand/6 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Buy goods till
                    </p>
                    <p className="font-display text-lg font-extrabold text-navy">
                      {PAYMENT_ACCOUNTS.tillNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Paybill
                    </p>
                    <p className="font-display text-lg font-extrabold text-navy">
                      {PAYMENT_ACCOUNTS.paybill}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Account: {order.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Amount
                    </p>
                    <p className="font-display text-lg font-extrabold text-brand">
                      {formatMoney(payAmount)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="mpesaphone">M-Pesa phone number</Label>
                    <Input
                      id="mpesaphone"
                      type="tel"
                      maxLength={20}
                      placeholder="07XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="brandOutline"
                    className="h-10"
                    disabled={pushing || payAmount <= 0}
                    onClick={() => void sendMpesaPrompt()}
                  >
                    {pushing ? <Loader2 className="animate-spin" /> : <Smartphone />} Send M-Pesa
                    prompt
                  </Button>
                </div>
                {pushMessage && <p className="text-xs text-navy">{pushMessage}</p>}
              </div>
            )}

            {method === "bank_transfer" && (
              <div className="mt-5 grid gap-3 rounded-xl border border-border bg-sand p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Bank
                  </p>
                  <p className="font-semibold text-navy">
                    {PAYMENT_ACCOUNTS.bankName} · {PAYMENT_ACCOUNTS.bankBranch}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Account name
                  </p>
                  <p className="font-semibold text-navy">{PAYMENT_ACCOUNTS.bankAccountName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Account number
                  </p>
                  <p className="font-display text-lg font-extrabold text-navy">
                    {PAYMENT_ACCOUNTS.bankAccountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    SWIFT
                  </p>
                  <p className="font-semibold text-navy">{PAYMENT_ACCOUNTS.swift}</p>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Use <strong>{order.order_number}</strong> as the transfer narration, then paste the
                  bank reference above.
                </p>
              </div>
            )}

            {method === "card" && (

              <div className="mt-5 grid gap-4 rounded-xl border border-border bg-sand p-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cardnum">Card number</Label>
                  <Input
                    id="cardnum"
                    inputMode="numeric"
                    maxLength={23}
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cardname">Name on card</Label>
                  <Input
                    id="cardname"
                    maxLength={80}
                    value={card.name}
                    onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cardexp">Expiry (MM/YY)</Label>
                  <Input
                    id="cardexp"
                    maxLength={5}
                    placeholder="09/28"
                    value={card.expiry}
                    onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cardcvc">CVC</Label>
                  <Input
                    id="cardcvc"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="123"
                    value={card.cvc}
                    onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-6 shadow-card">
          <h2 className="font-display text-lg font-bold text-navy">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Package</dt>
              <dd className="font-semibold text-navy">{order.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold text-navy">{formatMoney(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Already paid</dt>
              <dd className="font-semibold text-navy">{formatMoney(paid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="font-semibold text-navy">{formatMoney(balance)}</dd>
            </div>
          </dl>
          <Badge variant="outline" className="mt-4 rounded-full border-brand/30 bg-brand/10 text-brand">
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </Badge>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Paying now</span>
            <span className="font-display text-xl font-extrabold text-navy">
              {formatMoney(payAmount)}
            </span>
          </div>
          <Button
            variant="brand"
            className="mt-4 h-11 w-full"
            disabled={paying || payAmount <= 0}
            onClick={() => void pay()}
          >
            {paying ? <Loader2 className="animate-spin" /> : <CreditCard />}
            {balance <= 0 ? "Fully paid" : "Confirm payment"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Your order only moves to the next stage once this step is completed.
          </p>
        </Card>
      </section>
    </SiteLayout>
  );
}
