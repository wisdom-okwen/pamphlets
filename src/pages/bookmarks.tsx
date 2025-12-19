import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Bookmark, Eye, Trash2 } from "lucide-react";
import { getGenreColor } from "@/models/genreColors";
import { withAuth } from "@/components/auth/withAuth";
import { NextSeo } from "next-seo";
import { formatDistanceToNow } from "date-fns";

function BookmarksPage() {
  const utils = trpc.useUtils();
  
  const { data, isLoading, error } = trpc.bookmarks.getMyBookmarks.useQuery({
    limit: 50,
  });

  const removeBookmarkMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: () => {
      utils.bookmarks.getMyBookmarks.invalidate();
    },
  });

  const handleRemoveBookmark = (e: React.MouseEvent, articleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeBookmarkMutation.mutate({ articleId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load bookmarks</p>
      </div>
    );
  }

  const bookmarks = data?.items || [];

  return (
    <>
      <NextSeo
        title="My Bookmarks"
        description="Your saved pamphlets"
        noindex
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="size-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl">
            <Bookmark className="size-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
            <p className="text-muted-foreground mb-6">
              Save pamphlets you want to read later by clicking the bookmark icon.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Pamphlets
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => {
              const article = bookmark.article;
              if (!article) return null;

              const genre = article.genre;

              return (
                <Link
                  key={bookmark.id}
                  href={`/articles/${article.slug}`}
                  className="group flex gap-4 p-4 bg-card hover:bg-muted/50 rounded-xl border transition-all duration-200 hover:shadow-md"
                >
                  {/* Cover Image */}
                  {article.coverImageUrl && (
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={article.coverImageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Genre */}
                        {genre && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: getGenreColor(genre.name) + "20",
                                color: getGenreColor(genre.name),
                              }}
                            >
                              {genre.name}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                          {article.title}
                        </h3>

                        {/* Excerpt */}
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {article.excerpt}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {article.author && (
                            <span>by {article.author.username}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {article.viewCount || 0}
                          </span>
                          <span>
                            Saved {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemoveBookmark(e, article.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Remove bookmark"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default withAuth(BookmarksPage);
