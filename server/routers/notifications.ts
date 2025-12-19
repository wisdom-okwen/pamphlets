import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { notifications, userPreferences, users } from "../db/schema";
import { eq, desc, and, not } from "drizzle-orm";
import { sendEmail, createNotificationEmail } from "../utils/email";

export const notificationsRouter = createTRPCRouter({
    /**
     * Get all notifications for current user
     */
    getNotifications: protectedProcedure
        .input(
            z.object({
                limit: z.number().default(20).optional(),
                offset: z.number().default(0).optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const userNotifications = await ctx.db.query.notifications.findMany(
                {
                    where: eq(notifications.userId, ctx.subject.id),
                    orderBy: desc(notifications.createdAt),
                    limit: input.limit,
                    offset: input.offset,
                    with: {
                        article: true,
                        comment: {
                            with: {
                                article: true,
                            },
                        },
                        fromUser: true,
                    },
                }
            );
            return userNotifications;
        }),

    /**
     * Get unread notification count
     */
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
        const result = await ctx.db
            .select()
            .from(notifications)
            .where(
                and(
                    eq(notifications.userId, ctx.subject.id),
                    not(eq(notifications.isRead, true))
                )
            );
        return result.length;
    }),

    /**
     * Mark notification as read
     */
    markAsRead: protectedProcedure
        .input(z.object({ notificationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(notifications)
                .set({ isRead: true })
                .where(
                    and(
                        eq(notifications.id, input.notificationId),
                        eq(notifications.userId, ctx.subject.id)
                    )
                )
                .returning();
            return updated;
        }),

    /**
     * Mark all notifications as read
     */
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
        await ctx.db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, ctx.subject.id));
        return { success: true };
    }),

    /**
     * Get user preferences
     */
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
        let prefs = await ctx.db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, ctx.subject.id),
        });

        if (!prefs) {
            const [created] = await ctx.db
                .insert(userPreferences)
                .values({
                    userId: ctx.subject.id,
                    emailNotifications: true,
                    subscribeNewArticles: true,
                    subscribeReactionNotifications: true,
                })
                .returning();
            prefs = created;
        }

        return prefs;
    }),

    /**
     * Update user preferences
     */
    updatePreferences: protectedProcedure
        .input(
            z.object({
                emailNotifications: z.boolean().optional(),
                subscribeNewArticles: z.boolean().optional(),
                subscribeReactionNotifications: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (input.emailNotifications !== undefined) {
                updateData.emailNotifications = input.emailNotifications;
            }
            if (input.subscribeNewArticles !== undefined) {
                updateData.subscribeNewArticles = input.subscribeNewArticles;
            }
            if (input.subscribeReactionNotifications !== undefined) {
                updateData.subscribeReactionNotifications =
                    input.subscribeReactionNotifications;
            }

            const prefs = await ctx.db.query.userPreferences.findFirst({
                where: eq(userPreferences.userId, ctx.subject.id),
            });

            if (!prefs) {
                const [created] = await ctx.db
                    .insert(userPreferences)
                    .values({
                        userId: ctx.subject.id,
                        ...updateData,
                    })
                    .returning();
                return created;
            }

            const [updated] = await ctx.db
                .update(userPreferences)
                .set(updateData)
                .where(eq(userPreferences.userId, ctx.subject.id))
                .returning();

            return updated;
        }),

    /**
     * Create notification (internal - called by other routers)
     * This is a public procedure so other routers can call it
     */
    createNotification: publicProcedure
        .input(
            z.object({
                userId: z.string().uuid(),
                type: z.enum([
                    "new_article",
                    "new_comment",
                    "new_like",
                    "new_reply",
                ]),
                title: z.string(),
                message: z.string(),
                articleId: z.number().optional(),
                commentId: z.number().optional(),
                fromUserId: z.string().uuid().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Create notification in database
                const [notification] = await ctx.db
                    .insert(notifications)
                    .values({
                        userId: input.userId,
                        type: input.type,
                        title: input.title,
                        message: input.message,
                        articleId: input.articleId,
                        commentId: input.commentId,
                        fromUserId: input.fromUserId,
                    })
                    .returning();

                // Get user preferences and email
                const userPrefs = await ctx.db.query.userPreferences.findFirst({
                    where: eq(userPreferences.userId, input.userId),
                });

                const recipientUser = await ctx.db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                // Send email if user enabled notifications
                if (userPrefs?.emailNotifications && recipientUser?.email) {
                    const emailHtml = createNotificationEmail(
                        input.type,
                        input.message,
                        input.title
                    );

                    await sendEmail({
                        to: recipientUser.email,
                        subject: input.title,
                        html: emailHtml,
                    });
                }

                return notification;
            } catch (error) {
                console.error("Error creating notification:", error);
                throw error;
            }
        }),

    /**
     * Delete notification
     */
    deleteNotification: protectedProcedure
        .input(z.object({ notificationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(notifications)
                .where(
                    and(
                        eq(notifications.id, input.notificationId),
                        eq(notifications.userId, ctx.subject.id)
                    )
                );
            return { success: true };
        }),
});
