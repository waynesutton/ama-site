import {
  useSignInWithUsernamePassword,
  useSignUpWithUsernamePassword,
} from "@convex-dev/auth/methods/username-password/react";
import { DEFAULT_MIN_PASSWORD_LENGTH } from "@convex-dev/auth/methods/username-password";
import { useState } from "react";
import { api } from "../convex/_generated/api";

type Flow = "signIn" | "signUp";

export function SignInForm() {
  const { signIn, pending: signInPending } = useSignInWithUsernamePassword(api.auth);
  const { signUp, pending: signUpPending } = useSignUpWithUsernamePassword(api.auth);
  const [flow, setFlow] = useState<Flow>("signIn");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = signInPending || signUpPending;

  async function handleSignIn() {
    const result = await signIn({ username, password });
    if (result.status === "complete") return;
    switch (result.userError.error) {
      case "USER_NOT_FOUND":
        return setError("No account with that username. Sign up instead?");
      case "INVALID_CREDENTIALS":
        return setError("Incorrect username or password.");
      case "PASSWORD_TOO_SHORT":
        return setError(`Password must be at least ${result.userError.minimumLength} characters.`);
      case "PASSWORD_TOO_LONG":
        return setError(`Password must be at most ${result.userError.maximumLength} characters.`);
      case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
        return setError("Password can't start or end with whitespace.");
      case "RATE_LIMITED":
        return setError(
          `Too many attempts. Try again in ${Math.ceil(result.userError.retryAfterMs / 1000)} seconds.`,
        );
      case "OTHER_ERROR":
        console.error("Sign-in failed:", result.userError.cause);
        return setError("Something went wrong. Please try again.");
      default:
        result.userError satisfies never;
        return setError("Something went wrong. Please try again.");
    }
  }

  async function handleSignUp() {
    const result = await signUp({ username, password });
    if (result.status === "complete") return;
    switch (result.userError.error) {
      case "USERNAME_TAKEN":
        return setError("That username is already taken.");
      case "USERNAME_TOO_SHORT":
        return setError(`Username must be at least ${result.userError.minimumLength} characters.`);
      case "USERNAME_TOO_LONG":
        return setError(`Username must be at most ${result.userError.maximumLength} characters.`);
      case "USERNAME_HAS_SURROUNDING_WHITESPACE":
        return setError("Username can't start or end with whitespace.");
      case "USERNAME_HAS_INVALID_CHARACTERS":
        return setError("Username contains characters that aren't allowed.");
      case "PASSWORD_TOO_SHORT":
        return setError(`Password must be at least ${result.userError.minimumLength} characters.`);
      case "PASSWORD_TOO_LONG":
        return setError(`Password must be at most ${result.userError.maximumLength} characters.`);
      case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
        return setError("Password can't start or end with whitespace.");
      case "PASSWORD_TOO_COMMON":
        return setError("That password is too common. Pick a different one.");
      case "OTHER_ERROR":
        console.error("Sign-up failed:", result.userError.cause);
        return setError("Something went wrong. Please try again.");
      default:
        result.userError satisfies never;
        return setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          void (flow === "signIn" ? handleSignIn() : handleSignUp());
        }}
      >
        <input
          // Static ids help password managers.
          id="username"
          name="username"
          className="auth-input-field"
          type="text"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={pending}
        />
        <input
          id="password"
          name="password"
          className="auth-input-field"
          type="password"
          placeholder="Password"
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          minLength={flow === "signUp" ? DEFAULT_MIN_PASSWORD_LENGTH : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
        />
        {error ? (
          <p role="alert" className="text-sm" style={{ color: "var(--cvx-red)" }}>
            {error}
          </p>
        ) : null}
        <button className="auth-button" type="submit" disabled={pending}>
          {flow === "signIn"
            ? pending ? "Signing in…" : "Sign in"
            : pending ? "Creating account…" : "Create account"}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>{flow === "signIn" ? "Don't have an account? " : "Already have an account? "}</span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => {
              setError(null);
              setFlow(flow === "signIn" ? "signUp" : "signIn");
            }}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
    </div>
  );
}
