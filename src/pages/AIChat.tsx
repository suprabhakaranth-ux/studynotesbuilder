import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useAIChat';
import { Send, Plus, Trash2, MessageSquare, ArrowLeft, Copy, Check, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const AIChat = () => {
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
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
  } = useAIChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-load chapters when subject filter is active
  useEffect(() => {
    if (contextFilter.type === 'subject' && contextFilter.subjectId) {
      loadChapters(contextFilter.subjectId);
    }
  }, [contextFilter.type, contextFilter.subjectId, loadChapters]);

  // Auto-load topics when chapter filter is active
  useEffect(() => {
    if (contextFilter.type === 'chapter' && contextFilter.chapterId) {
      loadTopics(contextFilter.chapterId);
    }
  }, [contextFilter.type, contextFilter.chapterId, loadTopics]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleFilterChange = (type: 'all' | 'subject' | 'chapter' | 'topic', value?: string) => {
    if (type === 'all') {
      setContextFilter({ type: 'all' });
    } else if (type === 'subject' && value) {
      setContextFilter({ type: 'subject', subjectId: value });
      loadChapters(value);
    } else if (type === 'chapter' && value) {
      const chapter = chapters.find(c => c.id === value);
      if (chapter) {
        setContextFilter({ type: 'chapter', subjectId: chapter.subject_id, chapterId: value });
        loadTopics(value);
      }
    } else if (type === 'topic' && value) {
      const topic = topics.find(t => t.id === value);
      if (topic) {
        setContextFilter({ 
          type: 'topic', 
          subjectId: topic.subject_id, 
          chapterId: topic.chapter_id, 
          topicId: value 
        });
      }
    }
  };

  const clearFilter = () => {
    setContextFilter({ type: 'all' });
  };

  const getFilterLabel = () => {
    if (contextFilter.type === 'all') return null;
    if (contextFilter.type === 'topic') {
      const topic = topics.find(t => t.id === contextFilter.topicId);
      return topic?.title || 'Topic';
    }
    if (contextFilter.type === 'chapter') {
      const chapter = chapters.find(c => c.id === contextFilter.chapterId);
      return chapter?.name || 'Chapter';
    }
    if (contextFilter.type === 'subject') {
      const subject = subjects.find(s => s.id === contextFilter.subjectId);
      return subject?.name || 'Subject';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <Button 
              onClick={() => navigate('/')}
              variant="ghost" 
              className="w-full justify-start mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notes
            </Button>
            <Button 
              onClick={startNewChat} 
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-3 mb-1 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  currentConversationId === conv.id ? 'bg-accent' : ''
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{conv.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border">
          <div className="h-16 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">AI Study Assistant</h1>
              <span className="text-sm text-muted-foreground">MA Psychology IGNOU</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter Context
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? 'Hide' : 'Show'} History
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          {showFilter && (
            <div className="px-6 py-4 bg-muted/30 border-t border-border space-y-4">
              {/* Tab Buttons */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Filter Context:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={contextFilter.type === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContextFilter({ type: 'all' })}
                  >
                    All (Recent)
                  </Button>
                  <Button
                    variant={contextFilter.type === 'subject' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContextFilter({ type: 'subject' })}
                  >
                    Subject
                  </Button>
                  <Button
                    variant={contextFilter.type === 'chapter' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContextFilter({ type: 'chapter' })}
                  >
                    Chapter
                  </Button>
                  <Button
                    variant={contextFilter.type === 'topic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setContextFilter({ type: 'topic' })}
                  >
                    Topic
                  </Button>
                </div>
              </div>

              {/* Cascading Dropdowns */}
              {contextFilter.type !== 'all' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={contextFilter.subjectId || ''}
                    onValueChange={(value) => handleFilterChange('subject', value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Choose subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(contextFilter.type === 'chapter' || contextFilter.type === 'topic') && contextFilter.subjectId && (
                    <Select
                      value={contextFilter.chapterId || ''}
                      onValueChange={(value) => handleFilterChange('chapter', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Choose chapter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((chapter) => (
                          <SelectItem key={chapter.id} value={chapter.id}>
                            {chapter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {contextFilter.type === 'topic' && contextFilter.chapterId && (
                    <Select
                      value={contextFilter.topicId || ''}
                      onValueChange={(value) => handleFilterChange('topic', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Choose topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Active Filter Badge */}
              {getFilterLabel() && (
                <Badge variant="secondary" className="gap-2">
                  Context: {getFilterLabel()}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:opacity-70" 
                    onClick={clearFilter}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-semibold mb-4">Welcome to AI Study Assistant</h2>
                <p className="text-muted-foreground mb-6">
                  Ask me anything about your MA Psychology studies! I can:
                </p>
                <ul className="text-left text-sm text-muted-foreground space-y-2">
                  <li>• Create quizzes and practice questions</li>
                  <li>• Generate exam-ready answers to IGNOU past papers</li>
                  <li>• Explain psychology concepts in detail</li>
                  <li>• Help with exam preparation strategies</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 relative group ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(message.content, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none pr-8">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your studies..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
