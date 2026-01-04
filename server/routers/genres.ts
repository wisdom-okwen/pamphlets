import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure, authorProcedure } from "../trpc";
import { genres } from "@/db/schema";
import { eq } from "drizzle-orm";

function createSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const genresRouter = createTRPCRouter({
    // Get all genres
    getAll: publicProcedure.query(async ({ ctx }) => {
        return ctx.db.query.genres.findMany({
            orderBy: (genres, { asc }) => [asc(genres.name)],
        });
    }),

    // Get single genre by slug
    getBySlug: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.query.genres.findFirst({
                where: eq(genres.slug, input.slug),
                with: {
                    articles: {
                        where: (articles, { eq }) =>
                            eq(articles.status, "published"),
                        orderBy: (articles, { desc }) => [
                            desc(articles.publishedAt),
                        ],
                        limit: 10,
                    },
                },
            });
        }),

    // Create genre (admin only)
    create: adminProcedure
        .input(
            z.object({
                name: z.string().min(1).max(100),
                slug: z.string().min(1).max(100),
                description: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const [genre] = await ctx.db
                .insert(genres)
                .values(input)
                .returning();
            return genre;
        }),

    // Create genre by author (auto-generates slug)
    createByAuthor: authorProcedure
        .input(
            z.object({
                name: z.string().min(1).max(100),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const slug = createSlug(input.name);
            
            // Check if genre with this slug already exists
            const existing = await ctx.db.query.genres.findFirst({
                where: eq(genres.slug, slug),
            });
            
            if (existing) {
                return existing;
            }
            
            const [genre] = await ctx.db
                .insert(genres)
                .values({
                    name: input.name.trim(),
                    slug,
                })
                .returning();
            return genre;
        }),

    // Update genre (admin only)
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().min(1).max(100).optional(),
                slug: z.string().min(1).max(100).optional(),
                description: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const [genre] = await ctx.db
                .update(genres)
                .set(data)
                .where(eq(genres.id, id))
                .returning();
            return genre;
        }),

    // Delete genre (admin only)
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(genres).where(eq(genres.id, input.id));
            return { success: true };
        }),
});
