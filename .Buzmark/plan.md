## Heads up first

This project is currently **empty** (fresh template — only a placeholder home page). The changes described in your message (order timeline, auth page, admin dashboard, brand colours) don't exist here — that work was done in a different project. So we're building from zero.

Your full spec is a multi-month platform (CRM, invoicing, M-Pesa, employee portal, marketing analytics, support tickets). I'd build it in phases, starting with the parts you emphasised most.

## Brand system (applies everywhere)

From your logo:
- Navy `#1B2A4A`, Orange `#F26522`, warm off-white surfaces
- Bold condensed headings + clean sans body
- Logo used in header, footer, auth card
- Your 3 uploaded photos used as animated hero/section backgrounds (Ken Burns + fade cross-slides, Framer Motion)

## Phase 1 — Marketing site + backend foundation

Routes: `/` (animated hero, stats, services preview, managed companies, portfolio, testimonials, booking CTA, footer), `/about`, `/services` + `/services/$slug`, `/industries`, `/portfolio`, `/clients` + `/clients/$slug`, `/contact`, `/book`.

Lovable Cloud enabled for: auth, profiles, roles, bookings, orders, companies, services, portfolio, testimonials.

## Phase 2 — Auth + portals (the parts you called out)

**Auth page `/auth`** styled to match your uploaded screenshot: centered white card on brand background, logo + tagline, country code + phone number, password with eye toggle, "Remember me" + **Forgot password**, full-width orange SIGN IN, "OR CONTINUE" divider, "AS GUEST", "Don't have an account? Sign up". Register tab adds confirm-password with live match check. Plus `/reset-password` page.

**Client dashboard `/dashboard`**
- Navy-gradient welcome banner: "Welcome, {first name}"
- Card/tile layout: bookings, orders, invoices, meetings summary
- **Cart** for selecting services before checkout/booking
- Booking list with **edit + delete** by the client
- **Order status timeline**: readable horizontal stepper (Pending → In Progress → Sold → Completed → Closed) plus a chronological event feed showing order number, category changes, status changes, deadlines, actor, timestamps

**Admin dashboard `/admin`**
- Dashboard-format layout (KPI cards, charts, panels) — not plain rows
- Manage bookings, orders, clients, companies, services
- Same timeline stepper per order
- Role-based access via a separate `user_roles` table + `has_role()` (never a role column on profiles)

Data: `order_events` table with a DB trigger that auto-logs creation, status change, category change, deadline change.

## Phase 3 (later, on request)

Invoicing, M-Pesa/Stripe payments, CRM pipeline, marketing analytics dashboard, employee portal, support tickets, blog/resources, careers.

## Technical notes

Stack is fixed: TanStack Start (React 19 + TS), Tailwind v4 design tokens in `src/styles.css`, shadcn components with brand variants, Lovable Cloud (Postgres + auth + storage + server functions). Next.js/NestJS/Clerk/S3 from your list aren't used — Cloud covers those roles. Payments would come via the built-in Stripe/Paddle integration in Phase 3.

I'll build Phase 1 and Phase 2 in this pass; Phase 3 after you review.
</content>
<summary>Phased build plan for the Buzmark platform: brand system, marketing site, auth matching your screenshot, client dashboard with cart + order timeline, and admin dashboard</summary>
</invoke>
