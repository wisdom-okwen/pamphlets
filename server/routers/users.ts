import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import { users } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { createAdminClient } from "@/utils/supabase/clients/api";

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
            // Delete from database first
            await ctx.db.delete(users).where(eq(users.id, input.id));
            
            // Also delete from Supabase Auth
            const supabaseAdmin = createAdminClient();
            const { error } = await supabaseAdmin.auth.admin.deleteUser(input.id);
            
            if (error) {
                console.error("Failed to delete user from Supabase Auth:", error);
            }
            
            return { success: true };
        }),
});
