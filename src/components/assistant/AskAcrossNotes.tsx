import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Square, Sparkles } from "lucide-react";
import { ContextFilterBar } from "./ContextFilterBar";
import type { ChatMessage, ContextFilter } from "@/lib/ai/types";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string, filter: ContextFilter) => void;
  onStop: () => void;
  filter: ContextFilter;
  onFilterChange: (filter: ContextFilter) => void;
}

const EXAMPLES = [
  "Quiz me on the key defence mechanisms.",
  "Explain Vygotsky's ZPD simply, then test me.",
  "Connect classical conditioning to operant conditioning.",
  "Predict an IGNOU exam question on Bowlby's attachment theory.",
];

export const AskAcrossNotes = ({ messages, isLoading, onSend, onStop, filter, onFilterChange }: Props) => {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), filter);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <ContextFilterBar filter={filter} onChange={onFilterChange} />
      </div>

      <ScrollArea className="flex-1 px-6 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Ask across your notes</h2>
            <p className="text-muted-foreground mb-8">
              A Socratic study mentor grounded in your IGNOU MA Psychology notes. Pick a context above, then try one of these:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="px-4 py-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent text-sm transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] prose prose-sm dark:prose-invert">
                    {m.content ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <div className="flex gap-1.5 py-2">
                        <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:120ms]" />
                        <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:240ms]" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border p-4 bg-background">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything about your notes…"
            rows={1}
            className="min-h-[44px] max-h-40 resize-none"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button onClick={onStop} variant="outline" size="icon" className="h-11 w-11">
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!input.trim()} size="icon" className="h-11 w-11">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
