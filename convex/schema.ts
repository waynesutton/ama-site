import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// Convex Auth v2 keeps usernames and password hashes in its own components.
// This table only holds app data about each account.
const userTables = {
  users: defineTable({
    // Grant admin by hand in the dashboard, or with ADMIN_USERNAMES.
    isAdmin: v.optional(v.boolean()),
  }),
};

const applicationTables = {
  events: defineTable({
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    adminName: v.optional(v.string()),
    isActive: v.boolean(),
    isClosed: v.optional(v.boolean()),
    openDate: v.optional(v.string()),
    closeDate: v.optional(v.string()),
    closedMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    archived: v.optional(v.boolean()),
  })
    .index("by_title", ["title"])
    .index("by_active", ["isActive"])
    .index("by_archived", ["archived"]),

  questions: defineTable({
    eventId: v.id("events"),
    content: v.string(),
    authorName: v.optional(v.string()),
    upvotes: v.number(),
    isVisible: v.boolean(),
    answered: v.optional(v.boolean()),
    answer: v.optional(v.string()),
    answeredBy: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_visible", ["eventId", "isVisible"])
    .index("by_upvotes", ["upvotes"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["eventId", "isVisible"],
    }),

  // Tracks one vote per user/session per question
  votes: defineTable({
    questionId: v.id("questions"),
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_question_and_user", ["questionId", "userId"])
    .index("by_question_and_session", ["questionId", "sessionId"]),

  comments: defineTable({
    questionId: v.id("questions"),
    content: v.string(),
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
    isAdmin: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_question", ["questionId"]),

  adminActions: defineTable({
    actionType: v.union(
      v.literal("hide_question"),
      v.literal("delete_question"),
      v.literal("toggle_visibility"),
      v.literal("mark_answered"),
      v.literal("create_event"),
      v.literal("update_event"),
      v.literal("delete_event")
    ),
    targetId: v.union(v.id("questions"), v.id("events")),
    targetType: v.union(v.literal("question"), v.literal("event")),
    adminId: v.optional(v.id("users")),
    adminName: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_target", ["targetId"]),

  flaggedContent: defineTable({
    contentType: v.union(v.literal("question"), v.literal("comment")),
    contentId: v.union(v.id("questions"), v.id("comments")),
    reason: v.string(),
    reporterName: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_content", ["contentId"]),
};

export default defineSchema({
  ...userTables,
  ...applicationTables,
});
