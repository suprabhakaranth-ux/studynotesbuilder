import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface DeletedItem {
  id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  deleted_at: string;
}

interface RecycleBinProps {
  onClose: () => void;
  onRestore: () => void;
  userId: string;
}

export const RecycleBin = ({ onClose, onRestore, userId }: RecycleBinProps) => {
  const { toast } = useToast();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeletedItem | null>(null);

  useEffect(() => {
    loadDeletedItems();
  }, [userId]);

  const loadDeletedItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deleted_items")
      .select("*")
      .eq("user_id", userId)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Error loading deleted items:", error);
      toast({
        title: "Error",
        description: "Failed to load recycle bin",
        variant: "destructive",
      });
    } else {
      setDeletedItems(data || []);
    }
    setLoading(false);
  };

  const handleRestore = async (item: DeletedItem) => {
    setRestoring(item.id);
    
    try {
      // Fetch the full deleted item with all data
      const { data: deletedData, error: fetchError } = await supabase
        .from("deleted_items")
        .select("*")
        .eq("id", item.id)
        .single();

      if (fetchError || !deletedData) {
        throw new Error("Failed to fetch deleted item data");
      }

      if (item.item_type === "subject") {
        // Restore subject
        const subjectData = deletedData.subject_data as any;
        
        // Check if subject ID already exists
        const { data: existingSubject } = await supabase
          .from("subjects")
          .select("id")
          .eq("id", item.item_id)
          .single();

        if (existingSubject) {
          throw new Error("A subject with this ID already exists. Cannot restore.");
        }

        // Insert subject
        const { error: subjectError } = await supabase
          .from("subjects")
          .insert({
            id: item.item_id,
            user_id: userId,
            name: subjectData.name,
            color: subjectData.color,
            created_at: subjectData.created_at,
            updated_at: subjectData.updated_at,
          });

        if (subjectError) throw subjectError;

        // Restore associated chapters
        const chaptersData = deletedData.chapters_data as any[];
        if (chaptersData && chaptersData.length > 0) {
          const { error: chaptersError } = await supabase
            .from("chapters")
            .insert(chaptersData);

          if (chaptersError) throw chaptersError;
        }

        // Restore associated topics
        const topicsData = deletedData.topic_data as any[];
        if (topicsData && topicsData.length > 0) {
          const { error: topicsError } = await supabase
            .from("topics")
            .insert(topicsData);

          if (topicsError) throw topicsError;
        }

      } else if (item.item_type === "topic") {
        // Restore topic
        const topicData = deletedData.topic_data as any;
        
        // Check if parent subject exists
        const { data: parentSubject } = await supabase
          .from("subjects")
          .select("id")
          .eq("id", topicData.subject_id)
          .single();

        if (!parentSubject) {
          throw new Error("Parent subject no longer exists. Cannot restore topic.");
        }

        // Check if topic ID already exists
        const { data: existingTopic } = await supabase
          .from("topics")
          .select("id")
          .eq("id", item.item_id)
          .single();

        if (existingTopic) {
          throw new Error("A topic with this ID already exists. Cannot restore.");
        }

        // Insert topic
        const { error: topicError } = await supabase
          .from("topics")
          .insert({
            id: item.item_id,
            user_id: userId,
            subject_id: topicData.subject_id,
            title: topicData.title,
            created_at: topicData.created_at,
            updated_at: topicData.updated_at,
          });

        if (topicError) throw topicError;

        // Restore blocks
        const blocksData = deletedData.blocks_data as any[];
        if (blocksData && blocksData.length > 0) {
          const { error: blocksError } = await supabase
            .from("blocks")
            .insert(blocksData);

          if (blocksError) throw blocksError;
        }

        // Restore heading nodes
        const headingsData = deletedData.heading_nodes_data as any[];
        if (headingsData && headingsData.length > 0) {
          const { error: headingsError } = await supabase
            .from("heading_nodes")
            .insert(headingsData);

          if (headingsError) throw headingsError;
        }

        // Restore summaries
        const summariesData = deletedData.summaries_data as any[];
        if (summariesData && summariesData.length > 0) {
          const { error: summariesError } = await supabase
            .from("summaries")
            .insert(summariesData);

          if (summariesError) throw summariesError;
        }

        // Restore mnemonics
        const mnemonicsData = deletedData.mnemonics_data as any[];
        if (mnemonicsData && mnemonicsData.length > 0) {
          const { error: mnemonicsError } = await supabase
            .from("mnemonics")
            .insert(mnemonicsData);

          if (mnemonicsError) throw mnemonicsError;
        }
      }

      // Remove from deleted_items
      const { error: deleteError } = await supabase
        .from("deleted_items")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Restored successfully",
        description: `${item.item_name} has been restored.`,
      });

      // Refresh the list and notify parent
      loadDeletedItems();
      onRestore();
    } catch (error: any) {
      console.error("Restore error:", error);
      toast({
        title: "Restore failed",
        description: error.message || "Failed to restore item",
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("deleted_items")
        .delete()
        .eq("id", itemToDelete.id);

      if (error) throw error;

      toast({
        title: "Permanently deleted",
        description: `${itemToDelete.item_name} has been permanently removed.`,
      });

      loadDeletedItems();
    } catch (error) {
      console.error("Permanent delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to permanently delete item",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const openDeleteConfirm = (item: DeletedItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recycle Bin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {deletedItems.length} {deletedItems.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : deletedItems.length === 0 ? (
          <div className="text-center py-16">
            <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Recycle bin is empty</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {deletedItems.map((item) => (
              <Card key={item.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                          {item.item_type}
                        </span>
                        <h3 className="font-semibold text-foreground">
                          {item.item_name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deleted {new Date(item.deleted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item)}
                        disabled={restoring === item.id}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {restoring === item.id ? "Restoring..." : "Restore"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteConfirm(item)}
                        disabled={restoring === item.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handlePermanentDelete}
        itemName={itemToDelete?.item_name || ""}
        isPermanent={true}
      />
    </div>
  );
};
