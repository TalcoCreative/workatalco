import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Eye, CheckCircle2, Mail, Phone, Building2, CalendarDays, Clock, Video, ChevronLeft, ChevronRight, Link2, ExternalLink, MessageCircle, Send } from "lucide-react";

const WA_PHONE = "6285117084889";

function buildWaLink(phone: string, demo: any, gmeetLink: string) {
  // Use the requester's phone; fallback to admin WA
  const target = phone?.replace(/\D/g, "") || WA_PHONE;
  const dateStr = demo.demo_date ? format(parseISO(demo.demo_date), "dd MMMM yyyy", { locale: idLocale }) : "-";
  const timeStr = demo.demo_time ? demo.demo_time.slice(0, 5) : "-";
  const msg = encodeURIComponent(
    `Halo ${demo.name},\n\n` +
    `Terima kasih sudah request demo WORKA! 🎉\n\n` +
    `Berikut detail jadwal demo Anda:\n` +
    `📅 Tanggal: ${dateStr}\n` +
    `⏰ Jam: ${timeStr} WIB\n` +
    `🔗 Google Meet: ${gmeetLink}\n\n` +
    `Sampai bertemu di sesi demo! 🙌`
  );
  return `https://wa.me/${target}?text=${msg}`;
}

export function DemoRequestsTab() {
  const queryClient = useQueryClient();
  const [selectedDemo, setSelectedDemo] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [gmeetInput, setGmeetInput] = useState("");

  const { data: demos = [], isLoading } = useQuery({
    queryKey: ["admin-demo-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("demo_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] });
    },
  });

  const updateGmeet = useMutation({
    mutationFn: async ({ id, gmeet_link }: { id: string; gmeet_link: string }) => {
      const { error } = await supabase.from("demo_requests").update({ gmeet_link } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Google Meet link saved");
      queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demo_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo request deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-demo-requests"] });
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      contacted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const demosWithDate = demos.filter((d: any) => d.demo_date);
  const getDemosForDay = (day: Date) =>
    demosWithDate.filter((d: any) => isSameDay(parseISO(d.demo_date), day))
      .sort((a: any, b: any) => (a.demo_time || "").localeCompare(b.demo_time || ""));

  const pendingCount = demos.filter((d: any) => d.status === "pending").length;
  const scheduledCount = demosWithDate.length;

  // Day schedule panel data
  const dayScheduleDemos = selectedDay ? getDemosForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{demos.length}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{scheduledCount}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1 gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
          <TabsTrigger value="list" className="flex-1 gap-1.5"><Eye className="h-3.5 w-3.5" /> All Requests</TabsTrigger>
        </TabsList>

        {/* ══ CALENDAR TAB ══ */}
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy", { locale: idLocale })}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => (
                    <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {daysInMonth.map(day => {
                    const dayDemos = getDemosForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        className={`min-h-[80px] rounded-lg border p-1 transition-all text-left ${
                          isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" :
                          isToday ? "border-primary/40 bg-primary/5" : "border-border/30 hover:bg-muted/30"
                        }`}
                      >
                        <p className={`text-[10px] font-medium mb-0.5 ${isToday || isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          {format(day, "d")}
                        </p>
                        <div className="space-y-0.5">
                          {dayDemos.slice(0, 3).map((d: any) => (
                            <div
                              key={d.id}
                              className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                                d.status === "completed" ? "bg-emerald-500/10 text-emerald-700" :
                                d.status === "contacted" ? "bg-blue-500/10 text-blue-700" :
                                "bg-warning/10 text-warning"
                              }`}
                            >
                              <span className="font-bold">{d.demo_time?.slice(0, 5) || "?"}</span>{" "}
                              <span className="opacity-80">{d.company_name}</span>
                            </div>
                          ))}
                          {dayDemos.length > 3 && (
                            <p className="text-[8px] text-muted-foreground text-center">+{dayDemos.length - 3} more</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day Schedule Sidebar */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  {selectedDay
                    ? format(selectedDay, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "Pilih tanggal"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {!selectedDay ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Klik tanggal di kalender untuk melihat jadwal demo</p>
                ) : dayScheduleDemos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Tidak ada demo di tanggal ini</p>
                ) : (
                  <div className="space-y-2">
                    {dayScheduleDemos.map((d: any) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-border/40 p-3 space-y-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-primary" />
                              {d.demo_time?.slice(0, 5) || "—"} WIB
                            </p>
                            <p className="text-xs font-medium mt-0.5">{d.company_name}</p>
                            <p className="text-[10px] text-muted-foreground">{d.name} • {d.email}</p>
                            {d.phone && <p className="text-[10px] text-muted-foreground">{d.phone}</p>}
                          </div>
                          <Badge variant="outline" className={`text-[9px] ${statusBadge(d.status)}`}>{d.status}</Badge>
                        </div>

                        {d.gmeet_link ? (
                          <div className="flex items-center gap-1.5">
                            <a href={d.gmeet_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 flex-1 truncate">
                              <Video className="h-3 w-3 shrink-0" /> {d.gmeet_link}
                            </a>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Belum ada GMeet link</p>
                        )}

                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1"
                            onClick={() => { setSelectedDemo(d); setGmeetInput(d.gmeet_link || ""); }}
                          >
                            <Eye className="h-3 w-3 mr-1" /> Detail
                          </Button>
                          {d.gmeet_link && d.phone && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] flex-1 gap-1"
                              onClick={() => window.open(buildWaLink(d.phone, d, d.gmeet_link), "_blank")}
                            >
                              <Send className="h-3 w-3" /> Kirim WA
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ LIST TAB ══ */}
        <TabsContent value="list">
          <Card className="border-border/50">
            <CardContent className="p-0">
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : demos.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada demo request</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Demo Schedule</TableHead>
                        <TableHead>GMeet</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demos.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground">{d.email}</p>
                          </TableCell>
                          <TableCell className="text-sm">{d.company_name}</TableCell>
                          <TableCell>
                            {d.demo_date ? (
                              <div>
                                <p className="text-sm font-medium">{format(parseISO(d.demo_date), "dd MMM yyyy")}</p>
                                <p className="text-xs text-primary font-semibold">{d.demo_time?.slice(0, 5) || "—"} WIB</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {d.gmeet_link ? (
                              <a href={d.gmeet_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                                <Video className="h-3 w-3" /> Join
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadge(d.status)}>{d.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedDemo(d); setGmeetInput(d.gmeet_link || ""); }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {d.gmeet_link && d.phone && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(buildWaLink(d.phone, d, d.gmeet_link), "_blank")}>
                                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(d.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══ DETAIL DIALOG ══ */}
      <Dialog open={!!selectedDemo} onOpenChange={() => setSelectedDemo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Demo Request Detail</DialogTitle>
          </DialogHeader>
          {selectedDemo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Company</p>
                  <p className="font-medium text-sm">{selectedDemo.company_name}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Name</p>
                  <p className="font-medium text-sm">{selectedDemo.name}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                  <p className="font-medium text-sm">{selectedDemo.email}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                  <p className="font-medium text-sm">{selectedDemo.phone || "—"}</p>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <p className="text-[10px] text-primary flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Tanggal Demo</p>
                  <p className="font-bold text-sm">{selectedDemo.demo_date ? format(parseISO(selectedDemo.demo_date), "dd MMMM yyyy", { locale: idLocale }) : "Belum dipilih"}</p>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <p className="text-[10px] text-primary flex items-center gap-1"><Clock className="h-3 w-3" /> Jam Demo</p>
                  <p className="font-bold text-sm">{selectedDemo.demo_time ? selectedDemo.demo_time.slice(0, 5) + " WIB" : "Belum dipilih"}</p>
                </div>
              </div>

              {selectedDemo.message && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selectedDemo.message}</p>
                </div>
              )}

              {/* Google Meet Link input */}
              <div className="rounded-xl border border-border/50 p-3 space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-primary" /> Google Meet Link</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    value={gmeetInput}
                    onChange={(e) => setGmeetInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      updateGmeet.mutate({ id: selectedDemo.id, gmeet_link: gmeetInput });
                      setSelectedDemo({ ...selectedDemo, gmeet_link: gmeetInput });
                    }}
                    disabled={updateGmeet.isPending}
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
                {selectedDemo.gmeet_link && (
                  <a href={selectedDemo.gmeet_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Open Meet Link
                  </a>
                )}
              </div>

              {/* Send to WhatsApp */}
              {selectedDemo.gmeet_link && selectedDemo.phone && (
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(buildWaLink(selectedDemo.phone, selectedDemo, selectedDemo.gmeet_link), "_blank")}
                >
                  <Send className="h-4 w-4" />
                  Kirim Jadwal + GMeet ke WhatsApp ({selectedDemo.phone})
                </Button>
              )}
              {selectedDemo.gmeet_link && !selectedDemo.phone && (
                <p className="text-xs text-muted-foreground text-center italic">⚠️ Tidak ada nomor HP, tidak bisa kirim via WhatsApp</p>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: selectedDemo.id, status: "contacted" }); setSelectedDemo(null); }}>
                  Mark as Contacted
                </Button>
                <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: selectedDemo.id, status: "completed" }); setSelectedDemo(null); }}>
                  Mark as Completed
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { deleteMutation.mutate(selectedDemo.id); setSelectedDemo(null); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
