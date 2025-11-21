import { useState, useEffect } from "react";
import { Plus, LogOut, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { TopicCard } from "@/components/TopicCard";
import { ChapterCard } from "@/components/ChapterCard";
import { TopicEditor } from "@/components/TopicEditor";
import { RecycleBin } from "@/components/RecycleBin";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ChapterDialog } from "@/components/ChapterDialog";
import { SubjectDialog } from "@/components/SubjectDialog";
import { TopicDialog } from "@/components/TopicDialog";
import { MoveTopicDialog } from "@/components/MoveTopicDialog";
import { MoveChapterDialog } from "@/components/MoveChapterDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  chapter_order: number;
}

interface Topic {
  id: string;
  subjectId: string;
  title: string;
  summary?: string;
  chapterId?: string | null;
  studied?: boolean;
}

const Index = () => {
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ 
    id: string; 
    name: string; 
    type: "subject" | "topic" | "chapter";
  } | null>(null);
  
  // Chapter dialogs
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{ id: string; name: string } | null>(null);
  const [chapterSubjectId, setChapterSubjectId] = useState<string>("");
  
  // Move dialogs
  const [moveTopicDialogOpen, setMoveTopicDialogOpen] = useState(false);
  const [topicToMove, setTopicToMove] = useState<{ id: string; title: string } | null>(null);
  const [moveChapterDialogOpen, setMoveChapterDialogOpen] = useState(false);
  const [chapterToMove, setChapterToMove] = useState<{ id: string; name: string } | null>(null);

  // Rename dialogs
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string } | null>(null);
  const [renameTopicDialogOpen, setRenameTopicDialogOpen] = useState(false);
  const [renamingTopic, setRenamingTopic] = useState<{ id: string; title: string } | null>(null);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Load data from database
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load subjects from database
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (subjectsError) {
        console.error("Error loading subjects:", subjectsError);
      } else if (subjectsData) {
        const mappedSubjects = subjectsData.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
        }));
        setSubjects(mappedSubjects);
      }

      // Load chapters from database
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("*")
        .eq("user_id", user.id)
        .order("chapter_order", { ascending: true });

      if (chaptersError) {
        console.error("Error loading chapters:", chaptersError);
      } else if (chaptersData) {
        setChapters(chaptersData);
      }

      // Load topics from database
      const { data: topicsData, error } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading topics:", error);
      } else if (topicsData) {
        const mappedTopics = topicsData.map(t => ({
          id: t.id,
          subjectId: t.subject_id || "default",
          title: t.title,
          chapterId: t.chapter_id,
          studied: t.studied || false,
        }));
        setTopics(mappedTopics);
      }
    };

    loadData();
  }, [user]);


  const handleNewSubject = async () => {
    if (!newSubjectName.trim() || !user) return;

    const color = colors[Math.floor(Math.random() * colors.length)];

    const { data, error } = await supabase
      .from("subjects")
      .insert({
        name: newSubjectName,
        color: color,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create subject",
        variant: "destructive",
      });
      return;
    }

    const newSubject: Subject = {
      id: data.id,
      name: data.name,
      color: data.color,
    };

    setSubjects([...subjects, newSubject]);
    setNewSubjectName("");
    setDialogOpen(false);
    setActiveSubject(newSubject.id);

    toast({
      title: "Subject created",
      description: `${newSubject.name} has been added to your notes.`,
    });
  };

  const handleSaveSubject = async (name: string, subjectId?: string) => {
    if (!user) return;

    try {
      if (subjectId) {
        // Update existing subject
        const { error } = await supabase
          .from("subjects")
          .update({ name })
          .eq("id", subjectId);

        if (error) throw error;

        setSubjects(subjects.map(s =>
          s.id === subjectId ? { ...s, name } : s
        ));

        toast({
          title: "Subject updated",
          description: `${name} has been updated.`,
        });
      } else {
        // Create new subject
        const { data, error } = await supabase
          .from("subjects")
          .insert({
            user_id: user.id,
            name,
            color: colors[Math.floor(Math.random() * colors.length)],
          })
          .select()
          .single();

        if (error) throw error;

        setSubjects([
          ...subjects,
          {
            id: data.id,
            name: data.name,
            color: data.color,
          },
        ]);

        toast({
          title: "Subject created",
          description: `${name} has been added to your subjects.`,
        });
      }
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      });
    }
  };

  const handleEditSubject = (subjectId: string, subjectName: string) => {
    setEditingSubject({ id: subjectId, name: subjectName });
    setSubjectDialogOpen(true);
  };

  const handleNewTopic = async () => {
    if (!newTopicTitle.trim() || !activeSubject || !user) return;

    const { data, error } = await supabase
      .from("topics")
      .insert({
        title: newTopicTitle,
        subject_id: activeSubject,
        chapter_id: activeChapter, // Assign to chapter if one is active
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create topic",
        variant: "destructive",
      });
      return;
    }

    const newTopic: Topic = {
      id: data.id,
      subjectId: activeSubject,
      title: data.title,
      chapterId: data.chapter_id,
    };

    setTopics([...topics, newTopic]);
    setNewTopicTitle("");
    setTopicDialogOpen(false);

    toast({
      title: "Topic created",
      description: `${newTopic.title} has been added.`,
    });
  };

  const handleSaveTopic = async (title: string, topicId?: string) => {
    if (!user) return;

    try {
      if (topicId) {
        // Update existing topic
        const { error } = await supabase
          .from("topics")
          .update({ title })
          .eq("id", topicId);

        if (error) throw error;

        setTopics(topics.map(t =>
          t.id === topicId ? { ...t, title } : t
        ));

        toast({
          title: "Topic updated",
          description: `${title} has been updated.`,
        });
      } else {
        // Create new topic
        if (!activeSubject) return;

        const { data, error } = await supabase
          .from("topics")
          .insert({
            user_id: user.id,
            subject_id: activeSubject,
            chapter_id: activeChapter || null,
            title,
          })
          .select()
          .single();

        if (error) throw error;

        setTopics([
          ...topics,
          {
            id: data.id,
            subjectId: data.subject_id,
            title: data.title,
            chapterId: data.chapter_id,
          },
        ]);

        toast({
          title: "Topic created",
          description: `${title} has been added.`,
        });
      }
    } catch (error) {
      console.error("Error saving topic:", error);
      toast({
        title: "Error",
        description: "Failed to save topic",
        variant: "destructive",
      });
    }
  };

  const handleEditTopic = (topicId: string, topicTitle: string) => {
    setRenamingTopic({ id: topicId, title: topicTitle });
    setRenameTopicDialogOpen(true);
  };

  const handleToggleStudied = async (topicId: string) => {
    if (!user) return;

    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;

      const newStudiedValue = !topic.studied;

      // Optimistic UI update
      setTopics(topics.map(t =>
        t.id === topicId ? { ...t, studied: newStudiedValue } : t
      ));

      const { error } = await supabase
        .from("topics")
        .update({ studied: newStudiedValue })
        .eq("id", topicId);

      if (error) throw error;

      toast({
        title: newStudiedValue ? "Marked as studied" : "Unmarked as studied",
        description: `${topic.title} has been updated.`,
      });
    } catch (error) {
      console.error("Error toggling studied status:", error);
      // Revert optimistic update
      setTopics(topics.map(t =>
        t.id === topicId ? { ...t, studied: !t.studied } : t
      ));
      toast({
        title: "Error",
        description: "Failed to update studied status",
        variant: "destructive",
      });
    }
  };

  // Chapter operations
  const handleNewChapter = (subjectId: string) => {
    setChapterSubjectId(subjectId);
    setEditingChapter(null);
    setChapterDialogOpen(true);
  };

  const handleEditChapter = (chapterId: string, chapterName: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      setChapterSubjectId(chapter.subject_id);
      setEditingChapter({ id: chapterId, name: chapterName });
      setChapterDialogOpen(true);
    }
  };

  const handleSaveChapter = async (name: string, chapterId?: string) => {
    if (!user) return;

    try {
      if (chapterId) {
        // Update existing chapter
        const { error } = await supabase
          .from("chapters")
          .update({ name })
          .eq("id", chapterId);

        if (error) throw error;

        setChapters(chapters.map(ch => 
          ch.id === chapterId ? { ...ch, name } : ch
        ));

        toast({
          title: "Chapter updated",
          description: `${name} has been updated.`,
        });
      } else {
        // Create new chapter
        const { data, error } = await supabase
          .from("chapters")
          .insert({
            subject_id: chapterSubjectId,
            name,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setChapters([...chapters, data]);

        // Auto-expand the subject
        setExpandedSubjects(prev => new Set(prev).add(chapterSubjectId));

        toast({
          title: "Chapter created",
          description: `${name} has been added.`,
        });
      }
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast({
        title: "Error",
        description: "Failed to save chapter",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChapter = (chapterId: string, chapterName: string) => {
    setItemToDelete({ id: chapterId, name: chapterName, type: "chapter" });
    setDeleteConfirmOpen(true);
  };

  const handleMoveChapter = (chapterId: string, chapterName: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      const topicsInChapter = topics.filter(t => t.chapterId === chapterId);
      setChapterToMove({ id: chapterId, name: chapterName });
      setMoveChapterDialogOpen(true);
    }
  };

  const handleMoveChapterConfirm = async (chapterId: string, newSubjectId: string) => {
    if (!user) return;

    try {
      // Update chapter's subject
      const { error: chapterError } = await supabase
        .from("chapters")
        .update({ subject_id: newSubjectId })
        .eq("id", chapterId);

      if (chapterError) throw chapterError;

      // Update all topics in that chapter
      const { error: topicsError } = await supabase
        .from("topics")
        .update({ subject_id: newSubjectId })
        .eq("chapter_id", chapterId);

      if (topicsError) {
        // Rollback chapter update
        await supabase
          .from("chapters")
          .update({ subject_id: chapters.find(ch => ch.id === chapterId)?.subject_id })
          .eq("id", chapterId);
        throw topicsError;
      }

      // Update local state
      setChapters(chapters.map(ch =>
        ch.id === chapterId ? { ...ch, subject_id: newSubjectId } : ch
      ));
      setTopics(topics.map(t =>
        t.chapterId === chapterId ? { ...t, subjectId: newSubjectId } : t
      ));

      toast({
        title: "Chapter moved",
        description: "Chapter and its topics have been moved successfully.",
      });
    } catch (error) {
      console.error("Error moving chapter:", error);
      toast({
        title: "Failed to move chapter",
        description: "An error occurred while moving the chapter",
        variant: "destructive",
      });
    }
  };

  const handleMoveTopic = (topicId: string, topicTitle: string) => {
    setTopicToMove({ id: topicId, title: topicTitle });
    setMoveTopicDialogOpen(true);
  };

  const handleMoveTopicConfirm = async (
    topicId: string,
    chapterId: string | null,
    newSubjectId?: string
  ) => {
    if (!user) return;

    try {
      const updateData: any = { chapter_id: chapterId };
      if (newSubjectId) {
        updateData.subject_id = newSubjectId;
      }

      const { error } = await supabase
        .from("topics")
        .update(updateData)
        .eq("id", topicId);

      if (error) throw error;

      // Update local state
      setTopics(topics.map(t =>
        t.id === topicId
          ? { ...t, chapterId, ...(newSubjectId && { subjectId: newSubjectId }) }
          : t
      ));

      toast({
        title: "Topic moved",
        description: "Topic has been moved successfully.",
      });
    } catch (error) {
      console.error("Error moving topic:", error);
      toast({
        title: "Failed to move topic",
        description: "An error occurred while moving the topic",
        variant: "destructive",
      });
    }
  };

  const handleToggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleToggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const handleDeleteSubject = (subjectId: string, subjectName: string) => {
    setItemToDelete({ id: subjectId, name: subjectName, type: "subject" });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteTopic = (topicId: string, topicTitle: string) => {
    setItemToDelete({ id: topicId, name: topicTitle, type: "topic" });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !user) return;

    try {
      if (itemToDelete.type === "subject") {
        // Fetch subject data
        const { data: subjectData, error: subjectError } = await supabase
          .from("subjects")
          .select("*")
          .eq("id", itemToDelete.id)
          .single();

        if (subjectError) throw subjectError;

        // Fetch all topics for this subject
        const { data: topicsData, error: topicsError } = await supabase
          .from("topics")
          .select("*")
          .eq("subject_id", itemToDelete.id);

        if (topicsError) throw topicsError;

        // Store in deleted_items
        const { error: insertError } = await supabase
          .from("deleted_items")
          .insert({
            user_id: user.id,
            item_type: "subject",
            item_id: itemToDelete.id,
            item_name: itemToDelete.name,
            subject_data: subjectData,
            topic_data: topicsData || [],
          });

        if (insertError) throw insertError;

        // Delete all topics for this subject
        if (topicsData && topicsData.length > 0) {
          const topicIds = topicsData.map((t) => t.id);

          // Delete related data for all topics
          await supabase.from("blocks").delete().in("topic_id", topicIds);
          await supabase.from("heading_nodes").delete().in("topic_id", topicIds);
          await supabase.from("summaries").delete().in("topic_id", topicIds);
          await supabase.from("mnemonics").delete().in("topic_id", topicIds);

          // Delete topics
          await supabase.from("topics").delete().in("id", topicIds);
        }

        // Delete subject
        const { error: deleteError } = await supabase
          .from("subjects")
          .delete()
          .eq("id", itemToDelete.id);

        if (deleteError) throw deleteError;

        // Update local state
        setSubjects(subjects.filter((s) => s.id !== itemToDelete.id));
        setTopics(topics.filter((t) => t.subjectId !== itemToDelete.id));
        if (activeSubject === itemToDelete.id) {
          setActiveSubject(null);
        }

        toast({
          title: "Moved to Recycle Bin",
          description: `${itemToDelete.name} and its topics can be restored from the Recycle Bin.`,
        });
      } else if (itemToDelete.type === "topic") {
        // Fetch topic data
        const { data: topicData, error: topicError } = await supabase
          .from("topics")
          .select("*")
          .eq("id", itemToDelete.id)
          .single();

        if (topicError) throw topicError;

        // Fetch all related data
        const { data: blocksData } = await supabase
          .from("blocks")
          .select("*")
          .eq("topic_id", itemToDelete.id);

        const { data: headingsData } = await supabase
          .from("heading_nodes")
          .select("*")
          .eq("topic_id", itemToDelete.id);

        const { data: summariesData } = await supabase
          .from("summaries")
          .select("*")
          .eq("topic_id", itemToDelete.id);

        const { data: mnemonicsData } = await supabase
          .from("mnemonics")
          .select("*")
          .eq("topic_id", itemToDelete.id);

        // Store in deleted_items
        const { error: insertError } = await supabase
          .from("deleted_items")
          .insert({
            user_id: user.id,
            item_type: "topic",
            item_id: itemToDelete.id,
            item_name: itemToDelete.name,
            topic_data: topicData,
            blocks_data: blocksData || [],
            heading_nodes_data: headingsData || [],
            summaries_data: summariesData || [],
            mnemonics_data: mnemonicsData || [],
          });

        if (insertError) throw insertError;

        // Delete all related data
        await supabase.from("blocks").delete().eq("topic_id", itemToDelete.id);
        await supabase.from("heading_nodes").delete().eq("topic_id", itemToDelete.id);
        await supabase.from("summaries").delete().eq("topic_id", itemToDelete.id);
        await supabase.from("mnemonics").delete().eq("topic_id", itemToDelete.id);

        // Delete topic
        const { error: deleteError } = await supabase
          .from("topics")
          .delete()
          .eq("id", itemToDelete.id);

        if (deleteError) throw deleteError;

        // Update local state
        setTopics(topics.filter((t) => t.id !== itemToDelete.id));

        toast({
          title: "Moved to Recycle Bin",
          description: `${itemToDelete.name} can be restored from the Recycle Bin.`,
        });
      } else if (itemToDelete.type === "chapter") {
        // Fetch chapter data
        const { data: chapterData, error: chapterError } = await supabase
          .from("chapters")
          .select("*")
          .eq("id", itemToDelete.id)
          .maybeSingle();

        if (chapterError) throw chapterError;
        if (!chapterData) throw new Error("Chapter not found");

        // Fetch all topics in this chapter
        const { data: chapterTopicsData, error: topicsError } = await supabase
          .from("topics")
          .select("*")
          .eq("chapter_id", itemToDelete.id);

        if (topicsError) throw topicsError;

        const topicCount = chapterTopicsData?.length || 0;

        // Move topics back to subject level (set chapter_id to null) - only if there are topics
        if (topicCount > 0) {
          const { error: updateError } = await supabase
            .from("topics")
            .update({ chapter_id: null })
            .eq("chapter_id", itemToDelete.id);

          if (updateError) throw updateError;
        }

        // Store in deleted_items
        const { error: insertError } = await supabase
          .from("deleted_items")
          .insert({
            user_id: user.id,
            item_type: "chapter",
            item_id: itemToDelete.id,
            item_name: itemToDelete.name,
            chapters_data: chapterData,
            topic_data: chapterTopicsData && chapterTopicsData.length > 0 ? chapterTopicsData : null,
          });

        if (insertError) throw insertError;

        // Delete chapter
        const { error: deleteError } = await supabase
          .from("chapters")
          .delete()
          .eq("id", itemToDelete.id);

        if (deleteError) throw deleteError;

        // Update local state
        setChapters(chapters.filter((ch) => ch.id !== itemToDelete.id));
        setTopics(topics.map(t => 
          t.chapterId === itemToDelete.id ? { ...t, chapterId: null } : t
        ));
        if (activeChapter === itemToDelete.id) {
          setActiveChapter(null);
        }

        toast({
          title: "Moved to Recycle Bin",
          description: topicCount > 0 
            ? `${itemToDelete.name} moved to Recycle Bin. ${topicCount} topics moved back to subject level.`
            : `${itemToDelete.name} moved to Recycle Bin.`,
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleRestoreData = () => {
    // Reload all data after restore
    if (user) {
      const loadData = async () => {
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (subjectsData) {
          const mappedSubjects = subjectsData.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
          }));
          setSubjects(mappedSubjects);
        }

        const { data: topicsData } = await supabase
          .from("topics")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (topicsData) {
          const mappedTopics = topicsData.map((t) => ({
            id: t.id,
            subjectId: t.subject_id || "default",
            title: t.title,
          }));
          setTopics(mappedTopics);
        }
      };

      loadData();
    }
  };

  // Filter topics based on whether a chapter or subject is selected
  const activeTopics = activeChapter
    ? topics.filter((t) => t.chapterId === activeChapter)
    : topics.filter((t) => t.subjectId === activeSubject && !t.chapterId);
  
  const activeSubjectData = subjects.find((s) => s.id === activeSubject);
  const activeChapterData = chapters.find((ch) => ch.id === activeChapter);
  const editingTopicData = topics.find((t) => t.id === editingTopic);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (recycleBinOpen && user) {
    return (
      <RecycleBin
        onClose={() => setRecycleBinOpen(false)}
        onRestore={handleRestoreData}
        userId={user.id}
      />
    );
  }

  if (editingTopic && editingTopicData) {
    return (
      <TopicEditor
        topicId={editingTopic}
        topicTitle={editingTopicData.title}
        onBack={() => setEditingTopic(null)}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        activeSubject={activeSubject}
        activeChapter={activeChapter}
        activeTopic={activeTopic}
        expandedSubjects={expandedSubjects}
        expandedChapters={expandedChapters}
        onSubjectSelect={(id) => {
          setActiveSubject(id);
          setActiveChapter(null); // Clear chapter when selecting subject
        }}
        onChapterSelect={(id) => {
          const chapter = chapters.find(ch => ch.id === id);
          if (chapter) {
            setActiveSubject(chapter.subject_id);
            setActiveChapter(id);
          }
        }}
        onTopicSelect={(id) => setEditingTopic(id)}
        onNewSubject={() => {
          setEditingSubject(null);
          setDialogOpen(true);
        }}
        onEditSubject={handleEditSubject}
        onDeleteSubject={handleDeleteSubject}
        onNewChapter={handleNewChapter}
        onEditChapter={handleEditChapter}
        onDeleteChapter={handleDeleteChapter}
        onMoveChapter={handleMoveChapter}
        onMoveTopic={handleMoveTopic}
        onDeleteTopic={handleDeleteTopic}
        onToggleSubject={handleToggleSubject}
        onToggleChapter={handleToggleChapter}
      />

      <div className="flex-1 overflow-auto">
        {activeSubject ? (
          <div className="p-8">
            {/* Breadcrumb Navigation */}
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer hover:text-primary"
                    onClick={() => {
                      setActiveSubject(null);
                      setActiveChapter(null);
                    }}
                  >
                    All Subjects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {activeChapter ? (
                    <BreadcrumbLink
                      className="cursor-pointer hover:text-primary"
                      onClick={() => setActiveChapter(null)}
                    >
                      {activeSubjectData?.name}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{activeSubjectData?.name}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {activeChapter && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeChapterData?.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {activeChapterData ? activeChapterData.name : activeSubjectData?.name}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {activeChapterData && `${activeSubjectData?.name} • `}
                  {activeChapter 
                    ? `${activeTopics.length} ${activeTopics.length === 1 ? "topic" : "topics"}`
                    : `${chapters.filter(c => c.subject_id === activeSubject).length} ${chapters.filter(c => c.subject_id === activeSubject).length === 1 ? "chapter" : "chapters"}`
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRecycleBinOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Recycle Bin
                </Button>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                {activeChapter ? (
                  <Button onClick={() => setTopicDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Topic
                  </Button>
                ) : (
                  <Button onClick={() => setChapterDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Chapter
                  </Button>
                )}
              </div>
            </div>

            {activeChapter ? (
              // Display topics when a chapter is selected
              activeTopics.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No topics yet</p>
                  <Button variant="outline" onClick={() => setTopicDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first topic
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeTopics.map((topic) => (
                     <TopicCard
                      key={topic.id}
                      topic={topic}
                      onClick={() => setEditingTopic(topic.id)}
                      onDelete={handleDeleteTopic}
                      onMove={handleMoveTopic}
                      onEdit={handleEditTopic}
                      onToggleStudied={handleToggleStudied}
                    />
                  ))}
                </div>
              )
            ) : (
              // Display chapters when a subject is selected
              chapters.filter(c => c.subject_id === activeSubject).length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No chapters yet</p>
                  <Button variant="outline" onClick={() => setChapterDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first chapter
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {chapters
                    .filter(c => c.subject_id === activeSubject)
                    .sort((a, b) => a.chapter_order - b.chapter_order)
                    .map((chapter) => (
                      <ChapterCard
                        key={chapter.id}
                        chapter={chapter}
                        onClick={() => setActiveChapter(chapter.id)}
                        onDelete={handleDeleteChapter}
                        onMove={handleMoveChapter}
                        onEdit={handleEditChapter}
                      />
                    ))}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Welcome to Psychology Notes
              </h2>
              <p className="text-muted-foreground mb-6">
                Select a subject from the sidebar or create a new one to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Subject
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Subject Dialog */}
      <SubjectDialog
        open={dialogOpen || subjectDialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          setSubjectDialogOpen(open);
          if (!open) setEditingSubject(null);
        }}
        subjectId={editingSubject?.id}
        subjectName={editingSubject?.name}
        onSave={handleSaveSubject}
      />

      {/* Topic Dialog */}
      <TopicDialog
        open={topicDialogOpen || renameTopicDialogOpen}
        onOpenChange={(open) => {
          setTopicDialogOpen(open);
          setRenameTopicDialogOpen(open);
          if (!open) setRenamingTopic(null);
        }}
        topicId={renamingTopic?.id}
        topicTitle={renamingTopic?.title}
        onSave={handleSaveTopic}
      />

      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        subjectId={chapterSubjectId}
        chapterId={editingChapter?.id}
        chapterName={editingChapter?.name}
        onSave={handleSaveChapter}
      />

      <MoveTopicDialog
        open={moveTopicDialogOpen}
        onOpenChange={setMoveTopicDialogOpen}
        topicId={topicToMove?.id || ""}
        topicTitle={topicToMove?.title || ""}
        currentSubjectId={
          topics.find(t => t.id === topicToMove?.id)?.subjectId || activeSubject || ""
        }
        currentChapterId={
          topics.find(t => t.id === topicToMove?.id)?.chapterId
        }
        allSubjects={subjects}
        allChapters={chapters}
        onMove={handleMoveTopicConfirm}
      />

      <MoveChapterDialog
        open={moveChapterDialogOpen}
        onOpenChange={setMoveChapterDialogOpen}
        chapterId={chapterToMove?.id || ""}
        chapterName={chapterToMove?.name || ""}
        currentSubjectId={
          chapters.find(ch => ch.id === chapterToMove?.id)?.subject_id || ""
        }
        allSubjects={subjects}
        topicCount={
          topics.filter(t => t.chapterId === chapterToMove?.id).length
        }
        onMove={handleMoveChapterConfirm}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name || ""}
        isPermanent={false}
      />
    </div>
  );
};

export default Index;
