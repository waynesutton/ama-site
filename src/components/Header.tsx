import { Link } from "react-router-dom";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignOutButton } from "../SignOutButton";
import { api } from "../../convex/_generated/api";

export default function Header() {
  const user = useQuery(api.auth.loggedInUser);
  return (
    <header style={{ borderBottom: "1px solid var(--cvx-border)", background: "var(--cvx-bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-xl font-bold" style={{ color: "var(--cvx-red)" }}>
              Convex AMA
            </Link>
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--cvx-text)" }}
              >
                Events
              </Link>
              <Authenticated>
                {user?.isAdmin ? (
                  <Link
                    to="/admin"
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: "var(--cvx-text)" }}
                  >
                    Admin
                  </Link>
                ) : null}
              </Authenticated>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Authenticated>
              {user?.name ? (
                <span className="text-sm" style={{ color: "var(--cvx-text-secondary)" }}>
                  {user.name}
                </span>
              ) : null}
              <SignOutButton />
            </Authenticated>
            <Unauthenticated>
              <Link
                to="/sign-in"
                className="text-sm font-medium px-3 py-1.5 rounded transition-colors"
                style={{ color: "var(--cvx-text)", background: "var(--cvx-bg-primary)" }}
              >
                Sign In
              </Link>
            </Unauthenticated>
          </div>
        </div>
      </div>
    </header>
  );
}
