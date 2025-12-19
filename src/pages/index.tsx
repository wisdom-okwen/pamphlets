import { trpc } from "@/lib/trpc";
import Image from "next/image";
import Link from "next/link";
import { NextSeo, ArticleJsonLd } from "next-seo";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { Bookmark, MessageCircle, Share2, Eye, Heart, Search, X, Copy, Check } from "lucide-react";
import { getGenreColor } from "@/models/genreColors";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal, useAuthModal } from "@/components/AuthModal";
import { useState, useMemo, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/clients/browser";

interface ArticleWithCounts {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  viewCount: number;
  genre?: { id: number; name: string; slug: string } | null;
  genres?: { id: number; name: string; slug: string }[];
  userHasLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: Date | null;
}

export default function Home() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { isOpen, action, openModal, closeModal } = useAuthModal();
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils();
  const supabase = useMemo(() => createClient(), []);
  
  const { data, isLoading, error } = trpc.articles.getAll.useQuery({
    limit: 20,
  });

  // Fetch user's bookmarked article IDs
  const { data: bookmarkedIds, refetch: refetchBookmarks } = trpc.bookmarks.getMyBookmarkedIds.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Track optimistic like states locally
  const [optimisticLikes, setOptimisticLikes] = useState<Record<number, { liked: boolean; count: number } | undefined>>({});

  // Real-time subscription for reactions (likes)
  useEffect(() => {
    const channel = supabase
      .channel("realtime-reactions-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => {
          // Invalidate and refetch articles to get updated like counts
          utils.articles.getAll.invalidate();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, utils]);

  // Real-time subscription for bookmarks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-bookmarks-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${user.id}` },
        () => {
          refetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, user, refetchBookmarks]);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    const articles = data?.items || [];
    if (!searchQuery.trim()) return articles;
    
    const query = searchQuery.toLowerCase().trim();
    
    return articles.filter((article) => {
      // Search by title (highest priority)
      if (article.title.toLowerCase().includes(query)) return true;
      
      // Search by tags/genres
      const genres = article.genres || (article.genre ? [article.genre] : []);
      if (genres.some((g: { name: string }) => g.name.toLowerCase().includes(query))) return true;
      
      // Search by excerpt/content
      if (article.excerpt?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [data?.items, searchQuery]);

  const toggleLikeMutation = trpc.articles.toggleLike.useMutation({
    onSuccess: (data, { articleId }) => {
      // Update with server confirmed state - keep the optimistic count direction
      setOptimisticLikes((prev) => {
        const current = prev[articleId];
        if (!current) return prev;
        return {
          ...prev,
          [articleId]: {
            liked: data.liked,
            count: current.count, // Keep the optimistic count
          },
        };
      });
    },
    onError: (err, { articleId }) => {
      // Revert on error - clear optimistic state
      setOptimisticLikes((prev) => {
        const copy = { ...prev };
        delete copy[articleId];
        return copy;
      });
    },
  });

  // Bookmark state and mutation
  const [optimisticBookmarks, setOptimisticBookmarks] = useState<Record<number, boolean>>({});
  
  const toggleBookmarkMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: (data, { articleId }) => {
      setOptimisticBookmarks((prev) => ({
        ...prev,
        [articleId]: data.bookmarked,
      }));
    },
    onError: (err, { articleId }) => {
      // Revert on error
      setOptimisticBookmarks((prev) => {
        const copy = { ...prev };
        delete copy[articleId];
        return copy;
      });
    },
  });

  const handleLike = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openModal("like pamphlets");
      return;
    }
    
    const currentData = data?.items.find((a) => a.id === articleId) as ArticleWithCounts | undefined;
    const currentOptimistic = optimisticLikes[articleId];
    const currentLiked = currentOptimistic?.liked ?? currentData?.userHasLiked ?? false;
    const currentCount = currentOptimistic?.count ?? currentData?.likeCount ?? 0;

    setOptimisticLikes((prev) => ({
      ...prev,
      [articleId]: {
        liked: !currentLiked,
        count: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
      },
    }));

    toggleLikeMutation.mutate({ articleId });
  };

  const handleBookmark = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openModal("bookmark pamphlets");
      return;
    }
    // Optimistic update - check both optimistic state and fetched bookmarked IDs
    const currentBookmarked = optimisticBookmarks[articleId] ?? bookmarkedIds?.includes(articleId) ?? false;
    setOptimisticBookmarks((prev) => ({
      ...prev,
      [articleId]: !currentBookmarked,
    }));
    toggleBookmarkMutation.mutate({ articleId });
  };

  const handleComment = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openModal("view and add comments");
      return;
    }
  };

  const [shareMenuOpen, setShareMenuOpen] = useState<number | null>(null);
  const [copiedArticleId, setCopiedArticleId] = useState<number | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShareClick = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setShareMenuOpen(shareMenuOpen === articleId ? null : articleId);
  };

  const handleCopyLink = async (e: React.MouseEvent, article: { id: number; slug: string }) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/articles/${article.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedArticleId(article.id);
    setTimeout(() => setCopiedArticleId(null), 2000);
    setShareMenuOpen(null);
  };

  const handleNativeShare = async (e: React.MouseEvent, article: { title: string; slug: string }) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/articles/${article.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: url,
        });
      } catch {
        // User cancelled or error
      }
    }
    setShareMenuOpen(null);
  };

  if (isLoading) {
    return (
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-3 p-3 border rounded-lg animate-pulse">
              <div className="w-full sm:w-28 h-40 sm:h-20 bg-zinc-200 dark:bg-zinc-800 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <p className="text-red-500">{t("errors.somethingWentWrong")}</p>
      </main>
    );
  }

  const articles = data?.items || [];

  return (
    <>
      <NextSeo
        title={t("nav.home")}
        description={t("common.tagline")}
        openGraph={{
          url: "https://pamflets.vercel.app",
          type: "website",
          title: "Pamphlets - Read & Share Personal Writings",
          description:
            "Read and share personal writings, free writeups, and thoughts on anything.",
          images: [
            {
              url: "https://pamflets.vercel.app/pamphlets.png",
              width: 1200,
              height: 630,
              alt: "Pamphlets",
            },
          ],
        }}
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Pamphlets - Personal Writings Collection",
          description: "A collection of personal writings, free writeups, and thoughts from our community",
          url: "https://pamflets.vercel.app",
          mainEntity: {
            "@type": "WebSite",
            name: "Pamphlets",
            url: "https://pamflets.vercel.app",
            description:
              "A platform for reading and posting personal writeups, free writings, and thoughts on anything.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://pamflets.vercel.app?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          itemListElement: articles.slice(0, 10).map((article, index) => ({
            "@type": "Article",
            position: index + 1,
            headline: article.title,
            description: article.excerpt,
            image: article.coverImageUrl,
            url: `https://pamflets.vercel.app/articles/${article.slug}`,
          })),
        })}
      </script>
      <AuthModal isOpen={isOpen} onClose={closeModal} action={action} />
      
      <div className="sticky top-0 lg:top-[60px] z-40 bg-background/95 backdrop-blur-sm px-3 sm:px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto py-2.5 sm:py-4">
          <div className="relative mb-1 sm:mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
            <input
              type="text"
              placeholder={t("home.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 sm:py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 touch-manipulation"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.resultsFor", { count: filteredArticles.length, query: searchQuery })}
            </p>
          )}
        </div>
      </div>

      <main className="px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base">
              {searchQuery ? t("home.noMatchingPamphlets") : t("home.noPamphlets")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group block border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-md hover:shadow-xl hover:-translate-y-1 transform transition-all duration-200 relative"
              >
                {/* Publish date - top right corner */}
                {article.publishedAt && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-black/60 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md backdrop-blur-sm">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {/* Mobile: Stack vertically, Desktop: Horizontal */}
                <div className="flex flex-col sm:flex-row">
                  {/* Cover image */}
                  <div className="w-full sm:w-36 md:w-44 h-36 sm:h-36 shrink-0 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt={article.title}
                        width={160}
                        height={192}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-2.5 sm:p-4 flex flex-col justify-between min-w-0">
                    {/* Top: Title & excerpt */}
                    <div>
                      <h2 className="font-semibold line-clamp-2 text-sm sm:text-base leading-tight text-zinc-900 dark:text-zinc-100">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1 sm:mt-1.5">
                          {article.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Genre tag & actions */}
                    <div className="flex items-center justify-between mt-2 sm:mt-3 gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                          {(article.genres && article.genres.length > 0 ? article.genres : (article.genre ? [article.genre] : [])).map((g: { id: number; name: string; slug: string }) => (
                            <span key={g.id} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap shrink-0 ${getGenreColor(g.slug)}`}>
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: Views, Likes & action buttons */}
                      <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
                        <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 px-1">
                          <Eye size={11} className="sm:w-3 sm:h-3" />
                          <span>{article.viewCount}</span>
                        </div>
                        <button
                          onClick={(e) => handleLike(e, article.id)}
                          className={`relative p-1.5 sm:p-2 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 touch-manipulation ${
                            (optimisticLikes[article.id]?.liked ?? (article as ArticleWithCounts).userHasLiked) ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"
                          }`}
                          title={t("article.like")}
                        >
                          <Heart 
                            size={14} 
                            className={`sm:w-4 sm:h-4 ${(optimisticLikes[article.id]?.liked ?? (article as ArticleWithCounts).userHasLiked) ? "text-red-500" : "text-zinc-500 dark:text-zinc-400 hover:text-red-500"}`}
                            fill={(optimisticLikes[article.id]?.liked ?? (article as ArticleWithCounts).userHasLiked) ? "currentColor" : "none"}
                          />
                          <span className="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[9px] sm:text-[10px] font-medium min-w-[14px] sm:min-w-4 h-[14px] sm:h-4 rounded-full flex items-center justify-center px-0.5">
                            {optimisticLikes[article.id]?.count ?? (article as ArticleWithCounts).likeCount ?? 0}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleBookmark(e, article.id)}
                          className={`p-1.5 sm:p-2 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 touch-manipulation ${
                            (optimisticBookmarks[article.id] ?? bookmarkedIds?.includes(article.id)) ? "text-yellow-500" : "text-zinc-500 dark:text-zinc-400"
                          }`}
                          title={t("article.bookmark")}
                        >
                          <Bookmark 
                            size={14} 
                            className={`sm:w-4 sm:h-4 ${(optimisticBookmarks[article.id] ?? bookmarkedIds?.includes(article.id)) ? "text-yellow-500" : "text-zinc-500 dark:text-zinc-400 hover:text-yellow-500"}`}
                            fill={(optimisticBookmarks[article.id] ?? bookmarkedIds?.includes(article.id)) ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={(e) => handleComment(e, article.id)}
                          className="relative p-1.5 sm:p-2 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 touch-manipulation text-zinc-500 dark:text-zinc-400"
                          title={t("article.comments")}
                        >
                          <MessageCircle size={14} className="sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400 hover:text-blue-500" />
                          <span className="absolute -top-1 -right-1 z-10 bg-blue-500 text-white text-[9px] sm:text-[10px] font-medium min-w-[14px] sm:min-w-4 h-[14px] sm:h-4 rounded-full flex items-center justify-center px-0.5">
                            {(article as ArticleWithCounts).commentCount ?? 0}
                          </span>
                        </button>
                        <div className="relative" ref={shareMenuOpen === article.id ? shareMenuRef : null}>
                          <button
                            onClick={(e) => handleShareClick(e, article.id)}
                            className={`p-1.5 sm:p-2 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm bg-white dark:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-transform duration-150 touch-manipulation ${
                              copiedArticleId === article.id ? "text-green-500" : "text-zinc-500 dark:text-zinc-400"
                            }`}
                            title={t("article.share")}
                          >
                            {copiedArticleId === article.id ? (
                              <Check size={14} className="sm:w-4 sm:h-4 text-green-500" />
                            ) : (
                              <Share2 size={14} className="sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400 hover:text-green-500" />
                            )}
                          </button>
                          {shareMenuOpen === article.id && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[140px] sm:min-w-[160px] z-50">
                              <button
                                onClick={(e) => handleCopyLink(e, { id: article.id, slug: article.slug })}
                                className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors touch-manipulation"
                              >
                                <Copy size={12} className="sm:w-3.5 sm:h-3.5" />
                                {t("article.copyLink")}
                              </button>
                              {typeof navigator !== "undefined" && "share" in navigator && (
                                <button
                                  onClick={(e) => handleNativeShare(e, { title: article.title, slug: article.slug })}
                                  className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors touch-manipulation"
                                >
                                  <Share2 size={12} className="sm:w-3.5 sm:h-3.5" />
                                  {t("article.share")}...
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
