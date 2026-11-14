import { defineApp } from "convex/server";
import { v } from "convex/values";
import auth from "@convex-dev/auth/convex.config.js";
import authPassword from "@convex-dev/auth/components/password/convex.config.js";
import authUsername from "@convex-dev/auth/components/username/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp({
  // The static site owns the root of the .convex.site URL; any app HTTP
  // routes added later in convex/http.ts are served under /api.
  httpPrefix: "/api",
  env: {
    // Comma-separated usernames that get admin access, e.g. "wayne,alex".
    // Set with: npx convex env set ADMIN_USERNAMES "wayne"
    ADMIN_USERNAMES: v.optional(v.string()),
  },
});

app.use(auth);
app.use(authPassword);
app.use(authUsername);
app.use(staticHosting, { httpPrefix: "/" });

export default app;
