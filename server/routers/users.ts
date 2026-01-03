import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { users, articles, comments } from "../db/schema";
import { eq, asc, and } from "drizzle-orm";
import { createAdminClient } from "@/utils/supabase/clients/api";

const DELETED_USER_ID = "00000000-0000-0000-0000-000000000000";

export const usersRouter = createTRPCRouter({
    /**
     * Get current user's profile
     */
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.subject.id),
        });
        return user;
    }),

    /**
     * Update current user's profile
     */
    updateMyProfile: protectedProcedure
        .input(
            z.object({
                username: z.string().min(2).max(50).optional(),
                bio: z.string().max(500).optional(),
                avatarUrl: z.string().url().or(z.literal("")).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (input.username !== undefined) {
                updateData.username = input.username;
            }
            if (input.bio !== undefined) {
                updateData.bio = input.bio || null;
            }
            if (input.avatarUrl !== undefined) {
                updateData.avatarUrl = input.avatarUrl || null;
            }

            const [updated] = await ctx.db
                .update(users)
                .set(updateData)
                .where(eq(users.id, ctx.subject.id))
                .returning();

            return updated;
        }),

    /**
     * Get all users (admin only)
     */
    getAll: adminProcedure
        .input(
            z
                .object({
                    limit: z.number().min(1).max(500).default(100),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 100;

            const items = await ctx.db.query.users.findMany({
                orderBy: [asc(users.email)],
                limit,
                columns: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                },
            });

            return { items };
        }),

    /**
     * Update a user's role (admin only)
     */
    updateRole: adminProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                role: z.enum(["visitor", "author", "admin"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const [updated] = await ctx.db
                .update(users)
                .set({ role: input.role })
                .where(eq(users.id, input.id))
                .returning();

            return updated;
        }),

    /**
     * Delete a user (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            // Reassign published articles to the "deleted user" account
            await ctx.db
                .update(articles)
                .set({ authorId: DELETED_USER_ID })
                .where(
                    and(
                        eq(articles.authorId, input.id),
                        eq(articles.status, "published")
                    )
                );

            // Reassign comments to the "deleted user" account
            await ctx.db
                .update(comments)
                .set({ userId: DELETED_USER_ID })
                .where(eq(comments.userId, input.id));

            // Delete from database (this will cascade delete drafts, bookmarks, reactions, etc.)
            await ctx.db.delete(users).where(eq(users.id, input.id));

            // Also delete from Supabase Auth
            const supabaseAdmin = createAdminClient();
            const { error } = await supabaseAdmin.auth.admin.deleteUser(
                input.id
            );

            if (error) {
                console.error(
                    "Failed to delete user from Supabase Auth:",
                    error
                );
            }

            return { success: true };
        }),

    /**
     * Delete current user's own account
     */
    deleteMyAccount: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.subject.id;

        // Reassign published articles to the "deleted user" account
        await ctx.db
            .update(articles)
            .set({ authorId: DELETED_USER_ID })
            .where(
                and(
                    eq(articles.authorId, userId),
                    eq(articles.status, "published")
                )
            );

        // Reassign comments to the "deleted user" account
        await ctx.db
            .update(comments)
            .set({ userId: DELETED_USER_ID })
            .where(eq(comments.userId, userId));

        // Delete from database (this will cascade delete drafts, bookmarks, reactions, etc.)
        await ctx.db.delete(users).where(eq(users.id, userId));

        // Also delete from Supabase Auth
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error("Failed to delete user from Supabase Auth:", error);
        }

        return { success: true };
    }),
});
