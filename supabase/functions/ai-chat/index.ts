import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, contextFilter } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user's study data for context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch study materials based on context filter
    let subjectsRes, chaptersRes, topicsRes, blocksRes;
    
    if (contextFilter?.type === 'topic' && contextFilter.topicId) {
      // Fetch only the specific topic and its blocks
      [topicsRes, blocksRes] = await Promise.all([
        supabase.from('topics').select('*').eq('id', contextFilter.topicId).eq('user_id', user.id),
        supabase.from('blocks').select('*').eq('topic_id', contextFilter.topicId).eq('user_id', user.id)
      ]);
      subjectsRes = { data: [] };
      chaptersRes = { data: [] };
    } else if (contextFilter?.type === 'chapter' && contextFilter.chapterId) {
      // Fetch all topics and blocks for the specific chapter
      [chaptersRes, topicsRes, blocksRes] = await Promise.all([
        supabase.from('chapters').select('*').eq('id', contextFilter.chapterId).eq('user_id', user.id),
        supabase.from('topics').select('*').eq('chapter_id', contextFilter.chapterId).eq('user_id', user.id),
        supabase.from('blocks').select('*').eq('user_id', user.id)
      ]);
      
      const topics = topicsRes.data || [];
      const topicIds = topics.map(t => t.id);
      if (topicIds.length > 0) {
        blocksRes = await supabase.from('blocks').select('*').in('topic_id', topicIds).eq('user_id', user.id);
      }
      subjectsRes = { data: [] };
    } else if (contextFilter?.type === 'subject' && contextFilter.subjectId) {
      // Fetch all chapters, topics, and blocks for the specific subject
      [subjectsRes, chaptersRes, topicsRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('id', contextFilter.subjectId).eq('user_id', user.id),
        supabase.from('chapters').select('*').eq('subject_id', contextFilter.subjectId).eq('user_id', user.id),
        supabase.from('topics').select('*').eq('subject_id', contextFilter.subjectId).eq('user_id', user.id)
      ]);
      
      const topics = topicsRes.data || [];
      const topicIds = topics.map(t => t.id);
      if (topicIds.length > 0) {
        blocksRes = await supabase.from('blocks').select('*').in('topic_id', topicIds).eq('user_id', user.id);
      } else {
        blocksRes = { data: [] };
      }
    } else {
      // Default: Fetch recent topics and blocks
      [subjectsRes, chaptersRes, topicsRes, blocksRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('chapters').select('*').eq('user_id', user.id),
        supabase.from('topics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('blocks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
      ]);
    }

    // Build context from user's data (limited to avoid token limits)
    const subjects = subjectsRes.data || [];
    const chapters = chaptersRes.data || [];
    const topics = topicsRes.data || [];
    const blocks = blocksRes.data || [];

    let contextText = "# User's Study Materials for MA Psychology IGNOU\n\n";
    
    // Add context scope information
    if (contextFilter?.type === 'topic') {
      const topic = topics[0];
      contextText += `## Focused Context: Single Topic\n`;
      contextText += `Topic: ${topic?.title || 'Unknown'}\n\n`;
    } else if (contextFilter?.type === 'chapter') {
      const chapter = chaptersRes.data?.[0];
      contextText += `## Focused Context: Chapter\n`;
      contextText += `Chapter: ${chapter?.name || 'Unknown'}\n`;
      contextText += `Topics: ${topics.length} topics in this chapter\n\n`;
    } else if (contextFilter?.type === 'subject') {
      const subject = subjectsRes.data?.[0];
      contextText += `## Focused Context: Subject\n`;
      contextText += `Subject: ${subject?.name || 'Unknown'}\n`;
      contextText += `Chapters: ${chapters.length} chapters\n`;
      contextText += `Topics: ${topics.length} topics\n\n`;
    } else {
      contextText += `Available Subjects: ${subjects.map(s => s.name).join(', ')}\n`;
      contextText += `Available Chapters: ${chapters.length} chapters across all subjects\n`;
      contextText += `Available Topics: ${topics.length} topics\n\n`;
    }
    
    // Include topics and their content
    contextText += "## Content:\n\n";
    const topicsToShow = contextFilter?.type ? topics : topics.slice(0, 20);
    topicsToShow.forEach(topic => {
      const chapter = chapters.find(c => c.id === topic.chapter_id);
      const subject = subjects.find(s => s.id === topic.subject_id);
      contextText += `### ${topic.title}\n`;
      if (chapter && subject) {
        contextText += `(${subject.name} - ${chapter.name})\n`;
      }
      
      const topicBlocks = blocks.filter(b => b.topic_id === topic.id);
      const blocksToShow = contextFilter?.type === 'topic' ? topicBlocks : topicBlocks.slice(0, 3);
      blocksToShow.forEach(block => {
        if (block.content) {
          const maxLength = contextFilter?.type === 'topic' ? 2000 : 500;
          const content = block.content.length > maxLength 
            ? block.content.substring(0, maxLength) + '...' 
            : block.content;
          contextText += `${content}\n\n`;
        }
      });
    });

    const contextScope = contextFilter?.type === 'topic' 
      ? 'focused on a specific topic'
      : contextFilter?.type === 'chapter'
      ? 'focused on a specific chapter'
      : contextFilter?.type === 'subject'
      ? 'focused on a specific subject'
      : 'showing recent topics from their library';
    
    const systemPrompt = `You are an AI study assistant for MA Psychology IGNOU students. You have access to the student's study materials (${contextScope}).

Your capabilities:
- Create quizzes and practice questions based on their notes
- Generate exam-ready answers to IGNOU past papers
- Explain psychology concepts (both from their notes and beyond)
- Help with exam preparation and study strategies
- Provide detailed explanations of theories, research methods, and psychological concepts

${contextText}

When answering:
- If the question relates to their notes, reference specific topics/chapters
- For quiz creation, use their actual content
- For concepts beyond their notes, provide comprehensive explanations
- For IGNOU exam questions, structure answers in exam format with proper headings
- Be encouraging and supportive
${!contextFilter?.type ? '- If you need more focused context, the student can filter to a specific subject, chapter, or topic' : ''}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
