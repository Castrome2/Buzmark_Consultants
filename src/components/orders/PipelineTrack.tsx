import { CheckCircle2, Circle } from "lucide-react";
import { STAGE_LABELS, STAGE_HINTS, stagesForOrder } from "@/lib/brand";
import { cn } from "@/lib/utils";

const TONE: Record<string, { dot: string; line: string; text: string }> = {
  request: { dot: "bg-warning text-navy", line: "bg-warning", text: "text-warning" },
  booking: { dot: "bg-navy text-navy-foreground", line: "bg-navy", text: "text-navy" },
  payment: { dot: "bg-brand text-brand-foreground", line: "bg-brand", text: "text-brand" },
  service: { dot: "bg-brand text-brand-foreground", line: "bg-brand", text: "text-brand" },
  completed: { dot: "bg-success text-navy-foreground", line: "bg-success", text: "text-success" },
};

export function PipelineTrack({
  stage,
  compact,
  priced = true,
}: {
  stage: string;
  compact?: boolean;
  /** Paid engagements schedule the meeting, then collect payment before delivery. */
  priced?: boolean;
}) {
  const stages = stagesForOrder(priced);
  const index = Math.max(0, stages.indexOf(stage as (typeof stages)[number]));

  return (
    <div className={cn("rounded-xl border border-border bg-sand", compact ? "p-3" : "p-4")}>
      <div className="flex items-start">
        {stages.map((s, i) => {
          const done = i < index;
          const active = i === index;
          const tone = TONE[s];
          return (
            <div key={s} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0 ? "opacity-0" : done || active ? tone.line : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-transparent",
                    done || active ? tone.dot : "border-border bg-card text-muted-foreground",
                    active && "ring-4 ring-current/15",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className={cn("size-2.5", active && "fill-current")} />
                  )}
                </span>
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === stages.length - 1 ? "opacity-0" : done ? tone.line : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 text-[10px] font-bold uppercase tracking-wide",
                  done || active ? tone.text : "text-muted-foreground",
                )}
              >
                {s === "booking" && priced ? "Scheduled" : STAGE_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {STAGE_HINTS[stages[index]]}
        </p>
      )}
    </div>
  );
}
