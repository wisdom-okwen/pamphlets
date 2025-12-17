import { trpc } from "@/lib/trpc";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { getGenreColor } from "@/models/genreColors";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal, useAuthModal } from "@/components/AuthModal";

export default function Home() {
  const { user } = useAuth();
  const { isOpen, action, openModal, closeModal } = useAuthModal();
  
  const { data, isLoading, error } = trpc.articles.getAll.useQuery({
    limit: 20,
  });

  const handleFavorite = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openModal("add to favorites");
      return;
    }
    // TODO: Add favorite logic
    console.log("Favorite article:", articleId);
  };

  const handleComment = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openModal("view and add comments");
      return;
    }
    // TODO: Navigate to comments or open comment modal
    console.log("Comment on article:", articleId);
  };

  const handleShare = async (e: React.MouseEvent, article: { title: string; slug: string }) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/articles/${article.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    }
  };

  if (isLoading) {
    return (
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-3 p-3 border rounded-lg animate-pulse">
              <div className="w-full sm:w-28 h-40 sm:h-20 bg-zinc-200 dark:bg-zinc-800 rounded-md flex-shrink-0" />
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
        <p className="text-red-500">Failed to load articles</p>
      </main>
    );
  }

  const articles = data?.items || [];

  return (
    <>
      <AuthModal isOpen={isOpen} onClose={closeModal} action={action} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="block border rounded-lg overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                {/* Mobile: Stack vertically, Desktop: Horizontal */}
                <div className="flex flex-col sm:flex-row">
                  {/* Cover image */}
                  <div className="w-full sm:w-36 md:w-44 h-48 sm:h-36 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt={article.title}
                        width={160}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                    {/* Top: Title & excerpt */}
                    <div>
                      <h2 className="font-semibold line-clamp-2 text-base leading-tight">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mt-1.5">
                          {article.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Genre tag & actions */}
                    <div className="flex items-center justify-between mt-3 gap-2">
                      {/* Left: Genre tag */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {article.genre && (
                          <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${getGenreColor(article.genre.slug)}`}>
                            {article.genre.name}
                          </span>
                        )}
                      </div>

                      {/* Right: Views & action buttons */}
                      <div className="flex items-center gap-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                          <Eye size={12} />
                          <span>{article.viewCount}</span>
                        </div>
                        <button
                          onClick={(e) => handleFavorite(e, article.id)}
                          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Add to favorites"
                        >
                          <Heart size={16} className="text-muted-foreground hover:text-red-500" />
                        </button>
                        <button
                          onClick={(e) => handleComment(e, article.id)}
                          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Comments"
                        >
                          <MessageCircle size={16} className="text-muted-foreground hover:text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => handleShare(e, { title: article.title, slug: article.slug })}
                          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Share"
                        >
                          <Share2 size={16} className="text-muted-foreground hover:text-green-500" />
                        </button>
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
