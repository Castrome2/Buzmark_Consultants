import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/brand";

type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  department?: string | null;
};

const ROLES = ["admin", "staff", "client"] as const;

export const DEPARTMENTS = [
  "Executive",
  "Accounts & Finance",
  "Creative & Branding",
  "Marketing",
  "Client Service",
  "Production",
] as const;

/** Role and department control for admin-side access, plus an admin sign-in log. */
export function AccessRolesPanel({ clients }: { clients: Client[] }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const rolesQ = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const signInsQ = useQuery({
    queryKey: ["admin-sign-ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, user_id, action, created_at, user_agent")
        .eq("action", "sign_in")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as (typeof ROLES)[number] });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access level updated");
      void qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDepartment = useMutation({
    mutationFn: async ({ userId, department }: { userId: string; department: string }) => {
      const { error } = await supabase.from("profiles").update({ department }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department saved");
      void qc.invalidateQueries({ queryKey: ["admin-clients"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function roleOf(userId: string) {
    const list = (rolesQ.data ?? []).filter((r) => r.user_id === userId).map((r) => r.role);
    if (list.includes("admin")) return "admin";
    if (list.includes("staff")) return "staff";
    return "client";
  }

  function personOf(userId: string | null) {
    const c = clients.find((x) => x.id === userId);
    return {
      name: [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Unknown user",
      email: c?.email ?? "—",
      department: c?.department ?? null,
      role: userId ? roleOf(userId) : "client",
    };
  }

  return (
    <div className="space-y-4">
      <Card className="p-0 shadow-card">
        <div className="flex items-center gap-2 border-b border-border p-5">
          <UserCog className="size-4 text-brand" />
          <h2 className="font-display text-base font-bold text-navy">
            Access levels &amp; departments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Access level</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-navy">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                  <TableCell>
                    <Select
                      value={roleOf(c.id)}
                      onValueChange={(role) => {
                        setPending(c.id);
                        setRole.mutate({ userId: c.id, role }, { onSettled: () => setPending(null) });
                      }}
                    >
                      <SelectTrigger className="h-9 w-36" disabled={pending === c.id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r === "admin" ? "Administrator" : r === "staff" ? "Staff" : "Client"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={c.department ?? ""}
                      list="buzmark-departments"
                      placeholder="e.g. Accounts & Finance"
                      className="h-9 w-56"
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value !== (c.department ?? ""))
                          setDepartment.mutate({ userId: c.id, department: value });
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <datalist id="buzmark-departments">
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand" />
          <h2 className="font-display text-base font-bold text-navy">Sign-in security log</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Who signed in, with which access level and department.
        </p>
        <div className="mt-3 divide-y divide-border">
          {(signInsQ.data ?? []).map((s) => {
            const p = personOf(s.user_id);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">
                    {p.name}{" "}
                    <Badge
                      variant="outline"
                      className={
                        p.role === "client"
                          ? "rounded-full text-[10px]"
                          : "rounded-full border-brand/40 text-[10px] text-brand"
                      }
                    >
                      {p.role === "admin" ? "Administrator" : p.role === "staff" ? "Staff" : "Client"}
                    </Badge>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email}
                    {p.department ? ` · ${p.department}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</span>
              </div>
            );
          })}
          {!signInsQ.data?.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">No sign-ins recorded.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
