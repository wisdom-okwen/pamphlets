import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { bookmarks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const bookmarksRouter = createTRPCRouter({
    // Get user's bookmarks
    getMyBookmarks: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(50).default(20),
                cursor: z.number().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor } = input;

            const items = await ctx.db.query.bookmarks.findMany({
                where: eq(bookmarks.userId, ctx.subject.id),
                orderBy: [desc(bookmarks.createdAt)],
                limit: limit + 1,
                offset: cursor ?? 0,
                with: {
                    article: {
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
                    },
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

    // Toggle bookmark
    toggle: protectedProcedure
        .input(z.object({ articleId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Check if bookmark exists
            const existing = await ctx.db.query.bookmarks.findFirst({
                where: and(
                    eq(bookmarks.userId, ctx.subject.id),
                    eq(bookmarks.articleId, input.articleId)
                ),
            });

            if (existing) {
                // Remove bookmark
                await ctx.db
                    .delete(bookmarks)
                    .where(eq(bookmarks.id, existing.id));
                return { bookmarked: false };
            } else {
                // Add bookmark
                await ctx.db.insert(bookmarks).values({
                    userId: ctx.subject.id,
                    articleId: input.articleId,
                });
                return { bookmarked: true };
            }
        }),

    // Check if article is bookmarked
    isBookmarked: protectedProcedure
        .input(z.object({ articleId: z.number() }))
        .query(async ({ ctx, input }) => {
            const existing = await ctx.db.query.bookmarks.findFirst({
                where: and(
                    eq(bookmarks.userId, ctx.subject.id),
                    eq(bookmarks.articleId, input.articleId)
                ),
            });

            return { bookmarked: !!existing };
        }),
});
