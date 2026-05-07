import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, List, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArticleProse } from "@/components/ArticleProse";

interface Block {
  id: string;
  type: string;
  content: string;
  headings?: string[];
}

interface HeadingNode {
  id: string;
  title: string;
  notes: string;
  children: HeadingNode[];
}

interface PublicTopicViewerProps {
  topicId: string;
}

export const PublicTopicViewer = ({ topicId }: PublicTopicViewerProps) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [summaryContent, setSummaryContent] = useState("");
  const [mnemonicContent, setMnemonicContent] = useState("");
  const [headingNodes, setHeadingNodes] = useState<HeadingNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load blocks
      const { data: blocksData } = await supabase
        .from("blocks")
        .select("*")
        .eq("topic_id", topicId)
        .order("block_order", { ascending: true });

      if (blocksData) {
        setBlocks(blocksData.map(b => ({
          id: b.id,
          type: b.type,
          content: b.content || "",
          headings: b.headings ? JSON.parse(JSON.stringify(b.headings)) : []
        })));
      }

      // Load summary
      const { data: summaryData } = await supabase
        .from("summaries")
        .select("*")
        .eq("topic_id", topicId)
        .maybeSingle();

      if (summaryData) {
        setSummaryContent(summaryData.content || "");
      }

      // Load mnemonic
      const { data: mnemonicData } = await supabase
        .from("mnemonics")
        .select("*")
        .eq("topic_id", topicId)
        .maybeSingle();

      if (mnemonicData) {
        setMnemonicContent(mnemonicData.content || "");
      }

      // Load heading nodes and rebuild tree
      const { data: headingNodesData } = await supabase
        .from("heading_nodes")
        .select("*")
        .eq("topic_id", topicId)
        .order("node_order", { ascending: true });

      if (headingNodesData && headingNodesData.length > 0) {
        const nodeMap = new Map<string, HeadingNode>();
        headingNodesData.forEach(h => {
          nodeMap.set(h.id, {
            id: h.id,
            title: h.title,
            notes: h.notes || "",
            children: []
          });
        });

        const rootNodes: HeadingNode[] = [];
        headingNodesData.forEach(h => {
          const node = nodeMap.get(h.id)!;
          if (h.parent_id) {
            const parent = nodeMap.get(h.parent_id);
            if (parent) {
              parent.children.push(node);
            }
          } else {
            rootNodes.push(node);
          }
        });

        setHeadingNodes(rootNodes);
      }

      setLoading(false);
    };

    loadData();
  }, [topicId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading content...</div>
      </div>
    );
  }

  const hasContent = blocks.some(b => b.content.trim());
  const hasSummary = summaryContent.trim() || headingNodes.length > 0;
  const hasMnemonic = mnemonicContent.trim();

  if (!hasContent && !hasSummary && !hasMnemonic) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>This topic has no content yet.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
        <TabsTrigger value="content" className="gap-2">
          <FileText className="h-4 w-4" />
          Full Content
        </TabsTrigger>
        <TabsTrigger value="summary" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Summary
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-4">
        {blocks.map((block) => (
          block.content && (
            <Card key={block.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <ArticleProse html={block.content} />
              </CardContent>
            </Card>
          )
        ))}
      </TabsContent>

      <TabsContent value="summary" className="space-y-6">
        {headingNodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <List className="h-5 w-5" />
                Key Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HeadingTreeView nodes={headingNodes} />
            </CardContent>
          </Card>
        )}

        {summaryContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Summary Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleProse html={summaryContent} />
            </CardContent>
          </Card>
        )}

        {mnemonicContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5" />
                Mnemonics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleProse html={mnemonicContent} />
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};

const HeadingTreeView = ({ nodes, level = 0 }: { nodes: HeadingNode[]; level?: number }) => {
  return (
    <div className={level > 0 ? "ml-4 border-l-2 border-border pl-4" : ""}>
      {nodes.map((node) => (
        <HeadingNodeView key={node.id} node={node} level={level} />
      ))}
    </div>
  );
};

const HeadingNodeView = ({ node, level }: { node: HeadingNode; level: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const hasNotes = node.notes.trim();

  return (
    <div className="mb-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded-md p-2 -ml-2 transition-colors">
          {(hasChildren || hasNotes) ? (
            isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
          <span className={`font-medium ${level === 0 ? 'text-base' : 'text-sm'}`}>
            {node.title}
          </span>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {hasNotes && (
            <div 
            <ArticleProse html={node.notes} className="ml-6 mt-2" />
            />
          )}
          {hasChildren && (
            <div className="mt-2">
              <HeadingTreeView nodes={node.children} level={level + 1} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
