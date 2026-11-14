import { components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { setupConvexAuth } from "@convex-dev/auth/server";
import { setupUsernamePassword } from "@convex-dev/auth/methods/username-password/server";
import { getCurrentUser } from "./users";

const auth = setupConvexAuth({ component: components.auth });
export const { signOut, refreshSession, isAuthenticated } = auth;

export const {
  signUpWithUsernamePassword,
  signInWithUsernamePassword,
  changePassword,
} = setupUsernamePassword(auth, {
  component: components.authPassword,
  usernameComponent: components.authUsername,
}).attachUserCallbacks({ createUser: internal.users.createUser });

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.union(v.string(), v.null()),
      isAdmin: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
