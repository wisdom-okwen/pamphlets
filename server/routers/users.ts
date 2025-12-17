import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { users } from "../db/schema";
import { eq, asc } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
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
            await ctx.db.delete(users).where(eq(users.id, input.id));
            return { success: true };
        }),
});
