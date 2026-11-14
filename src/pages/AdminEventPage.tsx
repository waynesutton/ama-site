import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ChevronUpIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon as ChevronUpIconCollapse,
  DownloadIcon
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

function buildMarkdown(title: string, questions: any[]): string {
  const sorted = [...questions].filter(q => q.isVisible).sort((a, b) => b.upvotes - a.upvotes);
  let md = `# ${title} — Questions\n\n_Exported: ${new Date().toLocaleString()}_\n\n`;
  md += `**Total visible questions:** ${sorted.length}\n\n---\n\n`;
  sorted.forEach((q, i) => {
    md += `## ${i + 1}. ${q.content}\n\n`;
    md += `- **Author:** ${q.authorName || "Anonymous"}\n`;
    md += `- **Upvotes:** ${q.upvotes}\n`;
    md += `- **Status:** ${q.answered ? "✅ Answered" : "⏳ Unanswered"}\n`;
    md += `- **Submitted:** ${new Date(q.createdAt).toLocaleString()}\n`;
    if (q.answered && q.answer) {
      md += `\n**Answer:**\n\n> ${q.answer}\n`;
      if (q.answeredBy) md += `>\n> — *${q.answeredBy}*\n`;
    }
    md += `\n---\n\n`;
  });
  return md;
}

function buildCleanMarkdown(title: string, questions: any[]): string {
  const sorted = [...questions].filter(q => q.isVisible).sort((a, b) => b.upvotes - a.upvotes);
  let md = `# ${title}\n\n`;
  sorted.forEach((q, i) => {
    md += `${i + 1}. ${q.content}\n`;
    if (q.answered && q.answer) md += `   > ${q.answer}\n`;
    md += `\n`;
  });
  return md;
}

export default function AdminEventPage() {
  const { title } = useParams<{ title: string }>();
  const [selectedQuestions, setSelectedQuestions] = useState<Set<Id<"questions">>>(new Set());
  const [answerBoxes, setAnswerBoxes] = useState<Record<string, string>>({});
  const [showAnswerBox, setShowAnswerBox] = useState<Record<string, boolean>>({});

  const user = useQuery(api.auth.loggedInUser);
  const isUserAdmin = user?.isAdmin;

  const event = useQuery(
    api.functions.getEventByTitle,
    title && isUserAdmin ? { title: decodeURIComponent(title) } : "skip"
  );
  const questions = useQuery(
    api.functions.listQuestionsForAdmin,
    event && isUserAdmin ? { eventId: event._id } : "skip"
  );
  const analytics = useQuery(
    api.functions.getEventAnalytics,
    event && isUserAdmin ? { eventId: event._id } : "skip"
  );

  const toggleQuestionVisibility = useMutation(api.functions.toggleQuestionVisibility);
  const deleteQuestion = useMutation(api.functions.deleteQuestion);
  const markQuestionAnswered = useMutation(api.functions.markQuestionAnswered);
  const markQuestionAsAnswered = useMutation(api.functions.markQuestionAsAnswered);
  const bulkToggleVisibility = useMutation(api.functions.bulkToggleVisibility);
  const bulkDeleteQuestions = useMutation(api.functions.bulkDeleteQuestions);
  const exportCsv = useQuery(
    api.functions.exportEventQuestionsCsv,
    event && isUserAdmin ? { eventId: event._id } : "skip"
  );

  const handleSelectQuestion = (questionId: Id<"questions">) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuestions.size === questions?.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions?.map(q => q._id) || []));
    }
  };

  const handleToggleVisibility = async (questionId: Id<"questions">) => {
    try {
      await toggleQuestionVisibility({ questionId });
      toast.success("Question visibility updated!");
    } catch (error) {
      toast.error("Failed to update visibility");
    }
  };

  const handleDeleteQuestion = async (questionId: Id<"questions">) => {
    try {
      await deleteQuestion({ questionId });
      toast.success("Question deleted!");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const handleAnswerQuestion = async (questionId: Id<"questions">, withAnswer: boolean = false) => {
    try {
      if (withAnswer) {
        const answer = answerBoxes[questionId];
        if (!answer?.trim()) { toast.error("Please enter an answer"); return; }
        await markQuestionAnswered({ questionId, answer: answer.trim() });
      } else {
        await markQuestionAsAnswered({ questionId });
      }
      setAnswerBoxes(prev => ({ ...prev, [questionId]: "" }));
      setShowAnswerBox(prev => ({ ...prev, [questionId]: false }));
      toast.success("Question marked as answered!");
    } catch (error) {
      toast.error("Failed to mark question as answered");
    }
  };

  const handleBulkToggleVisibility = async () => {
    if (selectedQuestions.size === 0) return;
    try {
      await bulkToggleVisibility({ questionIds: Array.from(selectedQuestions) });
      setSelectedQuestions(new Set());
      toast.success("Questions visibility updated!");
    } catch (error) {
      toast.error("Failed to update questions visibility");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.size === 0) return;
    if (!confirm(`Delete ${selectedQuestions.size} questions? This cannot be undone.`)) return;
    try {
      await bulkDeleteQuestions({ questionIds: Array.from(selectedQuestions) });
      setSelectedQuestions(new Set());
      toast.success("Questions deleted!");
    } catch (error) {
      toast.error("Failed to delete questions");
    }
  };

  const handleExportCsv = () => {
    if (!exportCsv || exportCsv.length === 0) { toast.error("No data to export"); return; }
    const headers = ["ID", "Content", "Author", "Upvotes", "Answered", "Answer", "Answered By", "Visible", "Created At", "Updated At"];
    const rows = exportCsv.map(row => [
      row.id,
      `"${row.content.replace(/"/g, '""')}"`,
      `"${row.author.replace(/"/g, '""')}"`,
      row.upvotes, row.answered,
      `"${row.answer.replace(/"/g, '""')}"`,
      `"${row.answeredBy.replace(/"/g, '""')}"`,
      row.visible, row.createdAt, row.updatedAt
    ].join(","));
    downloadFile([headers.join(","), ...rows].join("\n"), `${event?.title || 'event'}-questions.csv`, "text/csv;charset=utf-8;");
    toast.success("CSV exported!");
  };

  const handleExportMarkdown = () => {
    if (!questions || questions.length === 0) { toast.error("No questions to export"); return; }
    const md = buildMarkdown(event?.title || "Event", questions);
    const slug = (event?.title || "event").replace(/\s+/g, '-').toLowerCase();
    downloadFile(md, `${slug}-questions.md`, "text/markdown;charset=utf-8;");
    toast.success("Markdown exported!");
  };

  const handleExportCleanMarkdown = () => {
    if (!questions || questions.length === 0) { toast.error("No questions to export"); return; }
    const md = buildCleanMarkdown(event?.title || "Event", questions);
    const slug = (event?.title || "event").replace(/\s+/g, '-').toLowerCase();
    downloadFile(md, `${slug}-questions-clean.md`, "text/markdown;charset=utf-8;");
    toast.success("Clean markdown exported!");
  };

  if (user !== undefined && !isUserAdmin) {
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

  if (event === undefined || questions === undefined || user === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--cvx-text)" }}>Event Not Found</h1>
          <p style={{ color: "var(--cvx-text-secondary)" }}>The event you're looking for doesn't exist.</p>
          <Link to="/admin" className="mt-4 inline-block text-sm font-medium" style={{ color: "var(--cvx-red)" }}>← Back to Admin Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/admin" className="text-sm font-medium transition-colors hover:opacity-70 mb-4 inline-block" style={{ color: "var(--cvx-text-secondary)" }}>
          ← Back to Admin Dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-1" style={{ color: "var(--cvx-text)" }}>{event.title}</h1>
        <p style={{ color: "var(--cvx-text-secondary)" }}>Moderate questions and manage responses</p>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Total", value: analytics.totalQuestions },
            { label: "Visible", value: analytics.visibleQuestions },
            { label: "Answered", value: analytics.answeredQuestions },
            { label: "Upvotes", value: analytics.totalUpvotes },
            { label: "Comments", value: analytics.totalComments },
            { label: "Avg Votes", value: analytics.averageUpvotes },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--cvx-text)" }}>{value}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: "var(--cvx-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {questions.length > 0 && (
        <div className="rounded-xl p-4 mb-5" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedQuestions.size === questions.length && questions.length > 0}
                onChange={handleSelectAll}
                className="rounded"
                style={{ accentColor: "var(--cvx-red)" }}
              />
              <span className="text-sm font-medium" style={{ color: "var(--cvx-text)" }}>
                Select All ({selectedQuestions.size} selected)
              </span>
            </label>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export MD</span>
              </button>
              <button
                onClick={handleExportCleanMarkdown}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Export Clean MD</span>
              </button>

              {selectedQuestions.size > 0 && (
                <>
                  <button
                    onClick={handleBulkToggleVisibility}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}
                  >
                    Toggle Visibility
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-white"
                    style={{ background: "var(--cvx-red)" }}
                  >
                    Delete Selected
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: "var(--cvx-text-secondary)" }}>No questions submitted yet.</p>
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question._id}
              className="rounded-xl p-4"
              style={{
                background: question.isVisible ? "var(--cvx-bg-secondary)" : "var(--cvx-bg-primary)",
                border: "1px solid var(--cvx-border)",
                opacity: question.isVisible ? 1 : 0.7,
              }}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={selectedQuestions.has(question._id)}
                  onChange={() => handleSelectQuestion(question._id)}
                  className="mt-1 rounded"
                  style={{ accentColor: "var(--cvx-red)" }}
                />

                <div className="flex flex-col items-center space-y-0.5 pt-0.5">
                  <ChevronUpIcon className="w-4 h-4" style={{ color: "var(--cvx-text-secondary)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--cvx-text)" }}>{question.upvotes}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <span className="font-semibold text-sm" style={{ color: "var(--cvx-text)" }}>
                      {question.authorName || "Anonymous"}
                    </span>
                    {question.answered && (
                      <span className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(79,176,20,0.12)", color: "rgb(79,176,20)" }}>
                        <CheckIcon className="w-3 h-3" /><span>Answered</span>
                      </span>
                    )}
                    {!question.isVisible && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--cvx-bg-tertiary)", color: "var(--cvx-text-secondary)" }}>
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="text-sm mb-2" style={{ color: "var(--cvx-text)", fontFamily: "Inter, sans-serif" }}>
                    {question.content}
                  </p>

                  {question.answered && question.answer && (
                    <div className="rounded-lg p-3 mb-2" style={{ background: "rgba(79,176,20,0.08)", borderLeft: "3px solid rgb(79,176,20)" }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--cvx-text)" }}>Answer:</p>
                      <p className="text-sm" style={{ color: "var(--cvx-text)" }}>{question.answer}</p>
                      {question.answeredBy && (
                        <p className="text-xs mt-1" style={{ color: "var(--cvx-text-secondary)" }}>— {question.answeredBy}</p>
                      )}
                    </div>
                  )}

                  {showAnswerBox[question._id] && (
                    <div className="rounded-lg p-3 mb-2" style={{ background: "rgba(63,82,149,0.08)", border: "1px solid rgba(63,82,149,0.2)" }}>
                      <textarea
                        value={answerBoxes[question._id] || ""}
                        onChange={(e) => setAnswerBoxes(prev => ({ ...prev, [question._id]: e.target.value }))}
                        placeholder="Enter your answer..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)", color: "var(--cvx-text)" }}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleAnswerQuestion(question._id, true)}
                          disabled={!answerBoxes[question._id]?.trim()}
                          className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "rgb(79,176,20)" }}
                        >
                          Submit Answer
                        </button>
                        <button
                          onClick={() => setShowAnswerBox(prev => ({ ...prev, [question._id]: false }))}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                          style={{ background: "var(--cvx-bg-primary)", color: "var(--cvx-text)", border: "1px solid var(--cvx-border)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
                    {new Date(question.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  {!question.answered && (
                    <>
                      <button
                        onClick={() => setShowAnswerBox(prev => ({ ...prev, [question._id]: !prev[question._id] }))}
                        className="p-2 rounded-lg transition-colors hover:opacity-70"
                        style={{ color: "var(--cvx-accent)" }}
                        title="Answer with response"
                      >
                        {showAnswerBox[question._id] ? <ChevronUpIconCollapse className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAnswerQuestion(question._id, false)}
                        className="p-2 rounded-lg transition-colors hover:opacity-70"
                        style={{ color: "rgb(79,176,20)" }}
                        title="Mark as answered"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleToggleVisibility(question._id)}
                    className="p-2 rounded-lg transition-colors hover:opacity-70"
                    style={{ color: "var(--cvx-text-secondary)" }}
                    title={question.isVisible ? "Hide question" : "Show question"}
                  >
                    {question.isVisible ? <EyeClosedIcon className="w-4 h-4" /> : <EyeOpenIcon className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteQuestion(question._id)}
                    className="p-2 rounded-lg transition-colors hover:opacity-70"
                    style={{ color: "var(--cvx-red)" }}
                    title="Delete question"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
