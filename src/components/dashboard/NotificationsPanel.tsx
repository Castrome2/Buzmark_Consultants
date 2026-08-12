import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/brand";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const TYPE_TONES: Record<string, string> = {
  payment: "bg-emerald-500/12 text-emerald-700",
  order: "bg-brand/12 text-brand",
  booking: "bg-sky-500/12 text-sky-700",
  info: "bg-muted text-muted-foreground",
};

export function useUnreadCount() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function NotificationsPanel() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState("10");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);

  const listQ = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, link, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
  };

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Notification removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = listQ.data ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((n) => {
      if (filter === "unread" && n.read_at) return false;
      if (filter === "read" && !n.read_at) return false;
      if (!needle) return true;
      return `${n.title} ${n.body ?? ""} ${n.type}`.toLowerCase().includes(needle);
    });
  }, [all, q, filter]);

  const perPage = Number(entries);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * perPage, safePage * perPage + perPage);
  const unread = all.filter((n) => !n.read_at);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Bell className="size-4 text-brand" /> Manage notifications
          </p>
          <p className="text-xs text-muted-foreground">
            {unread.length} unread of {all.length} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!unread.length || markRead.isPending}
            onClick={() => markRead.mutate(unread.map((n) => n.id))}
          >
            <CheckCheck /> Mark all as read
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={!all.length || remove.isPending}
            onClick={() => remove.mutate(all.map((n) => n.id))}
          >
            <Trash2 /> Clear all
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select
              value={entries}
              onValueChange={(v) => {
                setEntries(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-20" aria-label="Entries per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "10", "25", "50"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <Select
              value={filter}
              onValueChange={(v) => {
                setFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-32" aria-label="Filter notifications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search notifications…"
                aria-label="Search notifications"
                className="h-9 pl-9"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {listQ.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BellOff className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications match this view.</p>
            </div>
          ) : (
            rows.map((n) => (
              <div
                key={n.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
                  n.read_at ? "border-border bg-card" : "border-brand/35 bg-brand/5"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{n.title}</p>
                    <Badge className={`border-0 ${TYPE_TONES[n.type] ?? TYPE_TONES.info}`}>
                      {n.type}
                    </Badge>
                    {!n.read_at && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-brand-foreground">
                        New
                      </span>
                    )}
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!n.read_at && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate([n.id])}>
                      <CheckCheck /> Mark read
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete notification"
                    className="text-destructive"
                    onClick={() => remove.mutate([n.id])}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {filtered.length ? safePage * perPage + 1 : 0}–
            {Math.min(filtered.length, safePage * perPage + perPage)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
