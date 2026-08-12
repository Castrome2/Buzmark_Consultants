import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/brand";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  order_id: string | null;
  created_at: string;
};

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange?.(n)}
          className={onChange ? "transition-transform hover:scale-110" : "cursor-default"}
        >
          <Star
            className={`size-5 ${n <= value ? "fill-brand text-brand" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsPanel({
  orders,
}: {
  orders: { id: string; order_number: string; title: string }[];
}) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [orderId, setOrderId] = useState("general");

  const reviewsQ = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, order_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        user_id: user!.id,
        order_id: orderId === "general" ? null : orderId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      setRating(5);
      setOrderId("general");
      toast.success("Thank you for your review!");
      qc.invalidateQueries({ queryKey: ["my-reviews", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["my-reviews", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderLabel = (id: string | null) =>
    orders.find((o) => o.id === id)?.order_number ?? "General experience";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-6">
        <h3 className="font-display text-lg font-bold text-navy">Leave a review</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us how the Buzmark team performed on your project.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-navy">Your rating</p>
            <Stars value={rating} onChange={setRating} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-navy">Related order</p>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger aria-label="Related order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General experience</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} · {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-navy">Your feedback</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well? What can we improve?"
              rows={5}
            />
          </div>

          <Button
            variant="brand"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="w-full"
          >
            {save.isPending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-lg font-bold text-navy">Your reviews</h3>
        <div className="mt-4 space-y-3">
          {reviewsQ.isLoading ? (
            [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : (reviewsQ.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              You haven't left a review yet.
            </p>
          ) : (
            (reviewsQ.data ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Stars value={r.rating} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {orderLabel(r.order_id)} · {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete review"
                    className="text-destructive"
                    onClick={() => remove.mutate(r.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
