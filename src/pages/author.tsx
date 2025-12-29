import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { NextSeo } from "next-seo";
import { trpc } from "@/lib/trpc";
import { withAuth } from "@/components/auth/withAuth";
import { createClient } from "@/utils/supabase/clients/browser";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { getGenreColor } from "@/models/genreColors";
import {
  FileText,
  PlusSquare,
  Search,
  Eye,
  Heart,
  MessageCircle,
  BarChart3,
  Archive,
  FileEdit,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AuthorArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  genres: { id: number; name: string; slug: string }[];
}

function AuthorDashboard() {
  const router = useRouter();
  const { user, role } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [viewStatus, setViewStatus] = useState<"all" | "published" | "draft" | "archived">("all");

  // Fetch author's articles
  const {
    data: articlesData,
    isLoading,
    refetch,
  } = trpc.articles.getMyArticles.useQuery(
    { limit: 100, status: viewStatus },
    { enabled: !!user }
  );

  const [articlesList, setArticlesList] = useState<AuthorArticle[]>([]);

  const trpcCtx = trpc.useContext();

  // Mutations for article management
  const updateArticle = trpc.articles.update.useMutation({
    onMutate: async ({ id, status }) => {
      setArticlesList((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status || a.status } : a))
      );
    },
    onSuccess() {
      trpcCtx.articles.getMyArticles.invalidate();
    },
    onError: (err) => {
      trpcCtx.articles.getMyArticles.invalidate();
      alert("Failed to update pamphlet: " + err.message);
    },
  });

  const deleteArticle = trpc.articles.delete.useMutation({
    onMutate: async ({ id }) => {
      setArticlesList((prev) => prev.filter((a) => a.id !== id));
    },
    onSuccess() {
      trpcCtx.articles.getMyArticles.invalidate();
    },
    onError: (err) => {
      trpcCtx.articles.getMyArticles.invalidate();
      alert("Failed to delete pamphlet: " + err.message);
    },
  });

  // Redirect if not an author or admin
  useEffect(() => {
    if (user && role && role !== "author" && role !== "admin") {
      router.replace("/");
    }
  }, [user, role, router]);

  useEffect(() => {
    if (articlesData?.items) {
      setArticlesList(articlesData.items as AuthorArticle[]);
    }
  }, [articlesData]);

  // Real-time subscription for article updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`author-articles-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "articles",
          filter: `author_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<AuthorArticle>) => {
          const e = payload.eventType;
          if (e === "INSERT" && payload.new) {
            refetch();
          } else if (e === "UPDATE" && payload.new) {
            refetch();
          } else if (e === "DELETE" && payload.old) {
            setArticlesList((prev) =>
              prev.filter((a) => a.id !== (payload.old as AuthorArticle).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, refetch]);

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Delete this pamphlet? This action cannot be undone.")) return;
    deleteArticle.mutate({ id });
  };

  const handleArchive = (id: number) => {
    updateArticle.mutate({ id, status: "archived" });
  };

  const handleUnarchive = (id: number) => {
    updateArticle.mutate({ id, status: "published" });
  };

  const handlePublish = (id: number) => {
    updateArticle.mutate({ id, status: "published" });
  };

  // Filter articles by search query
  const filteredArticles = articlesList.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (a.title || "").toLowerCase().includes(q) ||
      (a.slug || "").toLowerCase().includes(q) ||
      (a.excerpt || "").toLowerCase().includes(q)
    );
  });

  const stats = articlesData?.stats;

  return (
    <>
      <NextSeo title="Author Dashboard" description="Manage your publications" />

      <main className="min-h-screen bg-background px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Author Dashboard</h1>
          <p className="text-muted-foreground">Manage your publications and view statistics</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText size={14} />
              <span className="text-xs">Total</span>
            </div>
            <div className="text-lg font-semibold">{stats?.totalArticles ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 size={14} />
              <span className="text-xs">Published</span>
            </div>
            <div className="text-lg font-semibold text-green-600">{stats?.publishedCount ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileEdit size={14} />
              <span className="text-xs">Drafts</span>
            </div>
            <div className="text-lg font-semibold text-amber-600">{stats?.draftCount ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Archive size={14} />
              <span className="text-xs">Archived</span>
            </div>
            <div className="text-lg font-semibold text-zinc-500">{stats?.archivedCount ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye size={14} />
              <span className="text-xs">Views</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">{stats?.totalViews ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart size={14} />
              <span className="text-xs">Likes</span>
            </div>
            <div className="text-lg font-semibold text-red-500">{stats?.totalLikes ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border shadow-sm bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageCircle size={14} />
              <span className="text-xs">Comments</span>
            </div>
            <div className="text-lg font-semibold text-purple-600">{stats?.totalComments ?? 0}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <PlusSquare size={18} />
            Create New Pamphlet
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your pamphlets..."
                className="pl-10 w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-muted/20 rounded-lg p-1 mb-4 w-fit">
          <button
            onClick={() => setViewStatus("all")}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
              viewStatus === "all"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewStatus("published")}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
              viewStatus === "published"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setViewStatus("draft")}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
              viewStatus === "draft"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setViewStatus("archived")}
            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
              viewStatus === "archived"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            Archived
          </button>
        </div>

        {/* Articles List */}
        <section>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-3">Loading your pamphlets...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/5">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">No pamphlets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {query
                  ? "Try adjusting your search query"
                  : viewStatus !== "all"
                  ? `You don't have any ${viewStatus} pamphlets yet`
                  : "Start by creating your first pamphlet"}
              </p>
              {!query && viewStatus === "all" && (
                <Link
                  href="/admin/articles/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <PlusSquare size={16} />
                  Create Your First Pamphlet
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-lg px-4 py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200 bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium line-clamp-1">{article.title}</h3>
                      {article.status === "draft" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Draft
                        </span>
                      )}
                      {article.status === "archived" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Archived
                        </span>
                      )}
                      {article.status === "published" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Published
                        </span>
                      )}
                    </div>

                    {/* Genres */}
                    {article.genres && article.genres.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 overflow-x-auto scrollbar-hide">
                        {article.genres.map((g) => (
                          <span
                            key={g.id}
                            className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${getGenreColor(
                              g.slug
                            )}`}
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {article.viewCount} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={12} />
                        {article.likeCount} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        {article.commentCount} comments
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {article.status === "published" && (
                      <Link
                        href={`/articles/${article.slug}`}
                        className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-muted/5 text-primary hover:shadow-md transition-all"
                      >
                        View
                      </Link>
                    )}
                    <Link
                      href={`/admin/articles/${article.slug}/edit`}
                      className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-muted/5 hover:shadow-md transition-all"
                    >
                      Edit
                    </Link>
                    {article.status === "draft" && (
                      <button
                        onClick={() => handlePublish(article.id)}
                        className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-green-50 text-green-700 hover:shadow-md transition-all dark:bg-green-900/20 dark:text-green-400"
                        title="Publish pamphlet"
                      >
                        Publish
                      </button>
                    )}
                    {article.status === "archived" ? (
                      <button
                        onClick={() => handleUnarchive(article.id)}
                        className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-green-50 text-green-700 hover:shadow-md transition-all dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1"
                        title="Restore pamphlet"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(article.id)}
                        className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-amber-50 text-amber-700 hover:shadow-md transition-all dark:bg-amber-900/20 dark:text-amber-400 flex items-center gap-1"
                        title="Archive pamphlet"
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="text-sm px-3 py-1.5 rounded-md border shadow-sm bg-red-50 text-red-600 hover:shadow-md transition-all dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1"
                      title="Delete pamphlet"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default withAuth(AuthorDashboard);
