import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, StickyNote, Trash2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { NoteEditor } from "./NoteEditor";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotesPanel({ open, onClose }: NotesPanelProps) {
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["personal-notes"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("personal_notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("personal_notes")
        .insert({ user_id: session.user.id, title: "Untitled Note", content: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["personal-notes"] });
      setSelectedNote(note);
      setEditTitle(note.title);
      setEditContent(note.content || "");
      toast.success("Note created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("personal_notes")
        .update({ title, content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-notes"] });
      setSelectedNote(null);
      toast.success("Note deleted");
    },
  });

  const handleSave = () => {
    if (!selectedNote) return;
    updateMutation.mutate({ id: selectedNote.id, title: editTitle, content: editContent });
  };

  const handleSelectNote = (note: Note) => {
    if (selectedNote && (editTitle !== selectedNote.title || editContent !== selectedNote.content)) {
      updateMutation.mutate({ id: selectedNote.id, title: editTitle, content: editContent });
    }
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content || "");
  };

  const handleBack = () => {
    if (selectedNote) {
      handleSave();
    }
    setSelectedNote(null);
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] h-[520px] bg-card border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        {selectedNote ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground truncate flex-1 mx-2">
              {format(new Date(selectedNote.updated_at), "dd MMM yyyy, HH:mm")}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                Save
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(selectedNote.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              My Notes
            </h3>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title..."
              className="text-base font-semibold border-none shadow-none px-0 h-8 focus-visible:ring-0 bg-transparent"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-3">
            <NoteEditor content={editContent} onChange={setEditContent} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
            {isLoading ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No notes yet</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs h-7" onClick={() => createMutation.mutate()}>
                  <Plus className="h-3 w-3 mr-1" /> Create Note
                </Button>
              </div>
            ) : (
              filtered.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedNote?.id === note.id ? "ring-1 ring-primary/50 bg-accent/60" : ""
                  }`}
                  onClick={() => handleSelectNote(note)}
                >
                  <CardContent className="p-2.5">
                    <h4 className="text-xs font-medium text-foreground truncate">
                      {note.title || "Untitled"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {(note.content || "").replace(/<[^>]*>/g, "").slice(0, 80) || "No content"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {format(new Date(note.updated_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
