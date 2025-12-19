import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, context, stats, history } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }

        // Validate history if provided
        const conversationHistory: Array<{
            role: "user" | "assistant";
            content: string;
        }> = [];
        if (Array.isArray(history)) {
            for (const msg of history) {
                if (
                    msg &&
                    typeof msg.content === "string" &&
                    (msg.role === "user" || msg.role === "assistant")
                ) {
                    conversationHistory.push({
                        role: msg.role,
                        content: msg.content,
                    });
                }
            }
        }

        // Check if API key is configured
        if (!process.env.NEXT_PUBLIC_OPENAI_KEY) {
            console.error("OpenAI API key not configured");
            return res.status(500).json({
                error: "OpenAI API key is not configured. Please check your environment variables.",
            });
        }

        console.log(
            "API key length:",
            process.env.NEXT_PUBLIC_OPENAI_KEY.length
        );
        console.log(
            "API key starts with:",
            process.env.NEXT_PUBLIC_OPENAI_KEY.substring(0, 20)
        );

        const openai = new OpenAI({
            apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
        });

        const systemPrompt = `You are a helpful AI assistant for "Pamphlets" - a platform for reading and sharing personal writings and free writeups about anything.

STRICT SCOPE LIMITATION:
You MUST ONLY answer questions related to:
1. The Pamphlets platform itself (features, navigation, how to use it)
2. The user's activity on the platform (their likes, bookmarks, comments)
3. Finding or discovering articles/pamphlets on the platform
4. General questions about what kinds of content exist on the platform

You MUST REFUSE to answer:
- General knowledge questions (history, science, math, geography, etc.)
- Programming or coding questions
- Personal advice or counseling
- Questions about other websites or services
- Any topic not directly related to the Pamphlets platform

When a user asks an off-topic question, politely redirect them:
"I'm the Pamphlets assistant and can only help with questions about this platform - like finding articles, checking your bookmarks and likes, or understanding how the site works. Is there anything about Pamphlets I can help you with?"

Platform Overview:
- Pamphlets is a platform for personal writings - free writeups about anything
- Users can read pamphlets, like them, bookmark them, and leave comments
- Authors can publish pamphlets on diverse topics
- The platform supports markdown formatting

User Context:
${
    context
        ? `
Current user: ${context.user.username} (Role: ${context.user.role})
Joined: ${new Date(context.user.joinedAt).toLocaleDateString()}
Liked pamphlets: ${context.interactions.likedArticles.length}
${
    context.interactions.likedArticles.length > 0
        ? `Recent likes: ${context.interactions.likedArticles
              .slice(0, 3)
              .map((a: { title: string }) => a.title)
              .join(", ")}`
        : ""
}
Bookmarked pamphlets: ${context.interactions.bookmarkedArticles.length}
${
    context.interactions.bookmarkedArticles.length > 0
        ? `Recent bookmarks: ${context.interactions.bookmarkedArticles
              .slice(0, 3)
              .map((a: { title: string }) => a.title)
              .join(", ")}`
        : ""
}
Comments made: ${context.interactions.comments.length}
`
        : "No user context available (user not logged in)"
}

Platform Statistics:
${
    stats
        ? `
Total pamphlets: ${stats.totalCount}
Most recent pamphlet: ${stats.items?.[0]?.title || "None"}
`
        : "No statistics available"
}

Instructions:
- Help users discover pamphlets on the platform
- Answer questions about the user's interactions (liked pamphlets, bookmarks, comments)
- Explain platform features
- Keep responses concise and friendly
- ALWAYS stay within the platform scope - refuse off-topic questions politely
- Be conversational and remember what the user said earlier in the conversation
- If a user says "no" or declines something, acknowledge it naturally (e.g., "No problem! Let me know if you need anything else.") rather than repeating your introduction`;

        // Build messages array with history
        const apiMessages: Array<{
            role: "system" | "user" | "assistant";
            content: string;
        }> = [{ role: "system", content: systemPrompt }];

        // Add conversation history (excluding the current message which is added separately)
        // Skip the last message if it matches the current user message (to avoid duplication)
        for (const msg of conversationHistory) {
            if (msg.content !== message || msg.role !== "user") {
                apiMessages.push({ role: msg.role, content: msg.content });
            }
        }

        // Add the current user message
        apiMessages.push({ role: "user", content: message });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: apiMessages,
            max_tokens: 500,
            temperature: 0.7,
        });

        const response =
            completion.choices[0]?.message?.content ||
            "I'm sorry, I couldn't generate a response right now.";

        res.status(200).json({ response });
    } catch (error) {
        console.error("OpenAI API error:", error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("Incorrect API key")
            ) {
                return res.status(500).json({
                    error: "Authentication failed. Please check the OpenAI API key configuration.",
                });
            }
            if (
                error.message.includes("429") ||
                error.message.includes("rate limit")
            ) {
                return res.status(500).json({
                    error: "Rate limit exceeded. Please try again later.",
                });
            }
            if (
                error.message.includes("500") ||
                error.message.includes("502") ||
                error.message.includes("503")
            ) {
                return res.status(500).json({
                    error: "OpenAI service is temporarily unavailable. Please try again later.",
                });
            }
        }

        res.status(500).json({
            error: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.",
        });
    }
}
