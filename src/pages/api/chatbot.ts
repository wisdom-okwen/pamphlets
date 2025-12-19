import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

interface ChatbotData {
  user: {
    id: string;
    username: string;
    role: string;
    joinedAt: Date;
  };
  interactions: {
    likedArticles: Array<{
      id: number;
      title: string;
      slug: string;
      publishedAt: Date | null;
    }>;
    bookmarkedArticles: Array<{
      id: number;
      title: string;
      slug: string;
      publishedAt: Date | null;
    }>;
    comments: Array<{
      id: number;
      content: string;
      createdAt: Date;
      article: {
        id: number;
        title: string;
        slug: string;
      };
      reactionCount: number;
      reactions: {
        likes: number;
        loves: number;
        supports: number;
      };
    }>;
  };
}

interface ArticleStats {
  items: Array<{
    id: number;
    title: string;
    publishedAt: string | Date | null;
    excerpt?: string;
  }>;
  totalCount: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context, stats } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if API key is configured
    if (!process.env.NEXT_PUBLIC_OPENAI_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({
        error: "OpenAI API key is not configured. Please check your environment variables."
      });
    }

    console.log('API key length:', process.env.NEXT_PUBLIC_OPENAI_KEY.length);
    console.log('API key starts with:', process.env.NEXT_PUBLIC_OPENAI_KEY.substring(0, 20));

    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
    });

    const systemPrompt = `You are a personalized AI assistant for "Pamphlets" - a platform dedicated to personal development, wellbeing, and positive behavioral change.

Platform Overview:
- Pamphlets is a comprehensive content platform focused on personal growth, technology, education, career development, mental health, self-improvement, and life skills
- Users can read articles, like them, bookmark them, and leave comments to engage with the community
- Authors can write and publish articles covering diverse topics for personal development
- The platform supports rich markdown formatting for articles

IMPORTANT: You are NOT a development advisor or therapist. You do NOT provide personal advice, counseling, or guidance on personal development, mental health, or behavioral change. Your role is strictly to help users find and learn about articles on the platform, and answer questions about their interactions.

User Context:
${context ? `
Current user: ${context.user.username} (Role: ${context.user.role})
Joined: ${new Date(context.user.joinedAt).toLocaleDateString()}
Liked articles: ${context.interactions.likedArticles.length}
Bookmarked articles: ${context.interactions.bookmarkedArticles.length}
Comments made: ${context.interactions.comments.length}
` : 'No user context available'}

Platform Statistics:
${stats ? `
Total articles: ${stats.totalCount}
Most recent article: ${stats.items?.[0]?.title || 'None'}
` : 'No statistics available'}

Instructions:
- Help users discover and learn about articles on the platform
- Answer questions about the user's interactions (liked articles, bookmarks, comments)
- Provide information about platform features and statistics
- Reference the user's personal interactions when relevant
- Keep responses concise but informative
- If asked about specific articles, provide helpful summaries or suggestions
- Always maintain a professional and helpful tone
- Do NOT provide personal advice, counseling, or guidance on development topics
- Redirect users to appropriate articles for development-related questions
- Focus on helping users navigate and understand the content on the platform`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now.";

    res.status(200).json({ response });
  } catch (error) {
    console.error('OpenAI API error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        return res.status(500).json({
          error: "Authentication failed. Please check the OpenAI API key configuration."
        });
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return res.status(500).json({
          error: "Rate limit exceeded. Please try again later."
        });
      }
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return res.status(500).json({
          error: "OpenAI service is temporarily unavailable. Please try again later."
        });
      }
    }

    res.status(500).json({
      error: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later."
    });
  }
}