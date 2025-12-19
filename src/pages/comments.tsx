import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { MessageCircle, Eye, Trash2 } from "lucide-react";
import { withAuth } from "@/components/auth/withAuth";
import { NextSeo } from "next-seo";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/clients/browser";

function CommentsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const supabase = useMemo(() => createClient(), []);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const { data, isLoading, error } = trpc.comments.getMyComments.useQuery({
    limit: 50,
  });

  // Real-time subscription for user's comments
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-my-comments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `user_id=eq.${user.id}` },
        () => {
          utils.comments.getMyComments.invalidate();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, user, utils]);

  const deleteCommentMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.getMyComments.invalidate();
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  const handleDeleteComment = (e: React.MouseEvent, commentId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this comment?")) {
      setDeletingId(commentId);
      deleteCommentMutation.mutate({ id: commentId });
    }
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
        <p className="text-destructive">Failed to load comments</p>
      </div>
    );
  }

  const comments = data?.items || [];

  // Group comments by article
  const commentsByArticle = comments.reduce((acc, comment) => {
    if (!comment.article) return acc;
    const articleId = comment.article.id;
    if (!acc[articleId]) {
      acc[articleId] = {
        article: comment.article,
        comments: [],
      };
    }
    acc[articleId].comments.push(comment);
    return acc;
  }, {} as Record<number, { article: typeof comments[0]["article"]; comments: typeof comments }>);

  const articleGroups = Object.values(commentsByArticle);

  return (
    <>
      <NextSeo
        title="My Comments"
        description="Your comments on pamphlets"
        noindex
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <MessageCircle className="size-8 text-blue-500" />
          <h1 className="text-3xl font-bold">My Comments</h1>
        </div>

        {articleGroups.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl">
            <MessageCircle className="size-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No comments yet</h2>
            <p className="text-muted-foreground mb-6">
              Join the conversation by commenting on pamphlets you read.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Pamphlets
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articleGroups.map(({ article, comments: articleComments }) => {
              if (!article) return null;

              return (
                <div
                  key={article.id}
                  className="bg-card rounded-xl border overflow-hidden"
                >
                  {/* Article Header */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 border-b">
                    {article.coverImageUrl && (
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {article.title}
                      </h3>
                      {article.author && (
                        <p className="text-sm text-muted-foreground">
                          by {article.author.username}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/articles/${article.slug}#comments`}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        title="View all comments on this pamphlet"
                      >
                        <MessageCircle size={16} />
                        <span className="hidden sm:inline">View Comments</span>
                      </Link>
                      <Link
                        href={`/articles/${article.slug}`}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                        title="View pamphlet"
                      >
                        <Eye size={16} />
                        <span className="hidden sm:inline">View Pamphlet</span>
                      </Link>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="divide-y">
                    {articleComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                <span className="ml-2">(edited)</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteComment(e, comment.id)}
                            disabled={deletingId === comment.id}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete comment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {comments.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {comments.length} comment{comments.length === 1 ? "" : "s"} on {articleGroups.length} pamphlet{articleGroups.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </>
  );
}

export default withAuth(CommentsPage);
