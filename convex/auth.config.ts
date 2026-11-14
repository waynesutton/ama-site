import type { AuthConfig } from "convex/server";
import { convexAuthProvider } from "@convex-dev/auth/server";

// The deployment signs its own access tokens, so there are no keys to set.
export default {
  providers: [convexAuthProvider()],
} satisfies AuthConfig;
