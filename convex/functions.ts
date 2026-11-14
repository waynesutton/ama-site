import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./users";

const getLoggedInUser = (ctx: QueryCtx) => getCurrentUser(ctx);

async function isAdmin(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  return user?.isAdmin === true;
}

// Public event shape: drops the host's username, which only admins should see.
function toPublicEvent(event: Doc<"events">) {
  const { adminName: _adminName, ...rest } = event;
  return { ...rest, slug: createSlug(event.title) };
}

// Helper function to create URL slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// EVENT FUNCTIONS

export const listActiveEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return events.map(toPublicEvent);
  },
});

export const listAllEventsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const events = await ctx.db
      .query("events")
      .order("desc")
      .collect();

    return events.map(event => ({
      ...event,
      slug: createSlug(event.title),
    }));
  },
});

export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    return toPublicEvent(event);
  },
});

export const getEventByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .unique();

    if (!event) return null;

    return toPublicEvent(event);
  },
});

export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db.query("events").collect();
    const event = events.find(e => createSlug(e.title) === args.slug);

    if (!event) return null;

    return toPublicEvent(event);
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    openDate: v.optional(v.string()),
    closeDate: v.optional(v.string()),
    closedMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      date: args.date,
      adminName: user.name ?? undefined,
      isActive: true,
      isClosed: false,
      openDate: args.openDate,
      closeDate: args.closeDate,
      closedMessage: args.closedMessage,
      createdAt: now,
      updatedAt: now,
      archived: false,
    });

    await ctx.db.insert("adminActions", {
      actionType: "create_event",
      targetId: eventId,
      targetType: "event",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: now,
    });

    return eventId;
  },
});

// Copies an event's settings into a new, inactive event. Questions, votes and
// comments stay with the original.
export const duplicateEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const source = await ctx.db.get(args.eventId);
    if (!source) {
      throw new Error("Event not found");
    }

    // Titles double as the event's URL slug and admin route, so keep them unique.
    const base = `${source.title} (copy)`;
    let title = base;
    for (let n = 2; n <= 50; n++) {
      const taken = await ctx.db
        .query("events")
        .withIndex("by_title", (q) => q.eq("title", title))
        .first();
      if (!taken) break;
      title = `${source.title} (copy ${n})`;
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      title,
      description: source.description,
      date: source.date,
      adminName: user.name ?? undefined,
      // Inactive so the copy isn't public until it's been edited.
      isActive: false,
      isClosed: false,
      openDate: source.openDate,
      closeDate: source.closeDate,
      closedMessage: source.closedMessage,
      createdAt: now,
      updatedAt: now,
      archived: false,
    });

    await ctx.db.insert("adminActions", {
      actionType: "create_event",
      targetId: eventId,
      targetType: "event",
      adminId: user._id,
      adminName: user.name || "Admin",
      reason: `Duplicated from "${source.title}"`,
      createdAt: now,
    });

    const created = await ctx.db.get(eventId);
    return created ? { ...created, slug: createSlug(created.title) } : null;
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    openDate: v.optional(v.string()),
    closeDate: v.optional(v.string()),
    closedMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();
    await ctx.db.patch(args.eventId, {
      title: args.title,
      description: args.description,
      date: args.date,
      openDate: args.openDate,
      closeDate: args.closeDate,
      closedMessage: args.closedMessage,
      updatedAt: now,
      archived: false,
    });

    await ctx.db.insert("adminActions", {
      actionType: "update_event",
      targetId: args.eventId,
      targetType: "event",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: now,
    });

    return true;
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const question of questions) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_question", (q) => q.eq("questionId", question._id))
        .collect();

      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Delete votes for this question
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_question_and_user", (q) => q.eq("questionId", question._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }

      await ctx.db.delete(question._id);
    }

    await ctx.db.delete(args.eventId);

    await ctx.db.insert("adminActions", {
      actionType: "delete_event",
      targetId: args.eventId,
      targetType: "event",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: Date.now(),
    });

    return true;
  },
});

export const toggleEventStatus = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      isActive: !event.isActive,
      updatedAt: Date.now(),
    });

    return !event.isActive;
  },
});

export const toggleEventClosed = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const newClosed = !event.isClosed;
    await ctx.db.patch(args.eventId, {
      isClosed: newClosed,
      updatedAt: Date.now(),
    });

    return newClosed;
  },
});

export const toggleEventArchive = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      archived: !event.archived,
      updatedAt: Date.now(),
    });

    return !event.archived;
  },
});

export const isEventOpen = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) return false;
    if (event.isClosed) return false;

    const now = Date.now();

    if (event.openDate && new Date(event.openDate).getTime() > now) {
      return false;
    }

    if (event.closeDate && new Date(event.closeDate).getTime() < now) {
      return false;
    }

    return true;
  },
});

// QUESTION FUNCTIONS

export const listQuestions = query({
  args: {
    eventId: v.id("events"),
    sortBy: v.optional(v.union(v.literal("upvotes"), v.literal("recent"), v.literal("answered"))),
  },
  handler: async (ctx, args) => {
    let questions = await ctx.db
      .query("questions")
      .withIndex("by_event_and_visible", (q) =>
        q.eq("eventId", args.eventId).eq("isVisible", true)
      )
      .collect();

    switch (args.sortBy) {
      case "upvotes":
        questions.sort((a, b) => b.upvotes - a.upvotes);
        break;
      case "recent":
        questions.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "answered":
        questions.sort((a, b) => {
          if (a.answered && !b.answered) return -1;
          if (!a.answered && b.answered) return 1;
          return b.upvotes - a.upvotes;
        });
        break;
      default:
        questions.sort((a, b) => b.upvotes - a.upvotes);
    }

    return questions;
  },
});

export const listQuestionsForAdmin = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) {
      throw new Error("Admin access required");
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    return questions;
  },
});

export const submitQuestion = mutation({
  args: {
    eventId: v.id("events"),
    content: v.string(),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user) {
      throw new Error("Authentication required to submit questions");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || !event.isActive) {
      throw new Error("Event is not accepting questions");
    }

    if (event.isClosed) {
      throw new Error("This event is closed");
    }

    const now = Date.now();

    if (event.openDate && new Date(event.openDate).getTime() > now) {
      throw new Error("Question submission has not opened yet");
    }

    if (event.closeDate && new Date(event.closeDate).getTime() < now) {
      throw new Error("Question submission has closed");
    }

    if (args.content.length > 249) {
      throw new Error("Question must be 249 characters or less");
    }

    const questionId = await ctx.db.insert("questions", {
      eventId: args.eventId,
      content: args.content,
      authorName: args.authorName || user.name || "Anonymous",
      upvotes: 0,
      isVisible: true,
      answered: false,
      createdAt: now,
      updatedAt: now,
    });

    return questionId;
  },
});

export const upvoteQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question || !question.isVisible) {
      throw new Error("Question not found");
    }

    // Check if event is closed
    const event = await ctx.db.get(question.eventId);
    if (event?.isClosed) {
      throw new Error("This event is closed");
    }

    const userId = await getAuthUserId(ctx);

    // Check for duplicate vote
    if (userId) {
      const existingVote = await ctx.db
        .query("votes")
        .withIndex("by_question_and_user", (q) =>
          q.eq("questionId", args.questionId).eq("userId", userId)
        )
        .unique();

      if (existingVote) {
        throw new Error("You have already voted on this question");
      }

      await ctx.db.insert("votes", {
        questionId: args.questionId,
        userId,
        createdAt: Date.now(),
      });
    } else if (args.sessionId) {
      const existingVote = await ctx.db
        .query("votes")
        .withIndex("by_question_and_session", (q) =>
          q.eq("questionId", args.questionId).eq("sessionId", args.sessionId)
        )
        .unique();

      if (existingVote) {
        throw new Error("You have already voted on this question");
      }

      await ctx.db.insert("votes", {
        questionId: args.questionId,
        sessionId: args.sessionId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.questionId, {
      upvotes: question.upvotes + 1,
      updatedAt: Date.now(),
    });

    return question.upvotes + 1;
  },
});

// Get which questions the current user/session has voted on
export const getMyVotes = query({
  args: {
    eventId: v.id("events"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const votedQuestionIds = new Set<string>();

    for (const question of questions) {
      if (userId) {
        const vote = await ctx.db
          .query("votes")
          .withIndex("by_question_and_user", (q) =>
            q.eq("questionId", question._id).eq("userId", userId)
          )
          .unique();
        if (vote) votedQuestionIds.add(question._id);
      } else if (args.sessionId) {
        const vote = await ctx.db
          .query("votes")
          .withIndex("by_question_and_session", (q) =>
            q.eq("questionId", question._id).eq("sessionId", args.sessionId)
          )
          .unique();
        if (vote) votedQuestionIds.add(question._id);
      }
    }

    return Array.from(votedQuestionIds);
  },
});

export const searchQuestionsByText = query({
  args: {
    eventId: v.id("events"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("questions")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchTerm)
          .eq("eventId", args.eventId)
          .eq("isVisible", true)
      )
      .take(20);

    return results;
  },
});

export const markQuestionAnswered = mutation({
  args: {
    questionId: v.id("questions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();
    await ctx.db.patch(args.questionId, {
      answered: true,
      answer: args.answer,
      answeredBy: user.name || "Admin",
      answeredAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("adminActions", {
      actionType: "mark_answered",
      targetId: args.questionId,
      targetType: "question",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: now,
    });

    return true;
  },
});

export const markQuestionAsAnswered = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();
    await ctx.db.patch(args.questionId, {
      answered: true,
      answeredBy: user.name || "Admin",
      answeredAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("adminActions", {
      actionType: "mark_answered",
      targetId: args.questionId,
      targetType: "question",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: now,
    });

    return true;
  },
});

export const toggleQuestionVisibility = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    await ctx.db.patch(args.questionId, {
      isVisible: !question.isVisible,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminActions", {
      actionType: "toggle_visibility",
      targetId: args.questionId,
      targetType: "question",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: Date.now(),
    });

    return !question.isVisible;
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete votes
    const userVotes = await ctx.db
      .query("votes")
      .withIndex("by_question_and_user", (q) => q.eq("questionId", args.questionId))
      .collect();
    for (const vote of userVotes) {
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(args.questionId);

    await ctx.db.insert("adminActions", {
      actionType: "delete_question",
      targetId: args.questionId,
      targetType: "question",
      adminId: user._id,
      adminName: user.name || "Admin",
      createdAt: Date.now(),
    });

    return true;
  },
});

export const bulkToggleVisibility = mutation({
  args: { questionIds: v.array(v.id("questions")) },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    for (const questionId of args.questionIds) {
      const question = await ctx.db.get(questionId);
      if (question) {
        await ctx.db.patch(questionId, {
          isVisible: !question.isVisible,
          updatedAt: now,
        });

        await ctx.db.insert("adminActions", {
          actionType: "toggle_visibility",
          targetId: questionId,
          targetType: "question",
          adminId: user._id,
          adminName: user.name || "Admin",
          createdAt: now,
        });
      }
    }

    return true;
  },
});

export const bulkDeleteQuestions = mutation({
  args: { questionIds: v.array(v.id("questions")) },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const now = Date.now();

    for (const questionId of args.questionIds) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_question", (q) => q.eq("questionId", questionId))
        .collect();

      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      const userVotes = await ctx.db
        .query("votes")
        .withIndex("by_question_and_user", (q) => q.eq("questionId", questionId))
        .collect();
      for (const vote of userVotes) {
        await ctx.db.delete(vote._id);
      }

      await ctx.db.delete(questionId);

      await ctx.db.insert("adminActions", {
        actionType: "delete_question",
        targetId: questionId,
        targetType: "question",
        adminId: user._id,
        adminName: user.name || "Admin",
        createdAt: now,
      });
    }

    return true;
  },
});

// COMMENT FUNCTIONS

export const listComments = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .order("asc")
      .collect();

    return comments;
  },
});

export const listEventComments = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const allComments: any[] = [];

    for (const question of questions) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_question", (q) => q.eq("questionId", question._id))
        .collect();

      allComments.push(...comments.map(comment => ({
        ...comment,
        questionContent: question.content,
      })));
    }

    return allComments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addComment = mutation({
  args: {
    questionId: v.id("questions"),
    content: v.string(),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    const now = Date.now();

    if (!user && !args.authorName) {
      throw new Error("Authentication required to comment");
    }

    // Check if event is closed
    const question = await ctx.db.get(args.questionId);
    if (question) {
      const event = await ctx.db.get(question.eventId);
      if (event?.isClosed && !user?.isAdmin) {
        throw new Error("This event is closed");
      }
    }

    const commentId = await ctx.db.insert("comments", {
      questionId: args.questionId,
      content: args.content,
      authorId: user?._id,
      authorName: args.authorName || user?.name || "Anonymous",
      isAdmin: user?.isAdmin === true,
      createdAt: now,
      updatedAt: now,
    });

    return commentId;
  },
});

// ANALYTICS FUNCTIONS

export const getEventAnalytics = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalQuestions = questions.length;
    const visibleQuestions = questions.filter(q => q.isVisible).length;
    const answeredQuestions = questions.filter(q => q.answered).length;
    const totalUpvotes = questions.reduce((sum, q) => sum + q.upvotes, 0);

    const allComments: any[] = [];
    for (const question of questions) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_question", (q) => q.eq("questionId", question._id))
        .collect();
      allComments.push(...comments);
    }

    return {
      totalQuestions,
      visibleQuestions,
      answeredQuestions,
      totalUpvotes,
      totalComments: allComments.length,
      averageUpvotes: totalQuestions > 0 ? Math.round(totalUpvotes / totalQuestions) : 0,
    };
  },
});

// CSV EXPORT FUNCTION

export const exportEventQuestionsCsv = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const csvData = questions.map(question => ({
      id: question._id,
      content: question.content,
      author: question.authorName || "Anonymous",
      upvotes: question.upvotes,
      answered: question.answered ? "Yes" : "No",
      answer: question.answer || "",
      answeredBy: question.answeredBy || "",
      visible: question.isVisible ? "Yes" : "No",
      createdAt: new Date(question.createdAt).toISOString(),
      updatedAt: new Date(question.updatedAt).toISOString(),
    }));

    return csvData;
  },
});
