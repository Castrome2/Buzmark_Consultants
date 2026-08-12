import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Loader2, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SERVICE_CATEGORIES,
  TIME_SLOTS,
  BUDGET_RANGES,
  depositFor,
  DEPOSIT_RATE,
  serviceMeta,
  isPricedCategory,
} from "@/lib/brand";
import { logActivity } from "@/lib/audit";

const schema = z.object({
  service_category: z.string().min(1, "Choose a service"),
  booking_date: z.string().min(1, "Choose a date"),
  booking_time: z.string().min(1, "Choose a time"),
  staff_preference: z.string().min(1),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  description: z.string().trim().max(1000).optional(),
  budget: z.string().max(60).optional(),
});

/** Booking meeting form — lives inside the client dashboard as a tab. */
export function BookingForm({ presetService }: { presetService?: string }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();




  const [form, setForm] = useState({
    service_category: presetService ?? "",
    booking_date: "",
    booking_time: "",
    staff_preference: "Any Available",
    company: "",
    email: "",
    phone: "",
    description: "",
    budget: "",
  });

  // Auto-pick what we already know about the client — every field stays editable.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      service_category: f.service_category || presetService || "",
      email: f.email || profile?.email || user?.email || "",
      phone: f.phone || profile?.phone || "",
      company: f.company || profile?.company || "",
    }));
  }, [presetService, profile?.email, profile?.phone, profile?.company, user?.email]);

  const value = <K extends keyof typeof form>(k: K) => form[k];
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSaving(true);
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({ ...parsed.data, user_id: user!.id })
      .select("id, service_category, booking_date, booking_time")
      .single();
    if (error || !booking) {
      setSaving(false);
      return toast.error(error?.message ?? "Could not save your booking");
    }

    // Only Training, Consulting and Branding carry an up-front price.
    let amount = 0;
    if (isPricedCategory(booking.service_category)) {
      const { data: catServices } = await supabase
        .from("services")
        .select("price_from")
        .eq("category", booking.service_category)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1);
      amount = Number(catServices?.[0]?.price_from ?? 0);
    }

    const { data: order } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        booking_id: booking.id,
        title: `${booking.service_category} meeting engagement`,
        category: booking.service_category,
        amount,
        deposit_amount: depositFor(amount),
        stage: "booking",
        status: "pending",
        notes: parsed.data.description || null,
      })
      .select("id")
      .single();

    // Alert the admin team about the new meeting (shows in messages + calendar).
    await supabase.from("messages").insert({
      client_id: user!.id,
      sender_id: user!.id,
      order_id: order?.id ?? null,
      body: `New meeting booked: ${booking.service_category} on ${booking.booking_date} at ${booking.booking_time}.`,
    });

    setSaving(false);
    void logActivity("booking_created", { detail: booking.service_category });
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
    qc.invalidateQueries({ queryKey: ["my-orders"] });

    toast.success("Meeting booked successfully — the Buzmark team has been alerted.");
    navigate({ to: "/meetings" });
  }

  return (
    <Card className="p-7 shadow-card">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Service category</Label>
          <Select
            value={value("service_category")}
            onValueChange={(v) => set("service_category", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a service" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Picked automatically from the service you requested — change it any time.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Preferred date</Label>
          <Input
            id="date"
            type="date"
            value={value("booking_date")}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => set("booking_date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred time</Label>
          <Select value={value("booking_time")} onValueChange={(v) => set("booking_time", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a slot" />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bstaff">Preferred consultant</Label>
          <Input
            id="bstaff"
            value={value("staff_preference")}
            maxLength={80}
            placeholder="Type a name, or leave as Any Available"
            onChange={(e) => set("staff_preference", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Budget range</Label>
          <Select value={value("budget")} onValueChange={(v) => set("budget", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_RANGES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bcompany">Company</Label>
          <Input
            id="bcompany"
            value={value("company")}
            maxLength={120}
            onChange={(e) => set("company", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bphone">Phone</Label>
          <Input
            id="bphone"
            type="tel"
            value={value("phone")}
            maxLength={20}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bemail">Email</Label>
          <Input
            id="bemail"
            type="email"
            value={value("email")}
            maxLength={255}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bdesc">Project description</Label>
          <Textarea
            id="bdesc"
            rows={4}
            maxLength={1000}
            value={value("description")}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What do you want to achieve?"
          />
        </div>

        {!!value("service_category") && (
          <div className="rounded-xl border border-brand/30 bg-brand/6 p-4 sm:col-span-2">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="size-3 text-brand" />
                {serviceMeta(value("service_category")).event}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3 text-brand" />
                {serviceMeta(value("service_category")).duration}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {isPricedCategory(value("service_category"))
                ? `Priced engagement — a ${Math.round(DEPOSIT_RATE * 100)}% deposit starts production.`
                : "No up-front cost — we scope and quote this after the meeting."}
            </p>
          </div>
        )}

        <Button type="submit" variant="brand" className="h-11 sm:col-span-2" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <CalendarCheck />} Book meeting
        </Button>
      </form>
    </Card>
  );
}
