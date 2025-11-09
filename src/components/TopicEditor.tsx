import { useState } from "react";
import { ArrowLeft, Plus, FileText, Lightbulb, Save, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentBlock, BlockType } from "./ContentBlock";
import { FormattingToolbar } from "./FormattingToolbar";
import { Textarea } from "@/components/ui/textarea";
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

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map((block) => (block.id === id ? { ...block, content } : block)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id));
  };

  const handleFormatChange = (format: string, value?: string) => {
    console.log("Format change:", format, value);
  };

  const handleSave = () => {
    // TODO: Implement actual save to localStorage or backend
    toast({
      title: "Saved successfully! ✨",
      description: "Your notes have been saved.",
    });
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

        <TabsContent value="full" className="flex-1 overflow-auto m-0">
          <div className="max-w-[210mm] mx-auto shadow-2xl bg-card">
            <FormattingToolbar onFormatChange={handleFormatChange} />
            <div className="p-8 min-h-[297mm] space-y-4 bg-card">
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
              <Textarea
                value={summaryContent}
                onChange={(e) => setSummaryContent(e.target.value)}
                placeholder="Write your summary here... Key points, important concepts, main ideas..."
                className="min-h-[200px] text-lg bg-card/50 border-2 border-primary/20 focus:border-primary"
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
              <Textarea
                value={mnemonicContent}
                onChange={(e) => setMnemonicContent(e.target.value)}
                placeholder="Create memorable mnemonics here... Acronyms, rhymes, associations..."
                className="min-h-[200px] text-lg bg-card/50 border-2 border-secondary/20 focus:border-secondary"
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
