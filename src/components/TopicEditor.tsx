import { useState, useEffect } from "react";
import { ArrowLeft, Plus, FileText, Lightbulb, Save, BookOpen } from "lucide-react";
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
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "1", type: "text", content: "" },
  ]);
  const [summaryContent, setSummaryContent] = useState("");
  const [mnemonicContent, setMnemonicContent] = useState("");
  const [headingNodes, setHeadingNodes] = useState<HeadingNode[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedBlocks = localStorage.getItem(`topic_blocks_${topicId}`);
    const savedSummary = localStorage.getItem(`topic_summary_${topicId}`);
    const savedMnemonic = localStorage.getItem(`topic_mnemonic_${topicId}`);
    const savedHeadingNodes = localStorage.getItem(`topic_heading_nodes_${topicId}`);
    
    if (savedBlocks) {
      setBlocks(JSON.parse(savedBlocks));
    }
    if (savedSummary) {
      setSummaryContent(savedSummary);
    }
    if (savedMnemonic) {
      setMnemonicContent(savedMnemonic);
    }
    if (savedHeadingNodes) {
      try {
        setHeadingNodes(JSON.parse(savedHeadingNodes));
      } catch {
        setHeadingNodes([]);
      }
    }
  }, [topicId]);

  // Save to localStorage whenever content changes
  useEffect(() => {
    localStorage.setItem(`topic_blocks_${topicId}`, JSON.stringify(blocks));
  }, [blocks, topicId]);

  useEffect(() => {
    localStorage.setItem(`topic_summary_${topicId}`, summaryContent);
  }, [summaryContent, topicId]);

  useEffect(() => {
    localStorage.setItem(`topic_mnemonic_${topicId}`, mnemonicContent);
  }, [mnemonicContent, topicId]);

  useEffect(() => {
    localStorage.setItem(`topic_heading_nodes_${topicId}`, JSON.stringify(headingNodes));
  }, [headingNodes, topicId]);

  // Auto-populate headings from blocks
  useEffect(() => {
    const allHeadings = blocks
      .filter(b => b.headings && b.headings.length > 0)
      .flatMap(b => b.headings || []);
    
    // Only add new headings, don't remove existing ones
    const existingTitles = new Set(headingNodes.map(h => h.title));
    const newHeadings = allHeadings.filter(h => !existingTitles.has(h));
    
    if (newHeadings.length > 0) {
      const newNodes: HeadingNode[] = newHeadings.map(h => ({
        id: Date.now().toString() + Math.random(),
        title: h,
        notes: "",
        children: []
      }));
      setHeadingNodes([...headingNodes, ...newNodes]);
    }
  }, [blocks]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
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
    setBlocks(blocks.filter((block) => block.id !== id));
  };

  const handleSave = () => {
    toast({
      title: "Saved successfully! ✨",
      description: "Your notes have been saved.",
    });
  };

  const markTextAsHeading = (text: string) => {
    // Find the active block being edited
    const activeBlock = blocks.find(b => b.type === "text");
    if (activeBlock) {
      const currentHeadings = activeBlock.headings || [];
      updateBlock(activeBlock.id, activeBlock.content, [...currentHeadings, text]);
    }
  };

  const summaryBlocks = blocks.filter((b) => b.type === "summary");
  const mnemonicBlocks = blocks.filter((b) => b.type === "mnemonic");

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="border-b-2 border-border p-4 flex items-center justify-between bg-card/80 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-primary/10">
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

        <TabsContent value="full" className="flex-1 m-0 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 bg-card shadow-md border-b border-border">
            <FormattingToolbar onMarkHeading={markTextAsHeading} />
          </div>
          <div className="flex-1 overflow-y-auto px-4">
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
          </div>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 m-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 shadow-lg border-2 border-primary/20">
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  Summary
                </h3>
                
                {headingNodes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Headings (click to edit, use buttons to organize):</p>
                    {headingNodes.map((node, idx) => (
                      <HeadingNodeComponent
                        key={node.id}
                        node={node}
                        level={0}
                        index={idx + 1}
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
                  </div>
                )}

              <RichTextEditor
                value={summaryContent}
                onChange={setSummaryContent}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
