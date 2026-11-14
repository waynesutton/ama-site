import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

function formatEventDate(dateStr: string) {
  // Parse the date string as UTC to avoid timezone offset issues
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function HomePage() {
  const events = useQuery(api.functions.listActiveEvents);

  if (events === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--cvx-text)" }}>No Active Events</h1>
          <p style={{ color: "var(--cvx-text-secondary)" }}>Check back later for upcoming AMA sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--cvx-text)" }}>Active AMA Events</h1>
        <p style={{ color: "var(--cvx-text-secondary)" }}>Join the conversation and ask your questions</p>
      </div>

      <div className={`grid gap-6 ${events.length === 1 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {events.map((event) => (
          <Link
            key={event._id}
            to={`/event/${event.slug}`}
            className="block rounded-xl p-6 transition-all hover:shadow-md"
            style={{
              background: "var(--cvx-bg-secondary)",
              border: "1px solid var(--cvx-border)",
            }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--cvx-text)" }}>{event.title}</h2>
              <p className="text-sm line-clamp-3" style={{ color: "var(--cvx-text-secondary)" }}>{event.description}</p>
            </div>

            {event.date && (
              <div className="mb-4">
                <p className="text-sm" style={{ color: "var(--cvx-text-secondary)" }}>
                  {formatEventDate(event.date)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--cvx-red)" }}>
                {event.isClosed ? "View Questions →" : "Join Event →"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
