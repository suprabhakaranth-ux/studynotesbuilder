import { useState, useEffect } from "react";
import { ArrowLeft, Plus, FileText, Lightbulb, Save, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentBlock, BlockType } from "./ContentBlock";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextEditor } from "./RichTextEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  headings?: string[];
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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedBlocks = localStorage.getItem(`topic_blocks_${topicId}`);
    const savedSummary = localStorage.getItem(`topic_summary_${topicId}`);
    const savedMnemonic = localStorage.getItem(`topic_mnemonic_${topicId}`);
    
    if (savedBlocks) {
      setBlocks(JSON.parse(savedBlocks));
    }
    if (savedSummary) {
      setSummaryContent(savedSummary);
    }
    if (savedMnemonic) {
      setMnemonicContent(savedMnemonic);
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

  // Extract all headings from blocks for summary accordion
  const allHeadings = blocks
    .filter(b => b.headings && b.headings.length > 0)
    .flatMap(b => b.headings || []);

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

        <TabsContent value="full" className="flex-1 overflow-auto m-0 px-4">
          <div className="w-full max-w-[210mm] mx-auto shadow-2xl bg-card mb-8">
            <FormattingToolbar />
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

        <TabsContent value="summary" className="flex-1 overflow-auto m-0 p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 shadow-lg border-2 border-primary/20">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <FileText className="w-6 h-6 text-primary-foreground" />
                </div>
                Summary
              </h3>
              
              {allHeadings.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Auto-populated headings from content:</p>
                  <Accordion type="single" collapsible className="w-full">
                     {allHeadings.map((heading, idx) => (
                      <AccordionItem key={idx} value={`heading-${idx}`} className="border border-primary/20 rounded-lg mb-2 px-4 bg-card/50">
                        <AccordionTrigger className="text-left font-semibold text-primary hover:no-underline">
                          {heading}
                        </AccordionTrigger>
                        <AccordionContent>
                          <RichTextEditor
                            value=""
                            onChange={() => {}}
                            placeholder="Add notes or breakdown for this heading..."
                            minHeight="100px"
                            className="p-3 border border-border rounded-md bg-background/50"
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
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

            <div className="bg-gradient-to-br from-secondary/10 to-accent/10 rounded-xl p-6 shadow-lg border-2 border-secondary/20">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
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
