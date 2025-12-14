import { createTRPCRouter } from "./trpc";
import { articlesRouter } from "./routers/articles";
import { genresRouter } from "./routers/genres";
import { commentsRouter } from "./routers/comments";
import { reactionsRouter } from "./routers/reactions";
import { bookmarksRouter } from "./routers/bookmarks";

/**
 * Main app router - combines all routers
 */
export const appRouter = createTRPCRouter({
    articles: articlesRouter,
    genres: genresRouter,
    comments: commentsRouter,
    reactions: reactionsRouter,
    bookmarks: bookmarksRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
