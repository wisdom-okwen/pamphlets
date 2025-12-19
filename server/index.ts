import { createTRPCRouter } from "./trpc";
import { articlesRouter } from "./routers/articles";
import { genresRouter } from "./routers/genres";
import { commentsRouter } from "./routers/comments";
import { reactionsRouter } from "./routers/reactions";
import { bookmarksRouter } from "./routers/bookmarks";
import { usersRouter } from "./routers/users";
import { adminStatsRouter } from "./routers/adminStats";
import { notificationsRouter } from "./routers/notifications";

/**
 * Main app router - combines all routers
 */
export const appRouter = createTRPCRouter({
    articles: articlesRouter,
    genres: genresRouter,
    comments: commentsRouter,
    reactions: reactionsRouter,
    bookmarks: bookmarksRouter,
    users: usersRouter,
    adminStats: adminStatsRouter,
    notifications: notificationsRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
