import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ollamaService } from "@/lib/ai/ollamaService";
import { loadContext } from "@/lib/ai/contextLoader";
import { buildSocraticSystemPrompt } from "@/lib/ai/prompts";
import type { ChatMessage, ContextFilter } from "@/lib/ai/types";

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export const useAssistantChat = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadConversation = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("conversation_id", id)
      .order("created_at");
    setMessages((data || []).map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })));
    setActiveId(id);
  }, []);

  const startNew = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveId(null);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("chat_conversations").delete().eq("id", id);
    if (id === activeId) startNew();
    await loadConversations();
  }, [activeId, startNew, loadConversations]);

  const ensureConversation = useCallback(async (firstMessage: string) => {
    if (activeId) return activeId;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      toast({ title: "Sign in required", description: "Please log in to chat.", variant: "destructive" });
      return null;
    }
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: userId, title })
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Could not start conversation", variant: "destructive" });
      return null;
    }
    setActiveId(data.id);
    await loadConversations();
    return data.id;
  }, [activeId, toast, loadConversations]);

  const persistMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
    });
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  const send = useCallback(async (text: string, filter: ContextFilter) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    const convId = await ensureConversation(text);
    if (!convId) { setIsLoading(false); return; }
    await persistMessage(convId, "user", text);

    try {
      const { scopeLabel, text: contextText } = await loadContext(filter);
      const systemPrompt = buildSocraticSystemPrompt(scopeLabel, contextText);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // append empty assistant placeholder
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let acc = "";
      const final = await ollamaService.streamChat({
        messages: nextMessages,
        systemPrompt,
        signal: ctrl.signal,
        onToken: (delta) => {
          acc += delta;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        },
      });

      if (final) {
        await persistMessage(convId, "assistant", final);
        await loadConversations();
      }
    } catch (err: any) {
      const message = err?.message || "Failed to reach Ollama. Is it running locally?";
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1].content) {
          copy.pop();
        }
        return copy;
      });
      toast({ title: "Assistant error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, ensureConversation, toast, loadConversations]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return {
    messages,
    conversations,
    activeId,
    isLoading,
    send,
    stop,
    startNew,
    loadConversation,
    deleteConversation,
  };
};
