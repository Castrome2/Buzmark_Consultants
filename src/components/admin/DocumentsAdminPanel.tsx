import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentCard, type DocRow } from "@/components/dashboard/DocumentsPanel";

type Client = { id: string; first_name: string | null; last_name: string | null; email: string | null };

/** Admin view of the auto-generated proposals and invoices, with correction support. */
export function DocumentsAdminPanel({ clients }: { clients: Client[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<DocRow | null>(null);

  const docsQ = useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_documents")
        .select("*")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (doc: DocRow) => {
      const { error } = await supabase
        .from("order_documents")
        .update({
          title: doc.title,
          summary: doc.summary,
          subtotal: Number(doc.subtotal),
          terms: doc.terms,
          status: doc.status,
          edited: true,
        })
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document corrected");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["admin-documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function nameOf(userId: string) {
    const c = clients.find((x) => x.id === userId);
    return [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Client";
  }

  const list = (docsQ.data ?? []).filter((d) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      d.doc_number.toLowerCase().includes(t) ||
      d.title.toLowerCase().includes(t) ||
      nameOf(d.user_id).toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents by number, client or title"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {list.length} document{list.length === 1 ? "" : "s"} generated automatically
        </p>
      </Card>

      {docsQ.isLoading && <Skeleton className="h-64 w-full" />}

      {list.map((d) => (
        <DocumentCard
          key={d.id}
          doc={d}
          client={nameOf(d.user_id)}
          actions={
            <Button size="sm" variant="outline" onClick={() => setEditing({ ...d })}>
              <Pencil /> Correct
            </Button>
          }
        />
      ))}

      {!docsQ.isLoading && !list.length && (
        <Card className="p-12 text-center text-muted-foreground">No documents yet.</Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Correct document</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Summary</Label>
                <Textarea
                  rows={4}
                  value={editing.summary ?? ""}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    value={editing.subtotal}
                    onChange={(e) => setEditing({ ...editing, subtotal: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Input
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Terms</Label>
                <Textarea
                  rows={3}
                  value={editing.terms ?? ""}
                  onChange={(e) => setEditing({ ...editing, terms: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={save.isPending}
              onClick={() => editing && save.mutate(editing)}
            >
              Save correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
