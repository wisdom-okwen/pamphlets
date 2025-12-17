import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { comments, reactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const commentsRouter = createTRPCRouter({
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
                    reactions: true,
                },
            });

            let nextCursor: typeof cursor = undefined;
            if (items.length > limit) {
                items.pop();
                nextCursor = (cursor ?? 0) + limit;
            }

            // Add reaction counts and user's reaction status
            const itemsWithReactions = items.map((comment) => {
                const commentReactions = comment.reactions || [];
                const likeCount = commentReactions.filter((r) => r.type === "like").length;
                const loveCount = commentReactions.filter((r) => r.type === "love").length;
                const supportCount = commentReactions.filter((r) => r.type === "support").length;
                const userLiked = ctx.subject
                    ? commentReactions.some((r) => r.userId === ctx.subject!.id && r.type === "like")
                    : false;
                const userLoved = ctx.subject
                    ? commentReactions.some((r) => r.userId === ctx.subject!.id && r.type === "love")
                    : false;
                const userSupported = ctx.subject
                    ? commentReactions.some((r) => r.userId === ctx.subject!.id && r.type === "support")
                    : false;

                return {
                    ...comment,
                    likeCount,
                    loveCount,
                    supportCount,
                    userLiked,
                    userLoved,
                    userSupported,
                };
            });

            return {
                items: itemsWithReactions,
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

    // Toggle reaction on a comment (like, love, support)
    toggleReaction: protectedProcedure
        .input(
            z.object({
                commentId: z.number(),
                type: z.enum(["like", "love", "support"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { commentId, type } = input;
            const userId = ctx.subject.id;

            // Check if user already has this reaction on this comment
            const existing = await ctx.db.query.reactions.findFirst({
                where: and(
                    eq(reactions.commentId, commentId),
                    eq(reactions.userId, userId),
                    eq(reactions.type, type)
                ),
            });

            if (existing) {
                // Remove the reaction
                await ctx.db.delete(reactions).where(eq(reactions.id, existing.id));
                return { added: false, type };
            } else {
                // Remove any other reaction type on this comment first (can only have one reaction)
                await ctx.db.delete(reactions).where(
                    and(
                        eq(reactions.commentId, commentId),
                        eq(reactions.userId, userId)
                    )
                );
                // Add the new reaction
                await ctx.db.insert(reactions).values({
                    commentId,
                    userId,
                    type,
                    articleId: null,
                });
                return { added: true, type };
            }
        }),

    getMyComments: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(50).default(20),
                cursor: z.number().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor } = input;

            const items = await ctx.db.query.comments.findMany({
                where: eq(comments.userId, ctx.subject.id),
                orderBy: [desc(comments.createdAt)],
                limit: limit + 1,
                offset: cursor ?? 0,
                with: {
                    article: {
                        columns: {
                            id: true,
                            title: true,
                            slug: true,
                            coverImageUrl: true,
                        },
                        with: {
                            author: {
                                columns: {
                                    id: true,
                                    username: true,
                                },
                            },
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
});
