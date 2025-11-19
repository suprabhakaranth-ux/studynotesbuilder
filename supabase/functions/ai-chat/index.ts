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
    const { messages, conversationId } = await req.json();
    
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

    // Fetch all user's study materials
    const [subjectsRes, chaptersRes, topicsRes, blocksRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', user.id),
      supabase.from('chapters').select('*').eq('user_id', user.id),
      supabase.from('topics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50), // Limit to recent 50 topics
      supabase.from('blocks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100) // Limit to recent 100 blocks
    ]);

    // Build context from user's data (limited to avoid token limits)
    const subjects = subjectsRes.data || [];
    const chapters = chaptersRes.data || [];
    const topics = topicsRes.data || [];
    const blocks = blocksRes.data || [];

    let contextText = "# User's Study Materials for MA Psychology IGNOU\n\n";
    contextText += `Available Subjects: ${subjects.map(s => s.name).join(', ')}\n`;
    contextText += `Available Chapters: ${chapters.length} chapters across all subjects\n`;
    contextText += `Available Topics: ${topics.length} topics\n\n`;
    
    // Include recent topics and their content (summarized)
    contextText += "## Recent Topics and Content:\n\n";
    topics.slice(0, 20).forEach(topic => {
      const chapter = chapters.find(c => c.id === topic.chapter_id);
      const subject = subjects.find(s => s.id === topic.subject_id);
      contextText += `### ${topic.title}\n`;
      if (chapter && subject) {
        contextText += `(${subject.name} - ${chapter.name})\n`;
      }
      
      const topicBlocks = blocks.filter(b => b.topic_id === topic.id);
      topicBlocks.slice(0, 3).forEach(block => {
        if (block.content) {
          // Limit each block content to first 500 characters
          const content = block.content.length > 500 
            ? block.content.substring(0, 500) + '...' 
            : block.content;
          contextText += `${content}\n\n`;
        }
      });
    });

    const systemPrompt = `You are an AI study assistant for MA Psychology IGNOU students. You have access to the student's study materials (recent topics shown below).

Your capabilities:
- Create quizzes and practice questions based on their notes
- Generate exam-ready answers to IGNOU past papers
- Explain psychology concepts (both from their notes and beyond)
- Help with exam preparation and study strategies
- Provide detailed explanations of theories, research methods, and psychological concepts

Note: You're seeing a summary of recent topics. The student has ${subjects.length} subjects, ${chapters.length} chapters, and ${topics.length} total topics in their library.

${contextText}

When answering:
- If the question relates to their notes, reference specific topics/chapters
- For quiz creation, use their actual content
- For concepts beyond their notes, provide comprehensive explanations
- For IGNOU exam questions, structure answers in exam format with proper headings
- Be encouraging and supportive
- If you need more context about a specific topic, ask the student to specify which subject/chapter`;

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
