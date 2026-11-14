import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import AdminPage from "./pages/AdminPage";
import AdminEventPage from "./pages/AdminEventPage";
import SignInPage from "./pages/SignInPage";
import { Toaster } from "sonner";

export default function App() {
  return (
    <Router>
        <div className="min-h-screen" style={{ background: "var(--cvx-bg)", fontFamily: "Inter, sans-serif" }}>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/event/:slug" element={<EventPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/event/:title" element={<AdminEventPage />} />
              <Route path="/sign-in" element={<SignInPage />} />
            </Routes>
          </main>
          <footer
            className="py-4 text-center text-sm"
            style={{ borderTop: "1px solid var(--cvx-border)", color: "var(--cvx-text-secondary)" }}
          >
            <a
              href="https://convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:opacity-80"
              style={{ color: "var(--cvx-red)" }}
            >
              Powered by Convex
            </a>
          </footer>
          <Toaster />
        </div>
    </Router>
  );
}
