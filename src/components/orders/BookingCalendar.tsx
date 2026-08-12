import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labelize } from "@/lib/brand";

export type CalendarBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  service_category: string;
  staff_preference: string;
  status: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Month grid highlighting the days the agency is booked. */
export function BookingCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      if (!b.booking_date) continue;
      const key = b.booking_date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return map;
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const today = ymd(new Date());
  const selectedList = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <CalendarDays className="size-5 text-brand" />
            {cursor.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Next month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {DAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const key = ymd(date);
            const list = byDay.get(key) ?? [];
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                  isSelected
                    ? "border-brand bg-brand text-brand-foreground"
                    : list.length
                      ? "border-brand/40 bg-brand/10 text-navy hover:border-brand"
                      : "border-border text-muted-foreground hover:border-brand/40"
                } ${isToday && !isSelected ? "ring-1 ring-navy/40" : ""}`}
              >
                <span className="font-semibold">{date.getDate()}</span>
                {!!list.length && (
                  <span className="text-[10px] font-bold">
                    {list.length} booked
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Highlighted days already have confirmed or requested bookings.
        </p>
      </Card>

      <Card className="h-fit p-6 shadow-card">
        <h3 className="font-display text-base font-bold text-navy">
          {selected
            ? new Date(`${selected}T00:00:00`).toLocaleDateString("en-KE", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Pick a day"}
        </h3>
        <div className="mt-4 space-y-3">
          {!selected && (
            <p className="text-sm text-muted-foreground">
              Select a date to see who we are meeting.
            </p>
          )}
          {selected && !selectedList.length && (
            <p className="text-sm text-muted-foreground">No bookings — this day is free.</p>
          )}
          {selectedList.map((b) => (
            <div key={b.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy">{b.booking_time}</p>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {labelize(b.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {b.service_category} · {b.staff_preference}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
