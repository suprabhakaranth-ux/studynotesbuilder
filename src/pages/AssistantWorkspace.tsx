import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, BookOpen, Brain } from "lucide-react";
import { ConversationRail } from "@/components/assistant/ConversationRail";
import { AskAcrossNotes } from "@/components/assistant/AskAcrossNotes";
import { OllamaStatusBadge } from "@/components/assistant/OllamaStatusBadge";
import { OllamaSettingsPopover } from "@/components/assistant/OllamaSettingsPopover";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import type { ContextFilter } from "@/lib/ai/types";

const ComingSoon = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="flex-1 flex items-center justify-center text-center p-8">
    <div className="max-w-sm">
      <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">
        Coming in Phase 2. The workspace is wired to plug this in without changing the rest of the UI.
      </p>
    </div>
  </div>
);

const AssistantWorkspace = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ContextFilter>({ type: "all" });
  const [settingsKey, setSettingsKey] = useState(0);

  const {
    messages, conversations, activeId, isLoading,
    send, stop, startNew, loadConversation, deleteConversation,
  } = useAssistantChat();

  return (
    <div className="flex h-screen bg-background">
      <ConversationRail
        conversations={conversations}
        activeId={activeId}
        onSelect={loadConversation}
        onNew={startNew}
        onDelete={deleteConversation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-background">
          <div className="px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Notes
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-primary to-secondary">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-semibold">AI Study Assistant</h1>
                <span className="text-xs text-muted-foreground hidden md:inline">MA Psychology · IGNOU</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <OllamaStatusBadge refreshKey={settingsKey} />
              <OllamaSettingsPopover onChange={() => setSettingsKey((k) => k + 1)} />
            </div>
          </div>
        </header>

        <Tabs defaultValue="ask" className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border px-6">
            <TabsList className="h-11 bg-transparent p-0 gap-2">
              <TabsTrigger
                value="ask"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-3"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Ask Across Notes
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-3"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Quiz Generator
                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>
              </TabsTrigger>
              <TabsTrigger
                value="recall"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-3"
              >
                <Brain className="w-4 h-4 mr-2" /> Active Recall
                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ask" className="flex-1 min-h-0 m-0">
            <AskAcrossNotes
              messages={messages}
              isLoading={isLoading}
              onSend={send}
              onStop={stop}
              filter={filter}
              onFilterChange={setFilter}
            />
          </TabsContent>
          <TabsContent value="quiz" className="flex-1 min-h-0 m-0 flex">
            <ComingSoon title="Quiz Generator" icon={BookOpen} />
          </TabsContent>
          <TabsContent value="recall" className="flex-1 min-h-0 m-0 flex">
            <ComingSoon title="Active Recall Mode" icon={Brain} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssistantWorkspace;
