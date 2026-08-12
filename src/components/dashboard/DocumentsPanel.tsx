import { useQuery } from "@tanstack/react-query";
import { FileText, Printer, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMoney, labelize } from "@/lib/brand";

export type DocRow = {
  id: string;
  order_id: string;
  user_id: string;
  kind: string;
  doc_number: string;
  title: string;
  summary: string | null;
  line_items: unknown;
  subtotal: number;
  amount_paid: number;
  terms: string | null;
  status: string;
  issued_at: string;
};

export type DocLine = { description?: string; category?: string; quantity?: number; amount?: number };

export function docLines(doc: DocRow): DocLine[] {
  return Array.isArray(doc.line_items) ? (doc.line_items as DocLine[]) : [];
}

/** Opens a clean, printable/downloadable version of the document. */
export function printDocument(doc: DocRow, client: string) {
  const rows = docLines(doc)
    .map(
      (l) =>
        `<tr><td>${l.description ?? ""}</td><td>${l.category ?? ""}</td><td style="text-align:right">${l.quantity ?? 1}</td><td style="text-align:right">${formatMoney(Number(l.amount ?? 0))}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${doc.doc_number}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#12203c;margin:40px;}
    h1{color:#1B2A4A;margin:0;font-size:26px} .brand{color:#F26522}
    table{width:100%;border-collapse:collapse;margin-top:18px}
    th,td{border-bottom:1px solid #e6e8ee;padding:10px;font-size:13px;text-align:left}
    th{background:#f6f7fa;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
    .muted{color:#667;font-size:12px} .total{margin-top:18px;font-size:16px;font-weight:800}
  </style></head><body>
  <h1>BUZ<span class="brand">MARK</span> AGENCY</h1>
  <p class="muted">${labelize(doc.kind)} · ${doc.doc_number} · Issued ${formatDate(doc.issued_at)}</p>
  <h2 style="font-size:18px">${doc.title}</h2>
  <p class="muted">Prepared for: ${client}</p>
  <p>${doc.summary ?? ""}</p>
  <table><thead><tr><th>Description</th><th>Category</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="total">Total: ${formatMoney(Number(doc.subtotal))} · Paid: ${formatMoney(Number(doc.amount_paid))} · Balance: ${formatMoney(Math.max(0, Number(doc.subtotal) - Number(doc.amount_paid)))}</p>
  <p class="muted">${doc.terms ?? ""}</p>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function DocumentCard({
  doc,
  client,
  actions,
}: {
  doc: DocRow;
  client: string;
  actions?: React.ReactNode;
}) {
  const balance = Math.max(0, Number(doc.subtotal) - Number(doc.amount_paid));
  return (
    <Card className="space-y-4 p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {doc.kind === "invoice" ? (
            <ReceiptText className="mt-0.5 size-5 text-brand" />
          ) : (
            <FileText className="mt-0.5 size-5 text-brand" />
          )}
          <div>
            <p className="font-display text-base font-bold text-navy">{doc.title}</p>
            <p className="font-mono text-xs text-brand">{doc.doc_number}</p>
            <p className="text-xs text-muted-foreground">Issued {formatDate(doc.issued_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {labelize(doc.kind)} · {labelize(doc.status)}
          </Badge>
          {actions}
          <Button size="sm" variant="outline" onClick={() => printDocument(doc, client)}>
            <Printer /> Print / save
          </Button>
        </div>
      </div>

      {doc.summary && <p className="text-sm text-muted-foreground">{doc.summary}</p>}

      <div className="divide-y divide-border rounded-lg border border-border">
        {docLines(doc).map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="min-w-0 truncate text-navy">
              {l.description}{" "}
              <span className="text-xs text-muted-foreground">· {l.category}</span>
            </span>
            <span className="font-semibold text-navy">{formatMoney(Number(l.amount ?? 0))}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sand p-4 text-sm">
        <span className="text-muted-foreground">
          Paid {formatMoney(Number(doc.amount_paid))} of {formatMoney(Number(doc.subtotal))}
        </span>
        <span className="font-display text-lg font-extrabold text-navy">
          Balance {formatMoney(balance)}
        </span>
      </div>

      {doc.terms && <p className="text-xs text-muted-foreground">{doc.terms}</p>}
    </Card>
  );
}

/** Client-facing proposals and invoices, generated automatically per order. */
export function DocumentsPanel({ clientName }: { clientName: string }) {
  const { user } = useSession();
  const docsQ = useQuery({
    queryKey: ["my-documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_documents")
        .select("*")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  if (docsQ.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!docsQ.data?.length)
    return (
      <Card className="p-12 text-center text-muted-foreground">
        Your proposals and invoices appear here automatically once an order is opened.
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card className="border-brand/30 bg-brand/5 p-4 text-sm text-muted-foreground">
        Every order automatically generates a Buzmark proposal, and an invoice once the engagement
        is priced. Our team can correct a document if anything looks off.
      </Card>
      {docsQ.data.map((d) => (
        <DocumentCard key={d.id} doc={d} client={clientName} />
      ))}
    </div>
  );
}
