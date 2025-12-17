import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { trpc } from "@/lib/trpc";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Bookmark, ThumbsUp, HandHeart } from "lucide-react";
import { getGenreColor } from "@/models/genreColors";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal, useAuthModal } from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/clients/browser";

interface GenreType {
  id: number;
  name: string;
  slug: string;
}

interface ContentBlock {
  type: string;
  content?: string;
}

interface CommentType {
  id: number;
  content: string;
  createdAt: Date;
  user?: {
    username?: string;
  };
  likeCount?: number;
  loveCount?: number;
  supportCount?: number;
  userLiked?: boolean;
  userLoved?: boolean;
  userSupported?: boolean;
}

interface ArticleWithCounts {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: ContentBlock[];
  coverImageUrl?: string | null;
  viewCount: number;
  genre?: GenreType | null;
  genres?: GenreType[];
  author?: { username?: string };
  userHasLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Render markdown-like text to JSX, handling images, YouTube embeds, bold, italic, links, headers, and paragraphs.
 */
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Split text into lines first to handle headers properly
  const lines = text.split(/\n/);
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim();
      if (paragraphText) {
        parts.push(
          <p key={key++} className="mb-3">
            {renderInlineMarkdown(paragraphText)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Empty line = end of paragraph
    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    // Check for headers: # Header, ## Header, etc.
    const headerMatch = trimmedLine.match(/^(#{1,6})\s*(.+)$/);
    if (headerMatch) {
      flushParagraph();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2].trim();
      const headerClasses: Record<number, string> = {
        1: "text-xl font-bold mb-2 mt-4",
        2: "text-lg font-bold mb-2 mt-3",
        3: "text-base font-semibold mb-2 mt-3",
        4: "text-sm font-semibold mb-1 mt-2",
        5: "text-sm font-medium mb-1 mt-2",
        6: "text-xs font-medium mb-1 mt-2",
      };
      parts.push(
        <div key={key++} className={headerClasses[level] || headerClasses[3]}>
          {renderInlineMarkdown(headerText)}
        </div>
      );
      continue;
    }

    // Check for YouTube URL on its own line
    const youtubeMatch = trimmedLine.match(/^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+)$/);
    if (youtubeMatch) {
      flushParagraph();
      const videoId = getYouTubeVideoId(youtubeMatch[1]);
      if (videoId) {
        parts.push(
          <div key={key++} className="my-3">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded shadow-sm"
            />
          </div>
        );
        continue;
      }
    }

    // Check for @[youtube](url) syntax
    const youtubeEmbedMatch = trimmedLine.match(/^@\[youtube\]\(([^)]+)\)$/);
    if (youtubeEmbedMatch) {
      flushParagraph();
      const videoId = getYouTubeVideoId(youtubeEmbedMatch[1]);
      if (videoId) {
        parts.push(
          <div key={key++} className="my-3">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded shadow-sm"
            />
          </div>
        );
        continue;
      }
    }

    // Check for image: ![alt](url)
    const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      parts.push(
        <div key={key++} className="my-3">
          <img
            src={imageMatch[2]}
            alt={imageMatch[1]}
            className="max-w-full h-auto rounded shadow-sm"
            style={{ maxHeight: "200px", objectFit: "contain" }}
          />
        </div>
      );
      continue;
    }

    currentParagraph.push(trimmedLine);
  }

  flushParagraph();

  return <>{parts}</>;
}

/**
 * Handle inline markdown: **bold**, *italic*, [links](url), inline images
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Regex to find inline elements: **bold**, *italic*, [link](url), ![img](url)
  const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[([^\]]+)\]\(([^)]+)\))|(!\[([^\]]*)\]\(([^)]+)\))/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[1]) {
      // Bold: **text**
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // Italic: *text*
      parts.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      // Link: [text](url)
      parts.push(
        <a key={key++} href={match[7]} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">
          {match[6]}
        </a>
      );
    } else if (match[8]) {
      // Inline image: ![alt](url)
      parts.push(
        <img key={key++} src={match[10]} alt={match[9]} className="inline-block max-h-24 rounded" />
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * Split text into pages, breaking at whitespace to avoid cutting words.
 */
function chunkText(text: string, charsPerPage = 1200): string[] {
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining);
      break;
    }
    // Find last space within limit
    let end = charsPerPage;
    while (end > 0 && remaining[end] !== " " && remaining[end] !== "\n") {
      end--;
    }
    if (end === 0) end = charsPerPage; // no space found, hard cut
    pages.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  return pages;
}

/**
 * Format a date as relative time (e.g., "2s ago", "5m ago", "3h ago", "2d ago", "1w ago", "3mo ago", "1y ago")
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

export default function ArticleModalPage() {
  const router = useRouter();
  const slug = String(router.query.slug || "");
  const { user } = useAuth();
  const { isOpen, action, openModal, closeModal } = useAuthModal();
  const utils = trpc.useUtils();
  const supabase = useMemo(() => createClient(), []);

  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Real-time subscription for reactions on this article
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-reactions-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `article_id=eq.${article.id}` },
        () => {
          // Invalidate and refetch article to get updated like count
          utils.articles.getBySlug.invalidate({ slug });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, slug, utils]);

  // Real-time subscription for comments on this article
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-comments-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `article_id=eq.${article.id}` },
        () => {
          // Refetch comments when they change
          utils.comments.getByArticle.invalidate({ articleId: article.id });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, utils]);

  // Real-time subscription for comment reactions (likes, loves, supports on comments)
  useEffect(() => {
    if (!article?.id) return;

    const channel = supabase
      .channel(`realtime-comment-reactions-article-${article.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          // Check if the reaction is on a comment (comment_id is not null)
          const data = payload.new as { comment_id?: number } | null;
          if (data?.comment_id) {
            // Refetch comments to get updated reaction counts
            utils.comments.getByArticle.invalidate({ articleId: article.id });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, article?.id, utils]);

  // Optimistic like state
  const [optimisticLike, setOptimisticLike] = useState<{ liked: boolean; count: number } | null>(null);

  const toggleLikeMutation = trpc.articles.toggleLike.useMutation({
    onSuccess: (data) => {
      // Update with server confirmed liked state, keep the count
      setOptimisticLike((prev) => {
        if (!prev) return prev;
        return {
          liked: data.liked,
          count: prev.count,
        };
      });
    },
    onError: () => {
      // Revert on error
      setOptimisticLike(null);
    },
  });

  const handleLike = () => {
    if (!user) {
      openModal("like articles");
      return;
    }
    if (!article) return;

    // Get current state - use server's userHasLiked if we don't have optimistic state
    const typedArticle = article as ArticleWithCounts;
    const currentLiked = optimisticLike?.liked ?? typedArticle.userHasLiked ?? false;
    const currentCount = optimisticLike?.count ?? typedArticle.likeCount ?? 0;

    // Optimistically update immediately
    setOptimisticLike({
      liked: !currentLiked,
      count: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    });

    toggleLikeMutation.mutate({ articleId: article.id });
  };

  const contentText = useMemo(() => {
    if (!article) return "";
    try {
      if (Array.isArray(article.content)) {
        return article.content
          .map((b: ContentBlock) => (b.type === "paragraph" ? b.content : ""))
          .join("\n\n");
      }
      return String(article.content || "");
    } catch {
      return "";
    }
  }, [article]);

  // Build pages array; page 0 is the cover
  const textPages = useMemo(() => chunkText(contentText, 1200), [contentText]);

  // spread index: 0 = cover + first page, 1 = pages 2-3, etc.
  const [spread, setSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">("forward");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Bookmark state and queries
  const { data: bookmarkData } = trpc.bookmarks.isBookmarked.useQuery(
    { articleId: article?.id ?? 0 },
    { enabled: !!article?.id && !!user }
  );
  const [optimisticBookmarked, setOptimisticBookmarked] = useState<boolean | null>(null);
  const bookmarked = optimisticBookmarked ?? bookmarkData?.bookmarked ?? false;

  const toggleBookmarkMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: (data) => {
      setOptimisticBookmarked(data.bookmarked);
    },
    onError: () => {
      setOptimisticBookmarked(null);
    },
  });

  const handleToggleBookmark = () => {
    if (!user) {
      openModal("bookmark articles");
      return;
    }
    if (!article) return;
    setOptimisticBookmarked(!bookmarked);
    toggleBookmarkMutation.mutate({ articleId: article.id });
  };

  // Fetch comments when panel is open
  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = trpc.comments.getByArticle.useQuery(
    { articleId: article?.id ?? 0, limit: 50 },
    { enabled: !!article?.id && showComments }
  );

  // Create comment mutation
  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      setPostingComment(false);
      refetchComments();
      // Also refetch article to update comment count
      utils.articles.getBySlug.invalidate({ slug });
    },
    onError: () => {
      setPostingComment(false);
    },
  });

  const handlePostComment = () => {
    if (!user) {
      openModal("post comments");
      return;
    }
    if (!article || !commentText.trim()) return;
    
    setPostingComment(true);
    createCommentMutation.mutate({
      articleId: article.id,
      content: commentText.trim(),
    });
  };

  // Comment reaction mutation
  const toggleCommentReactionMutation = trpc.comments.toggleReaction.useMutation({
    onSuccess: () => {
      refetchComments();
    },
    onError: (error) => {
      console.error("Failed to toggle reaction:", error);
    },
  });

  const handleCommentReaction = (commentId: number, type: "like" | "love" | "support") => {
    if (!user) {
      openModal("react to comments");
      return;
    }
    toggleCommentReactionMutation.mutate({ commentId, type });
  };

  // Computed like state - use server's userHasLiked if we don't have optimistic state
  const typedArticleForLike = article as ArticleWithCounts | undefined;
  const isLiked = optimisticLike?.liked ?? typedArticleForLike?.userHasLiked ?? false;
  const likeCount = optimisticLike?.count ?? typedArticleForLike?.likeCount ?? 0;

  // Total spreads (cover counts as left of spread 0)
  const totalSpreads = Math.ceil((textPages.length + 1) / 2);

  // Reset spread when slug changes
  const [prevSlug, setPrevSlug] = useState(slug);
  if (slug !== prevSlug) {
    setPrevSlug(slug);
    setSpread(0);
  }

  const close = () => router.back();

  const next = useCallback(() => {
    if (isFlipping || spread >= totalSpreads - 1) return;
    setFlipDirection("forward");
    setIsFlipping(true);
    setTimeout(() => {
      setSpread((s) => Math.min(s + 1, totalSpreads - 1));
      setTimeout(() => setIsFlipping(false), 400);
    }, 300);
  }, [isFlipping, spread, totalSpreads]);

  const prev = useCallback(() => {
    if (isFlipping || spread === 0) return;
    setFlipDirection("backward");
    setIsFlipping(true);
    setTimeout(() => {
      setSpread((s) => Math.max(s - 1, 0));
      setTimeout(() => setIsFlipping(false), 400);
    }, 300);
  }, [isFlipping, spread]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-white">Article not found</div>
      </div>
    );
  }

  // Determine left and right page content for current spread
  // Spread 0: left = cover, right = textPages[0]
  // Spread n: left = textPages[2n-1], right = textPages[2n]
  const leftPageIdx = spread === 0 ? -1 : spread * 2 - 1;
  const rightPageIdx = spread * 2;

  const leftContent = leftPageIdx < 0 ? null : textPages[leftPageIdx];
  const rightContent = textPages[rightPageIdx] ?? null;

  const typedArticle = article as ArticleWithCounts;
  const genres: GenreType[] = typedArticle.genres ?? (article.genre ? [article.genre] : []);

  return (
    <>
      <AuthModal isOpen={isOpen} onClose={closeModal} action={action} />
      
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={close}
      >
        <div
          className="relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute -top-3 -right-3 z-30 p-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg"
          >
            <X size={20} />
          </button>

          <div className="flex">
          {/* Book container with flip effect */}
          <div className="relative flex rounded-lg shadow-2xl" style={{ perspective: "2000px" }}>
            {/* Left page (static) */}
            <div className="w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px] bg-amber-50 dark:bg-zinc-900 relative rounded-l-lg border-r border-amber-200 dark:border-zinc-700">
              {/* Page edge shadow for realism */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-20" />
              {/* Content container */}
              <div className="absolute inset-0 p-6 lg:p-8 flex flex-col">
              {spread === 0 ? (
                // Cover page
                <div className="flex flex-col flex-1 min-h-0 justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-4 leading-tight">{article.title}</h1>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground italic mb-4">{article.excerpt}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {genres.map((g: GenreType) => (
                        <span
                          key={g.id}
                          className={`px-2 py-0.5 rounded-full text-xs ${getGenreColor(g.slug)}`}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    By {typedArticle.author?.username ?? "Unknown"}
                  </div>
                </div>
              ) : (
                // Text page - scrollable content area
                <div className="book-page-content text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 flex-1 min-h-0 overflow-y-auto pr-2">
                  {leftContent && renderMarkdown(leftContent)}
                </div>
              )}
              <div className="shrink-0 pt-2 text-center text-xs text-muted-foreground border-t border-amber-200/50 dark:border-zinc-700/50 mt-auto">
                {spread === 0 ? "" : leftPageIdx + 1}
              </div>
              </div>
            </div>

            {/* Right page (static) */}
            <div className="w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px] bg-amber-50 dark:bg-zinc-900 relative rounded-r-lg">
              {/* Left edge shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-20" />
              {/* Content container */}
              <div className="absolute inset-0 p-6 lg:p-8 flex flex-col">
              {rightContent ? (
                <div className="book-page-content text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 flex-1 min-h-0 overflow-y-auto pl-2">
                  {renderMarkdown(rightContent)}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground text-sm">
                  End of article
                </div>
              )}
              <div className="shrink-0 pt-2 text-center text-xs text-muted-foreground border-t border-amber-200/50 dark:border-zinc-700/50 mt-auto">
                {rightContent ? rightPageIdx + 1 : ""}
              </div>
              </div>
            </div>

            {/* Flipping page overlay - forward flip (right to left) */}
            {isFlipping && flipDirection === "forward" && (
              <div 
                className="absolute right-0 top-0 w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-full"
                style={{ 
                  perspective: "2000px",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="absolute inset-0 bg-amber-50 dark:bg-zinc-900 rounded-r-lg shadow-2xl"
                  style={{
                    transformOrigin: "left center",
                    animation: "flipForward 0.7s ease-in-out forwards",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-transparent opacity-0" 
                    style={{ animation: "shadowFadeIn 0.35s ease-in-out forwards" }} 
                  />
                </div>
              </div>
            )}

            {/* Flipping page overlay - backward flip (left to right) */}
            {isFlipping && flipDirection === "backward" && (
              <div 
                className="absolute left-0 top-0 w-[320px] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[520px] h-full"
                style={{ 
                  perspective: "2000px",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="absolute inset-0 bg-amber-50 dark:bg-zinc-900 rounded-l-lg shadow-2xl"
                  style={{
                    transformOrigin: "right center",
                    animation: "flipBackward 0.7s ease-in-out forwards",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent opacity-0"
                    style={{ animation: "shadowFadeIn 0.35s ease-in-out forwards" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Social icons + Comments panel on right side */}
          <div className="ml-4 flex flex-col h-[480px] sm:h-[540px] md:h-[620px] lg:h-[700px] xl:h-[750px]">
            {/* Icons - always visible, transition from vertical to horizontal */}
            <div className={`flex gap-3 transition-all duration-300 ease-in-out ${
              showComments ? "flex-row mb-3 shrink-0" : "flex-col justify-center h-full"
            }`}>
              <button
                onClick={handleLike}
                className={`relative p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${isLiked ? "text-red-500" : ""}`}
              >
                <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {likeCount}
                </span>
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className={`relative p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${showComments ? "text-blue-500" : ""}`}
              >
                <MessageCircle size={22} fill={showComments ? "currentColor" : "none"} />
                <span className="absolute -top-1 -right-1 z-10 bg-blue-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {typedArticle.commentCount ?? 0}
                </span>
              </button>
              <button
                onClick={handleToggleBookmark}
                className={`p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200 ${bookmarked ? "text-yellow-500" : ""}`}
              >
                <Bookmark size={22} fill={bookmarked ? "currentColor" : "none"} />
              </button>
              <button
                className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow hover:scale-110 transition-all duration-200"
              >
                <Share2 size={22} />
              </button>
            </div>

            {/* Comments section - slides in from right */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex-1 ${
              showComments ? "w-[280px] sm:w-[320px] opacity-100" : "w-0 opacity-0"
            }`}>
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 h-full flex flex-col">
                <h3 className="text-sm font-semibold mb-3 shrink-0">Comments ({typedArticle.commentCount ?? 0})</h3>
                <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                  {commentsLoading ? (
                    <div className="text-xs text-muted-foreground">Loading comments...</div>
                  ) : commentsData?.items && commentsData.items.length > 0 ? (
                    commentsData.items.map((comment: CommentType) => (
                      <div key={comment.id} className="bg-zinc-100 dark:bg-zinc-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-xs font-medium">
                            {comment.user?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-xs font-medium">{comment.user?.username || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "like")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userLiked 
                                ? "text-blue-500" 
                                : "text-zinc-500 hover:text-blue-500"
                            }`}
                          >
                            <ThumbsUp size={14} className={comment.userLiked ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.likeCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "love")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userLoved 
                                ? "text-red-500" 
                                : "text-zinc-500 hover:text-red-500"
                            }`}
                          >
                            <Heart size={14} className={comment.userLoved ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.loveCount || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentReaction(comment.id, "support")}
                            className={`flex items-center gap-1 transition-colors ${
                              comment.userSupported 
                                ? "text-green-500" 
                                : "text-zinc-500 hover:text-green-500"
                            }`}
                          >
                            <HandHeart size={14} className={comment.userSupported ? "fill-current" : ""} />
                            <span className="text-[10px]">{comment.supportCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No comments yet. Be the first to comment!</div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (user && commentText.trim() && !postingComment) {
                          handlePostComment();
                        }
                      }
                    }}
                    placeholder={user ? "Write a comment..." : "Sign in to comment"}
                    disabled={!user}
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
                  />
                  <button 
                    onClick={handlePostComment}
                    disabled={!user || !commentText.trim() || postingComment}
                    className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {postingComment ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={prev}
            disabled={spread === 0}
            className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm text-white">
            {spread + 1} / {totalSpreads}
          </span>
          <button
            onClick={next}
            disabled={spread >= totalSpreads - 1}
            className="p-3 rounded-full bg-white dark:bg-zinc-800 shadow disabled:opacity-40"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        </div>
      </div>
    </>
  );
}
