import { useState } from "react";
import { ArrowLeft, Plus, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentBlock, BlockType } from "./ContentBlock";
import { FormattingToolbar } from "./FormattingToolbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "1", type: "text", content: "" },
  ]);

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

  const summaryBlocks = blocks.filter((b) => b.type === "summary");
  const mnemonicBlocks = blocks.filter((b) => b.type === "mnemonic");

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">{topicTitle}</h2>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Block
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      </div>

      <Tabs defaultValue="full" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="full">Full Content</TabsTrigger>
          <TabsTrigger value="summary">Summary & Mnemonics</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="flex-1 overflow-auto m-0">
          <div className="max-w-4xl mx-auto">
            <FormattingToolbar onFormatChange={handleFormatChange} />
            <div className="p-6 space-y-4">
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Summary
              </h3>
              {summaryBlocks.length > 0 ? (
                summaryBlocks.map((block) => (
                  <div key={block.id} className="bg-accent/50 rounded-lg p-4 mb-3">
                    <p className="text-foreground whitespace-pre-wrap">
                      {block.content || "No summary added yet"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Add a summary block in the Full Content tab
                </p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-secondary" />
                Mnemonics
              </h3>
              {mnemonicBlocks.length > 0 ? (
                mnemonicBlocks.map((block) => (
                  <div key={block.id} className="bg-secondary/20 rounded-lg p-4 mb-3">
                    <p className="text-foreground whitespace-pre-wrap">
                      {block.content || "No mnemonic added yet"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Add a mnemonic block in the Full Content tab
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
