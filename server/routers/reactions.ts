import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { reactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const reactionsRouter = createTRPCRouter({
    // Toggle reaction on article
    toggleArticleReaction: protectedProcedure
        .input(
            z.object({
                articleId: z.number(),
                type: z.enum(["like", "love", "support"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if reaction exists
            const existing = await ctx.db.query.reactions.findFirst({
                where: and(
                    eq(reactions.userId, ctx.subject.id),
                    eq(reactions.articleId, input.articleId),
                    eq(reactions.type, input.type)
                ),
            });

            if (existing) {
                // Remove reaction
                await ctx.db
                    .delete(reactions)
                    .where(eq(reactions.id, existing.id));
                return { action: "removed" };
            } else {
                // Add reaction
                await ctx.db.insert(reactions).values({
                    userId: ctx.subject.id,
                    articleId: input.articleId,
                    type: input.type,
                });
                return { action: "added" };
            }
        }),

    // Toggle reaction on comment
    toggleCommentReaction: protectedProcedure
        .input(
            z.object({
                commentId: z.number(),
                type: z.enum(["like", "love", "support"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if reaction exists
            const existing = await ctx.db.query.reactions.findFirst({
                where: and(
                    eq(reactions.userId, ctx.subject.id),
                    eq(reactions.commentId, input.commentId),
                    eq(reactions.type, input.type)
                ),
            });

            if (existing) {
                // Remove reaction
                await ctx.db
                    .delete(reactions)
                    .where(eq(reactions.id, existing.id));
                return { action: "removed" };
            } else {
                // Add reaction
                await ctx.db.insert(reactions).values({
                    userId: ctx.subject.id,
                    commentId: input.commentId,
                    type: input.type,
                });
                return { action: "added" };
            }
        }),

    // Get reaction counts for an article
    getArticleCounts: protectedProcedure
        .input(z.object({ articleId: z.number() }))
        .query(async ({ ctx, input }) => {
            const allReactions = await ctx.db.query.reactions.findMany({
                where: eq(reactions.articleId, input.articleId),
            });

            return {
                like: allReactions.filter((r) => r.type === "like").length,
                love: allReactions.filter((r) => r.type === "love").length,
                support: allReactions.filter((r) => r.type === "support")
                    .length,
            };
        }),
});
