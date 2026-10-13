import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { VersionRestorePanel } from "@/components/VersionRestorePanel";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadDeletedItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deleted_items")
      .select("id, item_type, item_id, item_name, deleted_at")
      .eq("user_id", userId)
      .order("deleted_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load recycle bin", variant: "destructive" });
    } else {
      setDeletedItems(data || []);
    }
    setLoading(false);
  };

  const handleRestore = async (item: DeletedItem) => {
    setRestoring(item.id);
    try {
      // Restored in one server-side step with every original detail (year, chapter, notes…).
      const { error } = await supabase.rpc("restore_deleted_item", { _deleted_id: item.id });
      if (error) throw error;
      toast({ title: "Restored successfully", description: `${item.item_name} has been restored.` });
      loadDeletedItems();
      onRestore();
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message || "Failed to restore item", variant: "destructive" });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from("deleted_items").delete().eq("id", itemToDelete.id);
      if (error) throw error;
      toast({ title: "Permanently deleted", description: `${itemToDelete.item_name} has been permanently removed.` });
      loadDeletedItems();
    } catch {
      toast({ title: "Delete failed", description: "Failed to permanently delete item", variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
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
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close recycle bin">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Tabs defaultValue="deleted" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-4 self-start">
          <TabsTrigger value="deleted">Deleted items</TabsTrigger>
          <TabsTrigger value="versions">Restore previous version</TabsTrigger>
        </TabsList>

        <TabsContent value="deleted" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full p-6">
            {loading ? (
              <div className="text-center py-8"><p className="text-muted-foreground">Loading...</p></div>
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
                            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-medium">{item.item_type}</span>
                            <h3 className="font-semibold text-foreground">{item.item_name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Deleted {new Date(item.deleted_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleRestore(item)} disabled={restoring === item.id}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {restoring === item.id ? "Restoring..." : "Restore"}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => { setItemToDelete(item); setDeleteConfirmOpen(true); }} disabled={restoring === item.id}>
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
        </TabsContent>

        <TabsContent value="versions" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full p-6">
            <VersionRestorePanel userId={userId} />
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
