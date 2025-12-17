import { z } from "zod";
import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
    adminProcedure,
} from "../trpc";
import { articles, articleGenres, reactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";

interface ReactionType {
    id: number;
    type: string;
    userId: string;
    articleId: number | null;
    commentId: number | null;
}

interface GenreType {
    id: number;
    name: string;
    slug: string;
}

interface ArticleGenreType {
    genre: GenreType;
}

export const articlesRouter = createTRPCRouter({
    // Get all published articles
    getAll: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.number().nullish(),
                genreId: z.number().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor, genreId } = input;

            const items = await ctx.db.query.articles.findMany({
                where: and(
                    eq(articles.status, "published"),
                    genreId ? eq(articles.genreId, genreId) : undefined
                ),
                orderBy: [desc(articles.publishedAt)],
                limit: limit + 1,
                offset: cursor ?? 0,
                with: {
                    author: {
                        columns: {
                            id: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                    genre: true,
                    articleGenres: {
                        with: {
                            genre: true,
                        },
                    },
                    reactions: true,
                    comments: true,
                },
            });

            let nextCursor: typeof cursor = undefined;
            if (items.length > limit) {
                items.pop();
                nextCursor = (cursor ?? 0) + limit;
            }

            const mapped = items.map((it) => {
                const likeReactions = (it.reactions || []).filter(
                    (r: ReactionType) => r.type === "like"
                );
                const userHasLiked = ctx.subject
                    ? likeReactions.some(
                          (r: ReactionType) => r.userId === ctx.subject!.id
                      )
                    : false;
                return {
                    ...it,
                    genres: (it.articleGenres || []).map((ag: ArticleGenreType) => ag.genre),
                    likeCount: likeReactions.length,
                    commentCount: (it.comments || []).length,
                    userHasLiked,
                };
            });

            return {
                items: mapped,
                nextCursor,
            };
        }),

    // Get single article by slug
    getBySlug: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ ctx, input }) => {
            const article = await ctx.db.query.articles.findFirst({
                where: eq(articles.slug, input.slug),
                with: {
                    author: {
                        columns: {
                            id: true,
                            username: true,
                            bio: true,
                            avatarUrl: true,
                        },
                    },
                    genre: true,
                    articleGenres: { with: { genre: true } },
                    reactions: true,
                    comments: {
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                    username: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                        orderBy: (comments, { desc }) => [
                            desc(comments.createdAt),
                        ],
                    },
                },
            });

            if (!article) {
                return null;
            }

            // Increment view count
            await ctx.db
                .update(articles)
                .set({ viewCount: article.viewCount + 1 })
                .where(eq(articles.id, article.id));

            const likeReactions = (article.reactions || []).filter(
                (r: ReactionType) => r.type === "like"
            );
            const userHasLiked = ctx.subject
                ? likeReactions.some((r: ReactionType) => r.userId === ctx.subject!.id)
                : false;

            return {
                ...article,
                genres: (article.articleGenres || []).map(
                    (ag: ArticleGenreType) => ag.genre
                ),
                likeCount: likeReactions.length,
                commentCount: (article.comments || []).length,
                userHasLiked,
            };
        }),

    // Get featured articles (most viewed)
    getFeatured: publicProcedure
        .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
        .query(async ({ ctx, input }) => {
            const items = await ctx.db.query.articles.findMany({
                where: eq(articles.status, "published"),
                orderBy: [desc(articles.viewCount)],
                limit: input.limit,
                with: {
                    author: {
                        columns: {
                            id: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                    genre: true,
                    articleGenres: { with: { genre: true } },
                },
            });

            return items.map((it) => ({
                ...it,
                genres: (it.articleGenres || []).map((ag: ArticleGenreType) => ag.genre),
            }));
        }),

    // Create article (protected)
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1).max(255),
                slug: z.string().min(1).max(255).optional(),
                excerpt: z.string().optional(),
                content: z.array(z.any()),
                coverImageUrl: z.string().refine((val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'), { message: 'Must be a URL or relative path' }).optional(),
                genreIds: z.array(z.number()).min(1),
                status: z
                    .enum(["draft", "published", "archived"])
                    .default("draft"),
            })
        )
        .mutation(async ({ ctx, input }) => {
            let slug = input.slug ?? generateSlug(input.title);

            const existing = await ctx.db.query.articles.findFirst({
                where: eq(articles.slug, slug),
            });

            if (existing) {
                slug = generateUniqueSlug(slug);
            }

            // Use first genre as legacy single-genre field
            const primaryGenreId = input.genreIds[0];

            const [article] = await ctx.db
                .insert(articles)
                .values({
                    title: input.title,
                    slug,
                    excerpt: input.excerpt,
                    content: input.content,
                    coverImageUrl: input.coverImageUrl,
                    status: input.status,
                    authorId: ctx.subject.id,
                    genreId: primaryGenreId,
                    publishedAt:
                        input.status === "published" ? new Date() : null,
                })
                .returning();

            // Insert join rows
            const rows = input.genreIds.map((gId) => ({
                articleId: article.id,
                genreId: gId,
            }));

            await ctx.db
                .insert(articleGenres)
                .values(rows)
                .onConflictDoNothing()
                .execute();

            return article;
        }),

    // Update article (protected)
    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                title: z.string().min(1).max(255).optional(),
                slug: z.string().min(1).max(255).optional(),
                excerpt: z.string().optional(),
                content: z.array(z.any()).optional(),
                coverImageUrl: z.string().refine((val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'), { message: 'Must be a URL or relative path' }).optional(),
                genreIds: z.array(z.number()).optional(),
                status: z.enum(["draft", "published", "archived"]).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, genreIds, ...data } = input;

            // If genreIds provided, update join table and set primary genre
            if (genreIds) {
                // set primary genre to first
                const primary = genreIds[0];

                await ctx.db
                    .update(articles)
                    .set({
                        ...data,
                        genreId: primary,
                        updatedAt: new Date(),
                        publishedAt:
                            data.status === "published"
                                ? new Date()
                                : undefined,
                    })
                    .where(eq(articles.id, id));

                // replace join rows
                await ctx.db
                    .delete(articleGenres)
                    .where(eq(articleGenres.articleId, id));
                const newRows = (input.genreIds || []).map((gId) => ({
                    articleId: id,
                    genreId: gId,
                }));
                if (newRows.length > 0) {
                    await ctx.db
                        .insert(articleGenres)
                        .values(newRows)
                        .onConflictDoNothing()
                        .execute();
                }
            }

            const [article] = await ctx.db
                .update(articles)
                .set({
                    ...data,
                    updatedAt: new Date(),
                    publishedAt:
                        data.status === "published" ? new Date() : undefined,
                })
                .where(eq(articles.id, id))
                .returning();

            return article;
        }),

    // Delete article (protected)
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(articles).where(eq(articles.id, input.id));
            return { success: true };
        }),

    adminGetAll: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(500).default(100),
                cursor: z.number().nullish(),
                status: z.enum(["draft", "published", "archived"]).optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor, status } = input;

            const items = await ctx.db.query.articles.findMany({
                where: status ? eq(articles.status, status) : undefined,
                orderBy: [desc(articles.publishedAt)],
                limit: limit + 1,
                offset: cursor ?? 0,
                with: {
                    author: {
                        columns: {
                            id: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                    genre: true,
                    articleGenres: { with: { genre: true } },
                },
            });

            let nextCursor: typeof cursor = undefined;
            if (items.length > limit) {
                items.pop();
                nextCursor = (cursor ?? 0) + limit;
            }

            const mapped = items.map((it) => ({
                ...it,
                genres: (it.articleGenres || []).map((ag: ArticleGenreType) => ag.genre),
            }));

            return { items: mapped, nextCursor };
        }),

    // Toggle like on an article
    toggleLike: protectedProcedure
        .input(z.object({ articleId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.subject.id;
            const { articleId } = input;

            // Check if user already liked this article
            const existingLike = await ctx.db.query.reactions.findFirst({
                where: and(
                    eq(reactions.userId, userId),
                    eq(reactions.articleId, articleId),
                    eq(reactions.type, "like")
                ),
            });

            if (existingLike) {
                // Remove the like
                await ctx.db
                    .delete(reactions)
                    .where(eq(reactions.id, existingLike.id));
                return { liked: false };
            } else {
                // Add a like
                await ctx.db.insert(reactions).values({
                    type: "like",
                    userId,
                    articleId,
                    commentId: null,
                });
                return { liked: true };
            }
        }),

    // Check if user has liked an article
    hasLiked: protectedProcedure
        .input(z.object({ articleId: z.number() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.subject.id;
            const existingLike = await ctx.db.query.reactions.findFirst({
                where: and(
                    eq(reactions.userId, userId),
                    eq(reactions.articleId, input.articleId),
                    eq(reactions.type, "like")
                ),
            });
            return { liked: !!existingLike };
        }),
});
