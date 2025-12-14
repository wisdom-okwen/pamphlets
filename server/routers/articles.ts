import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { articles } from "@/db/schema";
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
                },
            });

            let nextCursor: typeof cursor = undefined;
            if (items.length > limit) {
                items.pop();
                nextCursor = (cursor ?? 0) + limit;
            }

            return {
                items,
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

            return article;
        }),

    // Get featured articles (most viewed)
    getFeatured: publicProcedure
        .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.articles.findMany({
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
                },
            });
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
                genreId: z.number(),
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

            const [article] = await ctx.db
                .insert(articles)
                .values({
                    ...input,
                    slug,
                    authorId: ctx.subject.id,
                    publishedAt:
                        input.status === "published" ? new Date() : null,
                })
                .returning();

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
                genreId: z.number().optional(),
                status: z.enum(["draft", "published", "archived"]).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;

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
});
