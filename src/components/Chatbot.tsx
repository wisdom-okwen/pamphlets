"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, X, Send, Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

interface ChatbotProps {
  mode?: 'floating';
}

export function Chatbot({ mode: _mode = 'floating' }: ChatbotProps = {}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Fetch user context data
  const { data: userContext } = trpc.chatbot.getUserContext.useQuery(undefined, {
    enabled: !!user && isOpen,
  });

  const { data: chatHistory, refetch: refetchHistory } = trpc.chatbot.getChatHistory.useQuery(
    { limit: 50 },
    {
      enabled: !!user && isOpen,
      staleTime: 0,
    }
  );

  const saveChatMessage = trpc.chatbot.saveChatMessage.useMutation();

  const deleteChatHistory = trpc.chatbot.deleteChatHistory.useMutation({
    onSuccess: () => {
      setMessages([]);
      utils.chatbot.getChatHistory.invalidate();
    },
  });

  // Load chat history when it's fetched
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0 && messages.length === 0) {
      setIsLoadingHistory(true);
      const loadedMessages: Message[] = chatHistory.map((msg) => ({
        id: msg.id.toString(),
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
      setIsLoadingHistory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory]);

  // Refetch history when chat opens
  useEffect(() => {
    if (isOpen && user) {
      refetchHistory();
    }
  }, [isOpen, user, refetchHistory]);

  const { data: rawArticleStats } = trpc.articles.getAll.useQuery(
    { limit: 1 },
    { enabled: isOpen }
  );

  const articleStats = rawArticleStats
    ? {
        items: rawArticleStats.items.map((item) => ({
          id: item.id,
          title: item.title,
          publishedAt: item.publishedAt,
          excerpt: item.excerpt ?? undefined,
        })),
        totalCount: rawArticleStats.totalCount,
      }
    : undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for chatbot open events from sidebar
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
    };

    window.addEventListener('openChatbot', handleOpenChatbot);
    return () => window.removeEventListener('openChatbot', handleOpenChatbot);
  }, []);

  interface ArticleStats {
    items: Array<{
      id: number;
      title: string;
      publishedAt: string | Date | null;
      excerpt?: string;
    }>;
    totalCount: number;
  }

  const generateResponse = async (userMessage: string, context: ChatbotData | undefined, stats: ArticleStats | undefined) => {
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context,
          stats,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Chatbot API error:', error);
      return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to database
      await saveChatMessage.mutateAsync({
        role: 'user',
        content: userMessageContent,
      });

      const response = await generateResponse(userMessageContent, userContext, articleStats);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveChatMessage.mutateAsync({
        role: 'assistant',
        content: response,
      });
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your chat history?")) {
      deleteChatHistory.mutate({});
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Chatbot toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 h-96 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-blue-600" />
              <span className="font-medium text-sm">Pamphlets Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1"
                  title="Clear chat history"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoadingHistory ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                <div className="flex justify-center space-x-1 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p>Loading chat history...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                <Bot size={32} className="mx-auto mb-2 opacity-50" />
                <p>Hi! I&apos;m your personalized AI assistant for <strong>Pamphlets</strong> - a platform for reading and sharing personal writings on anything. I can help you discover pamphlets, find content you&apos;ve interacted with, and answer questions about your activity on the platform!</p>
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Bot size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[70%] p-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-p:text-sm prose-headings:text-sm prose-li:text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0 text-sm">{children}</p>,
                          ul: ({ children }) => <ul className="ml-4 mb-1 text-sm">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-4 mb-1 text-sm">{children}</ol>,
                          li: ({ children }) => <li className="mb-0.5 text-sm">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-gray-200 dark:bg-zinc-600 px-1 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-200 dark:bg-zinc-600 p-2 rounded text-xs overflow-x-auto mb-1">
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  )}
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.role === 'user' && (
                  <User size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <Bot size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                <div className="bg-gray-100 dark:bg-zinc-700 p-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-zinc-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about pamphlets or your interactions..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}