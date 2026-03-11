import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Search, ChevronLeft, ChevronRight, Building2 } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  created: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  updated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  deleted: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  status_changed: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export function ActivityLogTab() {
  const [search, setSearch] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, slug").order("name");
      return data || [];
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-activity-logs", filterCompanyId, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_activity_timeline", {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_company_id: filterCompanyId === "all" ? null : filterCompanyId,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-for-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  const getProfileName = (id: string) => profiles.find((p: any) => p.id === id)?.full_name || "System";
  const getCompanyName = (id: string) => companies.find((c: any) => c.id === id)?.name || "—";

  const filtered = search
    ? logs.filter((l: any) =>
        (l.entity_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.event_type || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.entity_type || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" /> Activity Log
      </h1>

      <div className="flex flex-wrap gap-3">
        <Select value={filterCompanyId} onValueChange={(v) => { setFilterCompanyId(v); setPage(0); }}>
          <SelectTrigger className="w-[220px]">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Semua Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Company</SelectItem>
            {companies.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari activity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-border/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada activity log</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yy HH:mm", { locale: idLocale })}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{log.company_id ? getCompanyName(log.company_id) : "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{log.user_id ? getProfileName(log.user_id) : "System"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${EVENT_COLORS[log.event_type] || "bg-muted text-muted-foreground"}`}>
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs font-medium capitalize">{log.entity_type || "—"}</span>
                          {log.entity_name && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{log.entity_name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {log.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={logs.length < pageSize} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
