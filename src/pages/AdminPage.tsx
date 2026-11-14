import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  PlusIcon,
  TrashIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  ArchiveIcon,
  Pencil1Icon,
  LockClosedIcon,
  LockOpen1Icon,
  DownloadIcon,
  ChevronUpIcon,
  CheckIcon,
  CopyIcon,
} from "@radix-ui/react-icons";

function downloadFile(content: string, filename: string, type: string) {
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(new Blob([content], { type })));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Hoisted outside AdminPage to prevent re-mount on every render
interface EventFormProps {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  date: string; setDate: (v: string) => void;
  openDate: string; setOpenDate: (v: string) => void;
  closeDate: string; setCloseDate: (v: string) => void;
  closedMessage: string; setClosedMessage: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  onCancel?: () => void;
}

function EventForm({
  title, setTitle, description, setDescription,
  date, setDate, openDate, setOpenDate,
  closeDate, setCloseDate, closedMessage, setClosedMessage,
  onSubmit, submitLabel, onCancel,
}: EventFormProps) {
  const inputStyle = { background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)", color: "var(--cvx-text)" };
  const labelStyle = { color: "var(--cvx-text-secondary)" };
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Event Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all" style={inputStyle} placeholder="Enter event title" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Description *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all resize-none" style={inputStyle} placeholder="Describe your AMA event" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Event Date (Optional)</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all" style={inputStyle} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Questions Open Date (Optional)</label>
          <input type="datetime-local" value={openDate} onChange={(e) => setOpenDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all" style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Questions Close Date (Optional)</label>
          <input type="datetime-local" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all" style={inputStyle} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Closed Message (Optional)</label>
        <input type="text" value={closedMessage} onChange={(e) => setClosedMessage(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all" style={inputStyle} placeholder="Message to show when event is closed" />
      </div>
      <div className={onCancel ? "flex space-x-3" : ""}>
        {onCancel && (
          <button onClick={onCancel} type="button" className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors" style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={!title.trim() || !description.trim()} className={`${onCancel ? "flex-1" : "w-full"} px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed`} style={{ background: "var(--cvx-red)" }}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// Live feed — all questions across all events
function LiveFeed({ events }: { events: any[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const allEventQuestions = events.map(event => ({
    event,
    questions: useQuery(api.functions.listQuestionsForAdmin, { eventId: event._id }),
  }));

  const isLoading = allEventQuestions.some(e => e.questions === undefined);

  const allQuestions = allEventQuestions
    .flatMap(({ event, questions }) =>
      (questions || []).map(q => ({ ...q, eventTitle: event.title }))
    )
    .filter(q => selectedEventId === "all" || q.eventId === selectedEventId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleExportMarkdown = () => {
    if (allQuestions.length === 0) { toast.error("No questions to export"); return; }
    const byEvent: Record<string, typeof allQuestions> = {};
    allQuestions.forEach(q => {
      if (!byEvent[q.eventTitle]) byEvent[q.eventTitle] = [];
      byEvent[q.eventTitle].push(q);
    });
    let md = `# Convex AMA — All Questions\n\n_Exported: ${new Date().toLocaleString()}_\n\n**Total questions:** ${allQuestions.length}\n\n---\n\n`;
    Object.entries(byEvent).forEach(([eventTitle, qs]) => {
      md += `# ${eventTitle}\n\n`;
      [...qs].sort((a, b) => b.upvotes - a.upvotes).forEach((q, i) => {
        md += `## ${i + 1}. ${q.content}\n\n`;
        md += `- **Author:** ${q.authorName || "Anonymous"}\n- **Upvotes:** ${q.upvotes}\n- **Status:** ${q.answered ? "✅ Answered" : "⏳ Unanswered"}\n- **Visible:** ${q.isVisible ? "Yes" : "No"}\n- **Submitted:** ${new Date(q.createdAt).toLocaleString()}\n`;
        if (q.answered && q.answer) {
          md += `\n**Answer:**\n\n> ${q.answer}\n`;
          if (q.answeredBy) md += `>\n> — *${q.answeredBy}*\n`;
        }
        md += `\n---\n\n`;
      });
    });
    downloadFile(md, `convex-ama-all-questions-${Date.now()}.md`, "text/markdown;charset=utf-8;");
    toast.success("Markdown exported!");
  };

  const handleExportCleanMarkdown = () => {
    if (allQuestions.length === 0) { toast.error("No questions to export"); return; }
    const byEvent: Record<string, typeof allQuestions> = {};
    allQuestions.forEach(q => {
      if (!byEvent[q.eventTitle]) byEvent[q.eventTitle] = [];
      byEvent[q.eventTitle].push(q);
    });
    let md = `# Convex AMA — All Questions\n\n`;
    Object.entries(byEvent).forEach(([eventTitle, qs]) => {
      md += `# ${eventTitle}\n\n`;
      [...qs].sort((a, b) => b.upvotes - a.upvotes).forEach((q, i) => {
        md += `${i + 1}. ${q.content}\n`;
        if (q.answered && q.answer) md += `   > ${q.answer}\n`;
        md += `\n`;
      });
    });
    downloadFile(md, `convex-ama-all-questions-clean-${Date.now()}.md`, "text/markdown;charset=utf-8;");
    toast.success("Clean markdown exported!");
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--cvx-text-secondary)" }}>Filter by event:</span>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)", color: "var(--cvx-text)" }}
          >
            <option value="all">All Events ({allQuestions.length} questions)</option>
            {events.map(ev => {
              const count = allEventQuestions.find(e => e.event._id === ev._id)?.questions?.length || 0;
              return <option key={ev._id} value={ev._id}>{ev.title} ({count})</option>;
            })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportMarkdown} className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors" style={{ background: "var(--cvx-bg-secondary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}>
            <DownloadIcon className="w-3.5 h-3.5" /><span>Export MD</span>
          </button>
          <button onClick={handleExportCleanMarkdown} className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors" style={{ background: "var(--cvx-bg-secondary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}>
            <DownloadIcon className="w-3.5 h-3.5" /><span>Export Clean MD</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
        </div>
      ) : allQuestions.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ color: "var(--cvx-text-secondary)" }}>No questions submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allQuestions.map(question => (
            <div key={question._id} className="rounded-xl p-4" style={{ background: question.isVisible ? "var(--cvx-bg-secondary)" : "var(--cvx-bg-primary)", border: "1px solid var(--cvx-border)", opacity: question.isVisible ? 1 : 0.75 }}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center space-y-0.5 pt-0.5 flex-shrink-0">
                  <ChevronUpIcon className="w-4 h-4" style={{ color: "var(--cvx-text-secondary)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--cvx-text)" }}>{question.upvotes}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: "var(--cvx-text)" }}>{question.authorName || "Anonymous"}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(63,82,149,0.1)", color: "rgb(63,82,149)" }}>{question.eventTitle}</span>
                    {question.answered && (
                      <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(79,176,20,0.12)", color: "rgb(79,176,20)" }}>
                        <CheckIcon className="w-3 h-3" /><span>Answered</span>
                      </span>
                    )}
                    {!question.isVisible && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--cvx-bg-tertiary)", color: "var(--cvx-text-secondary)" }}>Hidden</span>
                    )}
                  </div>
                  <p className="text-sm mb-1.5" style={{ color: "var(--cvx-text)" }}>{question.content}</p>
                  {question.answered && question.answer && (
                    <div className="rounded-lg p-2.5 mb-1.5 text-sm" style={{ background: "rgba(79,176,20,0.08)", borderLeft: "3px solid rgb(79,176,20)", color: "var(--cvx-text)" }}>
                      <span className="font-semibold text-xs">Answer: </span>{question.answer}
                      {question.answeredBy && <span className="text-xs ml-1" style={{ color: "var(--cvx-text-secondary)" }}>— {question.answeredBy}</span>}
                    </div>
                  )}
                  <div className="text-xs" style={{ color: "var(--cvx-text-secondary)" }}>{new Date(question.createdAt).toLocaleString()}</div>
                </div>
                <Link to={`/admin/event/${encodeURIComponent(question.eventTitle)}`} className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-colors hover:opacity-70" style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}>
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"events" | "create" | "feed">("events");
  const [showDeleteModal, setShowDeleteModal] = useState<Id<"events"> | null>(null);
  const [showEditModal, setShowEditModal] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closedMessage, setClosedMessage] = useState("");

  const user = useQuery(api.auth.loggedInUser);
  const events = useQuery(
    api.functions.listAllEventsForAdmin,
    user?.isAdmin ? {} : "skip"
  );
  const createEvent = useMutation(api.functions.createEvent);
  const updateEvent = useMutation(api.functions.updateEvent);
  const deleteEvent = useMutation(api.functions.deleteEvent);
  const toggleEventStatus = useMutation(api.functions.toggleEventStatus);
  const toggleEventClosed = useMutation(api.functions.toggleEventClosed);
  const toggleEventArchive = useMutation(api.functions.toggleEventArchive);
  const duplicateEvent = useMutation(api.functions.duplicateEvent);

  useEffect(() => {
    if (showEditModal) {
      setTitle(showEditModal.title);
      setDescription(showEditModal.description);
      setDate(showEditModal.date ? showEditModal.date.split('T')[0] : "");
      setOpenDate(showEditModal.openDate || "");
      setCloseDate(showEditModal.closeDate || "");
      setClosedMessage(showEditModal.closedMessage || "");
    } else {
      setTitle(""); setDescription(""); setDate(""); setOpenDate(""); setCloseDate(""); setClosedMessage("");
    }
  }, [showEditModal]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    try {
      await createEvent({
        title: title.trim(), description: description.trim(),
        date: date ? date + "T00:00:00.000Z" : undefined,
        openDate: openDate || undefined, closeDate: closeDate || undefined,
        closedMessage: closedMessage.trim() || undefined,
      });
      toast.success("Event created successfully!");
      setActiveTab("events");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !title.trim() || !description.trim()) return;
    try {
      await updateEvent({
        eventId: showEditModal._id, title: title.trim(), description: description.trim(),
        date: date ? date + "T00:00:00.000Z" : undefined,
        openDate: openDate || undefined, closeDate: closeDate || undefined,
        closedMessage: closedMessage.trim() || undefined,
      });
      toast.success("Event updated successfully!");
      setShowEditModal(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: Id<"events">) => {
    try { await deleteEvent({ eventId }); toast.success("Event deleted!"); setShowDeleteModal(null); }
    catch { toast.error("Failed to delete event"); }
  };

  const handleToggleStatus = async (eventId: Id<"events">) => {
    try { await toggleEventStatus({ eventId }); toast.success("Event status updated!"); }
    catch { toast.error("Failed to update event status"); }
  };

  const handleToggleClosed = async (eventId: Id<"events">, currentlyClosed: boolean) => {
    try { await toggleEventClosed({ eventId }); toast.success(currentlyClosed ? "Event reopened!" : "Event closed!"); }
    catch { toast.error("Failed to update event"); }
  };

  const handleDuplicateEvent = async (eventId: Id<"events">) => {
    try {
      const copy = await duplicateEvent({ eventId });
      toast.success("Event duplicated. It stays inactive until you turn it on.");
      // Open the copy straight away so it can be renamed.
      if (copy) setShowEditModal(copy);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate event");
    }
  };

  const handleToggleArchive = async (eventId: Id<"events">) => {
    try { await toggleEventArchive({ eventId }); toast.success("Event archive status updated!"); }
    catch { toast.error("Failed to update archive status"); }
  };

  if (user !== undefined && !user?.isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--cvx-text)" }}>Access Denied</h1>
          <p style={{ color: "var(--cvx-text-secondary)" }}>You need admin access to view this page.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium" style={{ color: "var(--cvx-red)" }}>← Back to Events</Link>
        </div>
      </div>
    );
  }

  if (events === undefined || user === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
        </div>
      </div>
    );
  }

  const formProps = { title, setTitle, description, setDescription, date, setDate, openDate, setOpenDate, closeDate, setCloseDate, closedMessage, setClosedMessage };

  const tabs = [
    { id: "events" as const, label: "Event Management" },
    { id: "feed" as const, label: "Live Feed" },
    { id: "create" as const, label: "Create New Event" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1" style={{ color: "var(--cvx-text)" }}>Admin Dashboard</h1>
        <p style={{ color: "var(--cvx-text-secondary)" }}>Manage your AMA events and questions</p>
      </div>

      {/* Tabs */}
      <div className="mb-8" style={{ borderBottom: "1px solid var(--cvx-border)" }}>
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
              style={{ borderColor: activeTab === tab.id ? "var(--cvx-red)" : "transparent", color: activeTab === tab.id ? "var(--cvx-red)" : "var(--cvx-text-secondary)" }}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Event Management Tab */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="mb-4" style={{ color: "var(--cvx-text-secondary)" }}>No events created yet.</p>
              <button onClick={() => setActiveTab("create")} className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--cvx-red)" }}>
                <PlusIcon className="w-4 h-4" /><span>Create Your First Event</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event._id} className="rounded-xl p-5" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="text-lg font-bold" style={{ color: "var(--cvx-text)" }}>{event.title}</h3>
                        {event.isActive && !event.isClosed ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(79,176,20,0.12)", color: "rgb(79,176,20)" }}>Active</span>
                        ) : event.isClosed ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(238,52,47,0.1)", color: "var(--cvx-red)" }}>Closed</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--cvx-bg-tertiary)", color: "var(--cvx-text-secondary)" }}>Inactive</span>
                        )}
                        {event.archived && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(243,176,28,0.15)", color: "rgb(180,130,0)" }}>Archived</span>}
                      </div>
                      <p className="text-sm mb-3" style={{ color: "var(--cvx-text-secondary)" }}>{event.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
                        {event.date && <span><span className="font-medium">Date: </span>{new Date(event.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>}
                        <span><span className="font-medium">Created: </span>{new Date(event.createdAt).toLocaleDateString()}</span>
                        {event.adminName && <span><span className="font-medium">Host: </span>{event.adminName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                      <Link to={`/admin/event/${encodeURIComponent(event.title)}`} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)" }}>Manage</Link>
                      <button onClick={() => setShowEditModal(event)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--cvx-text-secondary)" }} title="Edit"><Pencil1Icon className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicateEvent(event._id)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--cvx-text-secondary)" }} title="Duplicate" aria-label="Duplicate event"><CopyIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleStatus(event._id)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--cvx-text-secondary)" }} title={event.isActive ? "Deactivate" : "Activate"}>
                        {event.isActive ? <EyeClosedIcon className="w-4 h-4" /> : <EyeOpenIcon className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleToggleClosed(event._id, !!event.isClosed)} className="p-2 rounded-lg hover:opacity-70" style={{ color: event.isClosed ? "var(--cvx-red)" : "var(--cvx-text-secondary)" }} title={event.isClosed ? "Reopen" : "Close"}>
                        {event.isClosed ? <LockOpen1Icon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleToggleArchive(event._id)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--cvx-text-secondary)" }} title={event.archived ? "Unarchive" : "Archive"}><ArchiveIcon className="w-4 h-4" /></button>
                      <button onClick={() => setShowDeleteModal(event._id)} className="p-2 rounded-lg hover:opacity-70" style={{ color: "var(--cvx-red)" }} title="Delete"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Feed Tab */}
      {activeTab === "feed" && <LiveFeed events={events} />}

      {/* Create Tab */}
      {activeTab === "create" && (
        <div className="max-w-2xl">
          <EventForm {...formProps} onSubmit={handleCreateEvent} submitLabel="Create Event" />
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: "var(--cvx-bg-secondary)" }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: "var(--cvx-text)" }}>Edit Event</h3>
            <EventForm {...formProps} onSubmit={handleUpdateEvent} submitLabel="Save Changes" onCancel={() => setShowEditModal(null)} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "var(--cvx-bg-secondary)" }}>
            <h3 className="text-lg font-bold mb-3" style={{ color: "var(--cvx-text)" }}>Delete Event</h3>
            <p className="text-sm mb-6" style={{ color: "var(--cvx-text-secondary)" }}>
              Are you sure you want to delete this event? This will permanently delete all questions and comments. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}>Cancel</button>
              <button onClick={() => handleDeleteEvent(showDeleteModal)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--cvx-red)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
