import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { users, articles } from "../db/schema";
import { eq, desc, sql, gt } from "drizzle-orm";

export const adminStatsRouter = createTRPCRouter({
    overview: adminProcedure.query(async ({ ctx }) => {
        const usersCountRes = await ctx.db
            .select({ count: sql`count(*)` })
            .from(users)
            .execute();
        const totalUsers = Number(usersCountRes?.[0]?.count ?? 0);

        const articlesCountRes = await ctx.db
            .select({ count: sql`count(*)` })
            .from(articles)
            .execute();
        const totalArticles = Number(articlesCountRes?.[0]?.count ?? 0);

        const publishedRes = await ctx.db
            .select({ count: sql`count(*)` })
            .from(articles)
            .where(eq(articles.status, "published"))
            .execute();
        const published = Number(publishedRes?.[0]?.count ?? 0);

        const archivedRes = await ctx.db
            .select({ count: sql`count(*)` })
            .from(articles)
            .where(eq(articles.status, "archived"))
            .execute();
        const archived = Number(archivedRes?.[0]?.count ?? 0);

        return { totalUsers, totalArticles, published, archived };
    }),

    timeseries: adminProcedure
        .input(z.object({ days: z.number().min(1).max(90).default(14) }))
        .query(async ({ ctx, input }) => {
            const days = input.days;

            const articlesPerDay = await ctx.db
                .select({
                    day: sql`date_trunc('day', ${articles.createdAt})::date`,
                    count: sql`count(*)`,
                })
                .from(articles)
                .where(
                    gt(
                        sql`date_trunc('day', ${articles.createdAt})::date`,
                        sql`now() - (${days} || ' days')::interval`
                    )
                )
                .groupBy(sql`date_trunc('day', ${articles.createdAt})::date`)
                .orderBy(
                    desc(sql`date_trunc('day', ${articles.createdAt})::date`)
                )
                .execute();

            const usersPerDay = await ctx.db
                .select({
                    day: sql`date_trunc('day', ${users.createdAt})::date`,
                    count: sql`count(*)`,
                })
                .from(users)
                .where(
                    gt(
                        sql`date_trunc('day', ${users.createdAt})::date`,
                        sql`now() - (${days} || ' days')::interval`
                    )
                )
                .groupBy(sql`date_trunc('day', ${users.createdAt})::date`)
                .orderBy(desc(sql`date_trunc('day', ${users.createdAt})::date`))
                .execute();

            return { articlesPerDay, usersPerDay };
        }),
});
