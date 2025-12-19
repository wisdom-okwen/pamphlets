import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { articles, reactions, comments, bookmarks, users } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export const chatbotRouter = createTRPCRouter({
    getUserContext: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.subject!.id;

        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });

        const userReactions = await ctx.db.query.reactions.findMany({
            where: eq(reactions.userId, userId),
            with: {
                article: {
                    columns: {
                        id: true,
                        title: true,
                        slug: true,
                        publishedAt: true,
                    },
                },
            },
        });

        const userBookmarks = await ctx.db.query.bookmarks.findMany({
            where: eq(bookmarks.userId, userId),
            with: {
                article: {
                    columns: {
                        id: true,
                        title: true,
                        slug: true,
                        publishedAt: true,
                    },
                },
            },
        });

        const userComments = await ctx.db.query.comments.findMany({
            where: eq(comments.userId, userId),
            with: {
                article: {
                    columns: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
                reactions: true,
            },
            orderBy: [desc(comments.createdAt)],
        });

        const commentsWithReactions = userComments.map(comment => {
            const likeCount = comment.reactions.filter(r => r.type === 'like').length;
            const loveCount = comment.reactions.filter(r => r.type === 'love').length;
            const supportCount = comment.reactions.filter(r => r.type === 'support').length;

            return {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                article: comment.article,
                reactionCount: likeCount + loveCount + supportCount,
                reactions: {
                    likes: likeCount,
                    loves: loveCount,
                    supports: supportCount,
                },
            };
        });

        return {
            user: {
                id: user!.id,
                username: user!.username,
                role: user!.role,
                joinedAt: user!.createdAt,
            },
            interactions: {
                likedArticles: userReactions
                    .filter(r => r.type === 'like' && r.article)
                    .map(r => r.article!),
                bookmarkedArticles: userBookmarks.map(b => b.article),
                comments: commentsWithReactions,
            },
        };
    }),

    getArticleStats: protectedProcedure.query(async ({ ctx }) => {
        const mostRecent = await ctx.db.query.articles.findFirst({
            where: eq(articles.status, "published"),
            orderBy: [desc(articles.publishedAt)],
            columns: {
                id: true,
                title: true,
                slug: true,
                publishedAt: true,
                excerpt: true,
            },
            with: {
                author: {
                    columns: {
                        username: true,
                    },
                },
            },
        });

        const totalCount = await ctx.db.$count(articles, eq(articles.status, "published"));

        const mostLiked = await ctx.db
            .select({
                id: articles.id,
                title: articles.title,
                slug: articles.slug,
                publishedAt: articles.publishedAt,
                excerpt: articles.excerpt,
                likeCount: sql<number>`count(${reactions.id})`,
            })
            .from(articles)
            .leftJoin(reactions, and(
                eq(reactions.articleId, articles.id),
                eq(reactions.type, 'like')
            ))
            .where(eq(articles.status, "published"))
            .groupBy(articles.id)
            .orderBy(desc(sql`count(${reactions.id})`))
            .limit(1);

        // Most bookmarked article
        const mostBookmarked = await ctx.db
            .select({
                id: articles.id,
                title: articles.title,
                slug: articles.slug,
                publishedAt: articles.publishedAt,
                excerpt: articles.excerpt,
                bookmarkCount: sql<number>`count(${bookmarks.id})`,
            })
            .from(articles)
            .leftJoin(bookmarks, eq(bookmarks.articleId, articles.id))
            .where(eq(articles.status, "published"))
            .groupBy(articles.id)
            .orderBy(desc(sql`count(${bookmarks.id})`))
            .limit(1);

        // Article summaries (basic info for all published articles)
        const articleSummaries = await ctx.db.query.articles.findMany({
            where: eq(articles.status, "published"),
            columns: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                publishedAt: true,
                viewCount: true,
            },
            with: {
                author: {
                    columns: {
                        username: true,
                    },
                },
                reactions: {
                    columns: {
                        type: true,
                    },
                },
                comments: {
                    columns: {
                        id: true,
                    },
                },
            },
            orderBy: [desc(articles.publishedAt)],
            limit: 50, // Limit to recent articles for summary
        });

        const summaries = articleSummaries.map(article => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            publishedAt: article.publishedAt,
            author: article.author?.username,
            viewCount: article.viewCount,
            likeCount: article.reactions.filter(r => r.type === 'like').length,
            commentCount: article.comments.length,
        }));

        return {
            mostRecent: mostRecent ? {
                ...mostRecent,
                author: mostRecent.author?.username,
            } : null,
            totalCount,
            mostLiked: mostLiked[0] || null,
            mostBookmarked: mostBookmarked[0] || null,
            articleSummaries: summaries,
        };
    }),

    // Search articles by natural language query (for chatbot)
    searchArticles: protectedProcedure
        .input(z.object({
            query: z.string().min(1),
            limit: z.number().min(1).max(20).default(5),
        }))
        .mutation(async ({ ctx, input }) => {
            const { query, limit } = input;

            // Simple text search - in a real implementation, you'd use full-text search
            const searchResults = await ctx.db.query.articles.findMany({
                where: and(
                    eq(articles.status, "published"),
                    sql`${articles.title} ILIKE ${`%${query}%`} OR ${articles.excerpt} ILIKE ${`%${query}%`}`
                ),
                columns: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    publishedAt: true,
                },
                with: {
                    author: {
                        columns: {
                            username: true,
                        },
                    },
                },
                orderBy: [desc(articles.publishedAt)],
                limit,
            });

            return searchResults.map(article => ({
                ...article,
                author: article.author?.username,
            }));
        }),
});