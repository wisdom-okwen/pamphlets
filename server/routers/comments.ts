import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const commentsRouter = createTRPCRouter({
    // Get comments for an article
    getByArticle: publicProcedure
        .input(
            z.object({
                articleId: z.number(),
                limit: z.number().min(1).max(50).default(20),
                cursor: z.number().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { articleId, limit, cursor } = input;

            const items = await ctx.db.query.comments.findMany({
                where: eq(comments.articleId, articleId),
                orderBy: [desc(comments.createdAt)],
                limit: limit + 1,
                offset: cursor ?? 0,
                with: {
                    user: {
                        columns: {
                            id: true,
                            username: true,
                            avatarUrl: true,
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

    // Create comment (protected)
    create: protectedProcedure
        .input(
            z.object({
                content: z.string().min(1).max(2000),
                articleId: z.number(),
                parentId: z.number().optional(), // For nested replies
            })
        )
        .mutation(async ({ ctx, input }) => {
            const [comment] = await ctx.db
                .insert(comments)
                .values({
                    ...input,
                    userId: ctx.subject.id,
                })
                .returning();

            return comment;
        }),

    // Update comment (protected)
    update: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                content: z.string().min(1).max(2000),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, content } = input;

            const [comment] = await ctx.db
                .update(comments)
                .set({
                    content,
                    updatedAt: new Date(),
                })
                .where(eq(comments.id, id))
                .returning();

            return comment;
        }),

    // Delete comment (protected)
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(comments).where(eq(comments.id, input.id));
            return { success: true };
        }),
});
