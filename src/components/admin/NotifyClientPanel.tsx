import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/brand";

type Client = { id: string; first_name: string | null; last_name: string | null; email: string | null };

/** Lets the admin push a notification to one client or broadcast to all clients. */
export function NotifyClientPanel({ clients }: { clients: Client[] }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const sentQ = useQuery({
    queryKey: ["admin-sent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, body, type, created_at")
        .eq("type", "admin")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const recipients = target === "all" ? clients.map((c) => c.id) : [target];
      const rows = recipients.map((user_id) => ({
        user_id,
        title: title.trim(),
        body: body.trim() || null,
        type: "admin",
        link: "/dashboard",
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`Notification sent to ${n} client${n === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      void qc.invalidateQueries({ queryKey: ["admin-sent-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function nameOf(id: string) {
    const c = clients.find((x) => x.id === id);
    return [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Client";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-6 shadow-card">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-brand" />
          <h2 className="font-display text-base font-bold text-navy">Send a client notification</h2>
        </div>
        <div className="space-y-1.5">
          <Label>Recipient</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {nameOf(c.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Your proposal is ready"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={600}
            placeholder="Add the details the client should see in their dashboard."
          />
        </div>
        <Button
          variant="brand"
          disabled={send.isPending || !title.trim()}
          onClick={() => send.mutate()}
        >
          <Send /> Send notification
        </Button>
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="font-display text-base font-bold text-navy">Recently sent</h2>
        <div className="mt-3 divide-y divide-border">
          {(sentQ.data ?? []).map((n) => (
            <div key={n.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy">{n.title}</p>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {nameOf(n.user_id)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <p className="text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
            </div>
          ))}
          {!sentQ.data?.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No admin notifications sent yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
