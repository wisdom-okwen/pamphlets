import { z } from "zod";
import {
    createTRPCRouter,
    publicProcedure,
    protectedProcedure,
    adminProcedure,
} from "../trpc";
import { articles, articleGenres } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";

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
                },
            });

            let nextCursor: typeof cursor = undefined;
            if (items.length > limit) {
                items.pop();
                nextCursor = (cursor ?? 0) + limit;
            }

            const mapped = items.map((it) => ({
                ...it,
                genres: (it.articleGenres || []).map((ag: any) => ag.genre),
            }));

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

            return {
                ...article,
                genres: (article.articleGenres || []).map((ag: any) => ag.genre),
            } as any;
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

            return items.map((it) => ({ ...it, genres: (it.articleGenres || []).map((ag: any) => ag.genre) }));
        }),

    // Create article (protected)
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1).max(255),
                slug: z.string().min(1).max(255).optional(),
                excerpt: z.string().optional(),
                content: z.array(z.any()),
                coverImageUrl: z.string().url().optional(),
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
                coverImageUrl: z.string().url().optional(),
                genreIds: z.array(z.number()).optional(),
                status: z.enum(["draft", "published", "archived"]).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

            // If genreIds provided, update join table and set primary genre
            if (data.genreIds) {
                // set primary genre to first
                const primary = data.genreIds[0];
                // remove genreIds from data before updating articles table
                delete (data as any).genreIds;

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

            const mapped = items.map((it) => ({ ...it, genres: (it.articleGenres || []).map((ag: any) => ag.genre) }));

            return { items: mapped, nextCursor };
        }),
});
