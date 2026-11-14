import { internalMutation, env } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Called by Convex Auth the first time it sees a new account. */
export const createUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal("usernamePassword"),
      profile: v.object({}),
    }),
  },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", {});
  },
});

export type CurrentUser = {
  _id: Id<"users">;
  name: string | null;
  isAdmin: boolean;
};

function adminUsernames(): Set<string> {
  return new Set(
    (env.ADMIN_USERNAMES ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );
}

/**
 * The signed-in user, or null. The username lives in the auth username
 * component (the source of truth), so it is read from there, not copied.
 * Admin comes from the row's isAdmin flag or the ADMIN_USERNAMES env var.
 */
export async function getCurrentUser(ctx: QueryCtx): Promise<CurrentUser | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  const user = await ctx.db.get("users", userId);
  if (user === null) {
    return null;
  }
  const name = await ctx.runQuery(components.authUsername.public.getUsername, {
    userId,
  });
  const isAdmin =
    user.isAdmin === true ||
    (name !== null && adminUsernames().has(name.toLowerCase()));
  return { _id: user._id, name, isAdmin };
}
