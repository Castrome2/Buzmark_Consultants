import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/brand";

type Props = {
  /** Client the thread belongs to. Defaults to the signed-in user. */
  clientId?: string;
  /** Optional order the conversation is about. */
  orderId?: string | null;
  /** True when the Buzmark team is writing. */
  asAdmin?: boolean;
  title?: string;
};

/** Shared message centre between a client and the Buzmark team. */
export function MessageThread({ clientId, orderId = null, asAdmin = false, title }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const target = clientId ?? user?.id;

  const messagesQ = useQuery({
    queryKey: ["messages", target],
    enabled: !!target,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("client_id", target!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Write a message first");
      if (text.length > 2000) throw new Error("Message is too long");
      const { error } = await supabase.from("messages").insert({
        client_id: target!,
        sender_id: user!.id,
        from_admin: asAdmin,
        order_id: orderId,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", target] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="flex h-full flex-col p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
        <MessagesSquare className="size-5 text-brand" /> {title ?? "Message centre"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {asAdmin
          ? "Reply to the client — they see this in their dashboard."
          : "Talk to the Buzmark team about your project. We reply here."}
      </p>

      <div className="mt-4 max-h-80 flex-1 space-y-3 overflow-y-auto pr-1">
        {messagesQ.isLoading && <Skeleton className="h-24 w-full" />}
        {!messagesQ.isLoading && !messagesQ.data?.length && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {(messagesQ.data ?? []).map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  mine ? "bg-brand text-brand-foreground" : "bg-sand text-navy"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "opacity-75" : "text-muted-foreground"}`}>
                  {m.from_admin ? "Buzmark team" : "Client"} · {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <Textarea
          rows={3}
          maxLength={2000}
          value={body}
          placeholder="Write a message…"
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" variant="brand" className="w-full" disabled={send.isPending}>
          {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send message
        </Button>
      </form>
    </Card>
  );
}
