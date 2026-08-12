export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/industries", label: "Industries" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/clients", label: "Clients" },
  { to: "/contact", label: "Contact" },
] as const;

export const STATS = [
  { value: "50+", label: "Projects delivered" },
  { value: "20+", label: "Industries served" },
  { value: "95%", label: "Client satisfaction" },
  { value: "12", label: "Creative experts" },
] as const;

export const INDUSTRIES = [
  { name: "Businesses & SMEs", note: "Growth systems for owner-led companies" },
  { name: "Schools", note: "Admissions marketing and management systems" },
  { name: "Hospitals", note: "Patient-facing brand and digital care journeys" },
  { name: "NGOs", note: "Donor storytelling and impact reporting" },
  { name: "Government", note: "Public communication and service portals" },
  { name: "Restaurants", note: "Menus, delivery funnels and social presence" },
  { name: "Hotels", note: "Direct booking and destination campaigns" },
  { name: "Financial Institutions", note: "Trust-first brand and compliance-safe content" },
  { name: "Manufacturing", note: "B2B positioning and distributor enablement" },
  { name: "Real Estate", note: "Listing campaigns and development launches" },
] as const;

export const SERVICE_CATEGORIES = [
  "Branding",
  "Marketing",
  "Photography",
  "Website",
  "Consulting",
  "Videography",
  "Training",
  "Team Building",
  "Event & MC",
] as const;

export const STAFF = ["Any Available", "John", "Jane", "Michael"] as const;

export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export const BUDGET_RANGES = [
  "Under KES 50,000",
  "KES 50,000 – 150,000",
  "KES 150,000 – 500,000",
  "KES 500,000 – 1M",
  "Above KES 1M",
] as const;

export const ORDER_STATUSES = [
  "pending",
  "in_progress",
  "sold",
  "completed",
  "closed",
  "cancelled",
] as const;

export const ORDER_STEPS = ["pending", "in_progress", "sold", "completed", "closed"] as const;

export const BOOKING_STATUSES = [
  "new",
  "contacted",
  "pending",
  "in_progress",
  "sold",
  "closed",
  "cancelled",
] as const;

export function labelize(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const EVENT_LABELS: Record<string, string> = {
  created: "Order created",
  status_changed: "Status changed",
  category_changed: "Category changed",
  deadline_changed: "Deadline changed",
  amount_changed: "Amount changed",
  payment_recorded: "Payment recorded",
  stage_changed: "Stage changed",
};

export function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------- Order pipeline (request -> booking -> payment -> service -> completed) ---------- */

export const ORDER_STAGES = ["request", "booking", "payment", "service", "completed"] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  request: "Request",
  booking: "Booking",
  payment: "Payment",
  service: "Service delivery",
  completed: "Completed",
};

export const STAGE_HINTS: Record<string, string> = {
  request: "Client submitted an interest request.",
  booking: "Consultation booked and details captured.",
  payment: "Deposit received — awaiting full settlement.",
  service: "Work in production with the Buzmark team.",
  completed: "Delivered, approved and closed.",
};

export const DEPOSIT_RATE = 0.3;

export function depositFor(amount: number) {
  return Math.round(amount * DEPOSIT_RATE);
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit paid",
  paid: "Paid in full",
};

export const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
] as const;

/* ---------- Service category metadata (event focus + package duration) ---------- */

export type ServiceMeta = { event: string; duration: string };

export const SERVICE_META: Record<string, ServiceMeta> = {
  Branding: { event: "Brand discovery workshop", duration: "3–4 weeks" },
  Marketing: { event: "Campaign launch sprint", duration: "1 month (renewable)" },
  Photography: { event: "Studio & on-location shoot day", duration: "1–2 weeks" },
  Website: { event: "Product & content mapping session", duration: "4–6 weeks" },
  Consulting: { event: "Strategy roundtable", duration: "2 weeks" },
  Videography: { event: "Production shoot days", duration: "2–3 weeks" },
  Training: { event: "Team training session", duration: "2–5 days" },
  "Team Building": { event: "Offsite team experience", duration: "1–2 days" },
  "Event & MC": { event: "Event hosting & master of ceremonies", duration: "1–3 event days" },
};

export function serviceMeta(category: string | null | undefined): ServiceMeta {
  return (
    (category && SERVICE_META[category]) || {
      event: "Kick-off session",
      duration: "2–4 weeks",
    }
  );
}

/* ---------- Pricing policy: only these categories are charged up-front ---------- */

export const PRICED_CATEGORIES = ["Training", "Consulting", "Branding"] as const;

export function isPricedCategory(category: string | null | undefined) {
  return !!category && (PRICED_CATEGORIES as readonly string[]).includes(category);
}

/** Price label used across the portal — unpriced categories are quoted in the meeting. */
export function priceLabel(category: string | null | undefined, amount: number | null | undefined) {
  if (!isPricedCategory(category)) return "Quoted during meeting · deposit payment made";
  if (amount == null || !amount) return "Priced engagement";
  return `From ${formatMoney(amount)}`;
}

/**
 * Every engagement — priced up front or quoted during the meeting — settles a
 * deposit before delivery, so the payment stage always appears:
 * request → booking → payment → service → completed
 */
export function stagesForOrder(_priced = true): readonly OrderStage[] {
  return ORDER_STAGES;
}


/** Time-of-day greeting for the client dashboard. */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

