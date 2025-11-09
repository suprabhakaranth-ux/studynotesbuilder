import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, FileText, Lightbulb, Save, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentBlock, BlockType } from "./ContentBlock";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextEditor } from "./RichTextEditor";
import { HeadingNodeComponent } from "./HeadingNode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  headings?: string[];
}

interface HeadingNode {
  id: string;
  title: string;
  notes: string;
  children: HeadingNode[];
}

interface TopicEditorProps {
  topicId: string;
  topicTitle: string;
  onBack: () => void;
}

export const TopicEditor = ({ topicId, topicTitle, onBack }: TopicEditorProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>(() => [
    { id: crypto.randomUUID(), type: "text", content: "" },
  ]);
  const [summaryContent, setSummaryContent] = useState("");
  const [mnemonicContent, setMnemonicContent] = useState("");
  const [headingNodes, setHeadingNodes] = useState<HeadingNode[]>([]);
  const [areAllCollapsed, setAreAllCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Centralized save scheduler/lock to prevent concurrent saves
  const saveTimeoutRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data from database on mount
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      
      // Load blocks
      const { data: blocksData } = await supabase
        .from("blocks")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .order("block_order", { ascending: true });
      
      if (blocksData && blocksData.length > 0) {
        setBlocks(blocksData.map(b => ({
          id: b.id,
          type: b.type as BlockType,
          content: b.content || "",
          headings: b.headings ? JSON.parse(JSON.stringify(b.headings)) : []
        })));
      }

      // Load summary
      const { data: summaryData } = await supabase
        .from("summaries")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (summaryData) {
        setSummaryContent(summaryData.content || "");
      }

      // Load mnemonic
      const { data: mnemonicData } = await supabase
        .from("mnemonics")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (mnemonicData) {
        setMnemonicContent(mnemonicData.content || "");
      }

      // Load heading nodes
      const { data: headingNodesData } = await supabase
        .from("heading_nodes")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .order("node_order", { ascending: true });
      
      if (headingNodesData) {
        setHeadingNodes(headingNodesData.map(h => ({
          id: h.id,
          title: h.title,
          notes: h.notes || "",
          children: [] // We'll handle nested children later
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [topicId, user]);

  // Centralized debounced auto-save for all topic data
  useEffect(() => {
    if (!user || loading) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      // Skip if a manual or auto save is already running
      if (savingRef.current) return;
      // Silent autosave (no toasts)
      saveAll().catch((e) => {
        console.error("Autosave failed:", e);
      });
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [blocks, summaryContent, mnemonicContent, headingNodes, topicId, user, loading]);

  // Auto-populate headings from blocks
  useEffect(() => {
    if (loading) return;
    
    const allHeadings = blocks
      .filter(b => b.headings && b.headings.length > 0)
      .flatMap(b => b.headings || []);
    
    // Only add new headings, don't remove existing ones
    setHeadingNodes(prev => {
      const existingTitles = new Set(prev.map(h => h.title));
      const newHeadings = allHeadings.filter(h => !existingTitles.has(h));
      
      if (newHeadings.length > 0) {
        const newNodes: HeadingNode[] = newHeadings.map(h => ({
          id: crypto.randomUUID(),
          title: h,
          notes: "",
          children: []
        }));
        return [...prev, ...newNodes];
      }
      
      return prev;
    });
  }, [blocks, loading]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      content: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string, headings?: string[]) => {
    setBlocks(blocks.map((block) => 
      block.id === id ? { ...block, content, headings: headings || block.headings } : block
    ));
  };

  const deleteBlock = (id: string) => {
    const blockToDelete = blocks.find(b => b.id === id);
    
    // Remove the block
    setBlocks(blocks.filter((block) => block.id !== id));
    
    // If the deleted block had headings, remove those heading nodes from the summary
    if (blockToDelete?.headings && blockToDelete.headings.length > 0) {
      const headingsToRemove = new Set(blockToDelete.headings);
      setHeadingNodes(headingNodes.filter(node => !headingsToRemove.has(node.title)));
    }
  };

  const saveAll = async () => {
    if (!user) return;
    // Prevent concurrent saves
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    // Cancel any pending autosave timers
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    try {
      // Save blocks (delete then insert to preserve order)
      const { error: deleteBlocksError } = await supabase
        .from("blocks")
        .delete()
        .eq("topic_id", topicId)
        .eq("user_id", user.id);
      if (deleteBlocksError) throw deleteBlocksError;

      if (blocks.length > 0) {
        // Sanitize block IDs - regenerate any short/invalid IDs
        const sanitizedBlocks = blocks.map(b => ({
          ...b,
          id: b.id.length < 20 ? crypto.randomUUID() : b.id,
        }));
        
        // Update state if any IDs were regenerated
        const hadInvalidIds = blocks.some((b, i) => b.id !== sanitizedBlocks[i].id);
        if (hadInvalidIds) {
          setBlocks(sanitizedBlocks);
        }

        const { error: insertBlocksError } = await supabase.from("blocks").insert(
          sanitizedBlocks.map((b, idx) => ({
            id: b.id,
            topic_id: topicId,
            user_id: user.id,
            type: b.type,
            content: b.content,
            headings: b.headings || [],
            block_order: idx,
          }))
        );
        if (insertBlocksError) throw insertBlocksError;
      }

      // Save summary and mnemonic with explicit conflict targets
      const [summaryRes, mnemonicRes] = await Promise.all([
        supabase.from("summaries").upsert(
          {
            topic_id: topicId,
            user_id: user.id,
            content: summaryContent,
          },
          { onConflict: "topic_id" }
        ),
        supabase.from("mnemonics").upsert(
          {
            topic_id: topicId,
            user_id: user.id,
            content: mnemonicContent,
          },
          { onConflict: "topic_id" }
        ),
      ]);
      if (summaryRes.error) throw summaryRes.error;
      if (mnemonicRes.error) throw mnemonicRes.error;

      // Save heading nodes (flat list for now)
      const { error: deleteHNError } = await supabase
        .from("heading_nodes")
        .delete()
        .eq("topic_id", topicId)
        .eq("user_id", user.id);
      if (deleteHNError) throw deleteHNError;

      if (headingNodes.length > 0) {
        const { error: insertHNError } = await supabase.from("heading_nodes").insert(
          headingNodes.map((h, idx) => ({
            id: h.id,
            topic_id: topicId,
            user_id: user.id,
            title: h.title,
            notes: h.notes,
            parent_id: null,
            node_order: idx,
          }))
        );
        if (insertHNError) throw insertHNError;
      }
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleSave = async () => {
    try {
      // Cancel any pending autosave
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      await saveAll();
      toast({
        title: "Saved successfully! ✨",
        description: "Your notes have been saved.",
      });
    } catch (error: any) {
      console.error("Save failed:", error);
      toast({
        title: "Save failed",
        description: error?.message || "An unexpected error occurred while saving.",
        variant: "destructive",
      });
    }
  };

  const handleBack = async () => {
    try {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      await saveAll();
    } catch (e) {
      console.error("Background save on back failed:", e);
    } finally {
      onBack();
    }
  };

  const markTextAsHeading = (text: string) => {
    // Find the active block being edited
    const activeBlock = blocks.find(b => b.type === "text");
    if (activeBlock) {
      const currentHeadings = activeBlock.headings || [];
      updateBlock(activeBlock.id, activeBlock.content, [...currentHeadings, text]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setHeadingNodes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const summaryBlocks = blocks.filter((b) => b.type === "summary");
  const mnemonicBlocks = blocks.filter((b) => b.type === "mnemonic");

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="border-b-2 border-border p-4 flex items-center justify-between bg-card/80 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="hover:bg-primary/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {topicTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card">
              <DropdownMenuItem onClick={() => addBlock("title")}>
                <FileText className="w-4 h-4 mr-2" />
                Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock("text")}>
                <FileText className="w-4 h-4 mr-2" />
                Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock("summary")}>
                <FileText className="w-4 h-4 mr-2" />
                Summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock("mnemonic")}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Mnemonic
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addBlock("image")}>
                <FileText className="w-4 h-4 mr-2" />
                Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="full" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="full">Full Content</TabsTrigger>
          <TabsTrigger value="summary">Summary & Mnemonics</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="flex-1 m-0 overflow-y-auto px-4">
          <div className="sticky top-0 z-20 bg-card shadow-md border-b border-border -mx-4 px-4 mb-4">
            <FormattingToolbar onMarkHeading={markTextAsHeading} />
          </div>
          <div className="w-full max-w-[210mm] mx-auto shadow-2xl bg-card mb-8">
            <div className="p-12 min-h-[297mm] space-y-4 bg-card">
              {blocks.map((block) => (
                <ContentBlock
                  key={block.id}
                  block={block}
                  onUpdate={updateBlock}
                  onDelete={deleteBlock}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 m-0 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 shadow-lg border-2 border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  Summary
                </h3>
                {headingNodes.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAreAllCollapsed(!areAllCollapsed)}
                    className="text-xs"
                  >
                    {areAllCollapsed ? "Expand All" : "Collapse All"}
                  </Button>
                )}
              </div>
              
              {headingNodes.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Headings (drag to reorder, click to edit):</p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={headingNodes.map(node => node.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {headingNodes.map((node, idx) => (
                        <HeadingNodeComponent
                          key={node.id}
                          node={node}
                          level={0}
                          index={idx + 1}
                          forceCollapsed={areAllCollapsed}
                          onUpdate={(updatedNode) => {
                            const newNodes = [...headingNodes];
                            newNodes[idx] = updatedNode;
                            setHeadingNodes(newNodes);
                          }}
                          onDelete={() => {
                            setHeadingNodes(headingNodes.filter((_, i) => i !== idx));
                          }}
                          onPromote={() => {
                            if (idx > 0) {
                              const newNodes = [...headingNodes];
                              const node = newNodes.splice(idx, 1)[0];
                              newNodes.splice(idx - 1, 0, node);
                              setHeadingNodes(newNodes);
                            }
                          }}
                          onDemote={() => {
                            if (idx > 0) {
                              const newNodes = [...headingNodes];
                              const node = newNodes.splice(idx, 1)[0];
                              newNodes[idx - 1].children.push(node);
                              setHeadingNodes(newNodes);
                            }
                          }}
                          canDemote={idx > 0}
                          canPromote={false}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              <RichTextEditor
                value={summaryContent}
                onChange={setSummaryContent}
                onMarkHeading={markTextAsHeading}
                placeholder="Write additional summary notes here... Key points, important concepts, main ideas..."
                minHeight="200px"
                className="text-lg p-4 bg-card/50 border-2 border-primary/20 rounded-md"
              />
              {summaryBlocks.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Summary blocks from content:</p>
                  {summaryBlocks.map((block) => (
                    <div key={block.id} className="bg-card rounded-lg p-4 border border-border">
                      <p className="text-foreground whitespace-pre-wrap">
                        {block.content || "No summary added yet"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-xl p-4 shadow-lg border-2 border-secondary/20">
              <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <Lightbulb className="w-6 h-6 text-secondary-foreground" />
                </div>
                Mnemonics
              </h3>
              <RichTextEditor
                value={mnemonicContent}
                onChange={setMnemonicContent}
                placeholder="Create memorable mnemonics here... Acronyms, rhymes, associations..."
                minHeight="200px"
                className="text-lg p-4 bg-card/50 border-2 border-secondary/20 rounded-md"
              />
              {mnemonicBlocks.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Mnemonic blocks from content:</p>
                  {mnemonicBlocks.map((block) => (
                    <div key={block.id} className="bg-card rounded-lg p-4 border border-border">
                      <p className="text-foreground whitespace-pre-wrap">
                        {block.content || "No mnemonic added yet"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
