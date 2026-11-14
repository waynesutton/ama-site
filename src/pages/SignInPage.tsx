import { SignInForm } from "../SignInForm";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

export default function SignInPage() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="max-w-md mx-auto mt-10 rounded-xl p-8"
      style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: "var(--cvx-text)" }}>
        Sign In
      </h1>
      <SignInForm />
    </div>
  );
}
