import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, StickyNote, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function PersonalNotes() {
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);

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
      setEditContent(note.content);
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
      setDeleteNote(null);
      toast.success("Note deleted");
    },
  });

  const handleSave = () => {
    if (!selectedNote) return;
    updateMutation.mutate({ id: selectedNote.id, title: editTitle, content: editContent });
    toast.success("Saved");
  };

  const handleSelectNote = (note: Note) => {
    // Auto-save previous
    if (selectedNote && (editTitle !== selectedNote.title || editContent !== selectedNote.content)) {
      updateMutation.mutate({ id: selectedNote.id, title: editTitle, content: editContent });
    }
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar list */}
      <div className={`${selectedNote ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-border/40 bg-card/50`}>
        <div className="p-4 space-y-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              My Notes
            </h2>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "New" to create one</p>
            </div>
          ) : (
            filtered.map((note) => (
              <Card
                key={note.id}
                className={`cursor-pointer transition-all hover:bg-accent/50 ${
                  selectedNote?.id === note.id ? "ring-2 ring-primary/50 bg-accent/60" : ""
                }`}
                onClick={() => handleSelectNote(note)}
              >
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {note.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {note.content?.replace(/<[^>]*>/g, "").slice(0, 100) || "No content"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    {format(new Date(note.updated_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`${selectedNote ? "flex" : "hidden md:flex"} flex-col flex-1 bg-background`}>
        {selectedNote ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => {
                    handleSave();
                    setSelectedNote(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Last updated: {format(new Date(selectedNote.updated_at), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleSave} disabled={updateMutation.isPending}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteNote(selectedNote)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
              />
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start writing your note..."
                className="min-h-[60vh] text-sm leading-relaxed border-none shadow-none px-0 focus-visible:ring-0 bg-transparent resize-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteNote}
        onOpenChange={(open) => !open && setDeleteNote(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={() => deleteNote && deleteMutation.mutate(deleteNote.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
