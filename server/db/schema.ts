import {
    pgTable,
    serial,
    varchar,
    text,
    timestamp,
    integer,
    pgEnum,
    json,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "author", "visitor"]);
export const articleStatusEnum = pgEnum("article_status", [
    "draft",
    "published",
    "archived",
]);
export const reactionTypeEnum = pgEnum("reaction_type", [
    "like",
    "love",
    "support",
]);

// Content block types for rich content
export type ContentBlock =
    | { type: "paragraph"; content: string }
    | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: string }
    | { type: "image"; url: string; alt?: string; caption?: string }
    | { type: "video"; url: string; caption?: string }
    | { type: "embed"; url: string; provider?: string }
    | { type: "quote"; content: string; author?: string }
    | { type: "code"; language?: string; content: string }
    | { type: "list"; style: "ordered" | "unordered"; items: string[] }
    | { type: "divider" }
    | { type: "link"; url: string; text: string };

// ============ USERS TABLE ============
export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey(),
        username: varchar("username", { length: 50 }).notNull(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        bio: text("bio"),
        avatarUrl: varchar("avatar_url", { length: 500 }),
        role: userRoleEnum("role").default("visitor").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        emailIdx: uniqueIndex("email_idx").on(table.email),
        usernameIdx: uniqueIndex("username_idx").on(table.username),
    })
);

// ============ GENRES TABLE ============
export const genres = pgTable("genres", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ ARTICLES TABLE ============
export const articles = pgTable(
    "articles",
    {
        id: serial("id").primaryKey(),
        title: varchar("title", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull().unique(),
        excerpt: text("excerpt"), // Short summary for previews
        content: json("content").$type<ContentBlock[]>().notNull(), // Rich content blocks
        coverImageUrl: varchar("cover_image_url", { length: 500 }),
        status: articleStatusEnum("status").default("draft").notNull(),
        authorId: uuid("author_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        genreId: integer("genre_id")
            .notNull()
            .references(() => genres.id, { onDelete: "restrict" }),
        readTimeMinutes: integer("read_time_minutes"), // Estimated read time
        viewCount: integer("view_count").default(0).notNull(),
        publishedAt: timestamp("published_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        slugIdx: uniqueIndex("article_slug_idx").on(table.slug),
    })
);

// ============ ARTICLE_GENRES JOIN TABLE ============
export const articleGenres = pgTable(
    "article_genres",
    {
        id: serial("id").primaryKey(),
        articleId: integer("article_id")
            .notNull()
            .references(() => articles.id, { onDelete: "cascade" }),
        genreId: integer("genre_id")
            .notNull()
            .references(() => genres.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        articleGenreIdx: uniqueIndex("article_genre_idx").on(
            table.articleId,
            table.genreId
        ),
    })
);

export const articleGenresRelations = relations(articleGenres, ({ one }) => ({
    genre: one(genres, {
        fields: [articleGenres.genreId],
        references: [genres.id],
    }),
    article: one(articles, {
        fields: [articleGenres.articleId],
        references: [articles.id],
    }),
}));

// ============ TAGS TABLE ============
export const tags = pgTable("tags", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tagNameIdx: uniqueIndex("tag_name_idx").on(table.name),
    tagSlugIdx: uniqueIndex("tag_slug_idx").on(table.slug),
}));

// ============ ARTICLE_TAGS JOIN TABLE ============
export const articleTags = pgTable("article_tags", {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    articleTagIdx: uniqueIndex("article_tag_idx").on(table.articleId, table.tagId),
}));

// ============ COMMENTS TABLE ============
export const comments = pgTable("comments", {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    articleId: integer("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"), // For nested/reply comments
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ BOOKMARKS (Users saving articles) ============
export const bookmarks = pgTable("bookmarks", {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ REACTIONS (like, love, support) ============
export const reactions = pgTable("reactions", {
    id: serial("id").primaryKey(),
    type: reactionTypeEnum("type").notNull(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id").references(() => articles.id, {
        onDelete: "cascade",
    }),
    commentId: integer("comment_id").references(() => comments.id, {
        onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ many }) => ({
    articles: many(articles),
    comments: many(comments),
    bookmarks: many(bookmarks),
    reactions: many(reactions),
}));

export const genresRelations = relations(genres, ({ many }) => ({
    articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
    author: one(users, {
        fields: [articles.authorId],
        references: [users.id],
    }),
    genre: one(genres, {
        fields: [articles.genreId],
        references: [genres.id],
    }),
    comments: many(comments),
    bookmarks: many(bookmarks),
    reactions: many(reactions),
    tags: many(articleTags),
    articleGenres: many(articleGenres),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
    article: one(articles, {
        fields: [comments.articleId],
        references: [articles.id],
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
    }),
    reactions: many(reactions),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
    user: one(users, {
        fields: [bookmarks.userId],
        references: [users.id],
    }),
    article: one(articles, {
        fields: [bookmarks.articleId],
        references: [articles.id],
    }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
    user: one(users, {
        fields: [reactions.userId],
        references: [users.id],
    }),
    article: one(articles, {
        fields: [reactions.articleId],
        references: [articles.id],
    }),
    comment: one(comments, {
        fields: [reactions.commentId],
        references: [comments.id],
    }),
}));

// ============ TYPE EXPORTS ============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
