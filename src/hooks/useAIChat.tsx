import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ContextFilter {
  type: 'all' | 'subject' | 'chapter' | 'topic';
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  chapter_id: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contextFilter, setContextFilter] = useState<ContextFilter>({ type: 'all' });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    setSubjects(data || []);
  };

  const loadChapters = async (subjectId: string) => {
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', subjectId)
      .order('chapter_order');
    setChapters(data || []);
  };

  const loadTopics = async (chapterId: string) => {
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });
    setTopics(data || []);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    setCurrentConversationId(conversationId);
  };

  const createNewConversation = async (firstMessage: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    await loadConversations();
    return data.id;
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content
    });

    // Update conversation updated_at
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const sendMessage = async (userMessage: string, filterOverride?: ContextFilter) => {
    if (!userMessage.trim() || isLoading) return;

    const filterToUse = filterOverride || contextFilter;
    let convId = currentConversationId;
    
    // Create new conversation if none exists
    if (!convId) {
      convId = await createNewConversation(userMessage);
      if (!convId) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive'
        });
        return;
      }
      setCurrentConversationId(convId);
    }

    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', userMessage);

    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          conversationId: convId,
          contextFilter: filterToUse
        }),
      });

      if (response.status === 429) {
        toast({
          title: 'Rate Limit',
          description: 'Too many requests. Please try again later.',
          variant: 'destructive'
        });
        return;
      }

      if (response.status === 402) {
        toast({
          title: 'Credits Required',
          description: 'Please add credits to your Lovable AI workspace.',
          variant: 'destructive'
        });
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';
      let streamDone = false;

      const updateAssistantMessage = (content: string) => {
        assistantContent = content;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              updateAssistantMessage(assistantContent + content);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save final assistant message
      if (assistantContent && convId) {
        await saveMessage(convId, 'assistant', assistantContent);
        await loadConversations();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive'
      });
      return;
    }

    if (conversationId === currentConversationId) {
      startNewChat();
    }
    await loadConversations();
  };

  return {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    sendMessage,
    loadConversation,
    startNewChat,
    deleteConversation,
    contextFilter,
    setContextFilter,
    subjects,
    chapters,
    topics,
    loadChapters,
    loadTopics
  };
};
