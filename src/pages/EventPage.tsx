import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { SignInForm } from "../SignInForm";
import QRCode from "../components/QRCode";
import {
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  CheckIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { toast } from "sonner";

function formatEventDate(dateStr: string) {
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

function getSessionId(): string {
  const key = "cvx_ama_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<"upvotes" | "recent" | "answered">("upvotes");
  const [searchTerm, setSearchTerm] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [sessionId] = useState(() => getSessionId());

  const event = useQuery(api.functions.getEventBySlug, slug ? { slug } : "skip");
  const questions = useQuery(
    api.functions.listQuestions,
    event ? { eventId: event._id, sortBy } : "skip"
  );
  const searchResults = useQuery(
    api.functions.searchQuestionsByText,
    event && searchTerm.trim() ? { eventId: event._id, searchTerm } : "skip"
  );
  const isEventOpen = useQuery(
    api.functions.isEventOpen,
    event ? { eventId: event._id } : "skip"
  );
  const myVotes = useQuery(
    api.functions.getMyVotes,
    event ? { eventId: event._id, sessionId } : "skip"
  );

  const submitQuestion = useMutation(api.functions.submitQuestion);
  const upvoteQuestion = useMutation(api.functions.upvoteQuestion);
  const addComment = useMutation(api.functions.addComment);

  const displayQuestions = searchTerm.trim() ? searchResults : questions;
  const votedSet = new Set(myVotes || []);
  const isClosed = event?.isClosed === true;

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !questionContent.trim()) return;

    try {
      await submitQuestion({
        eventId: event._id,
        content: questionContent.trim(),
        authorName: authorName.trim() || undefined,
      });
      setQuestionContent("");
      setAuthorName("");
      toast.success("Question submitted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit question");
    }
  };

  const handleUpvote = async (questionId: Id<"questions">) => {
    if (isClosed) return;
    if (votedSet.has(questionId)) {
      toast.error("You've already voted on this question");
      return;
    }
    try {
      await upvoteQuestion({ questionId, sessionId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upvote question");
    }
  };

  const toggleComments = (questionId: string) => {
    setShowComments(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  if (event === undefined) {
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
        </div>
      </div>
    );
  }

  const currentUrl = window.location.href;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Closed banner */}
      {isClosed && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
          style={{ background: "rgba(238,52,47,0.08)", border: "1px solid rgba(238,52,47,0.2)", color: "var(--cvx-red)" }}
        >
          <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
          <span>
            This event is closed — questions, votes, and comments are no longer accepted.
            {event.closedMessage ? ` ${event.closedMessage}` : ""}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Questions */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--cvx-text)" }}>{event.title}</h1>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--cvx-text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "var(--cvx-bg-secondary)",
                    border: "1px solid var(--cvx-border)",
                    color: "var(--cvx-text)",
                  }}
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "upvotes" | "recent" | "answered")}
                className="px-4 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--cvx-bg-secondary)",
                  border: "1px solid var(--cvx-border)",
                  color: "var(--cvx-text)",
                }}
              >
                <option value="upvotes">Most Voted</option>
                <option value="recent">Most Recent</option>
                <option value="answered">Answered</option>
              </select>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {displayQuestions === undefined ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--cvx-red)" }}></div>
              </div>
            ) : displayQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: "var(--cvx-text-secondary)" }}>
                  {searchTerm.trim() ? "No questions found matching your search." : "No questions yet. Be the first to ask!"}
                </p>
              </div>
            ) : (
              displayQuestions.map((question) => (
                <QuestionItem
                  key={question._id}
                  question={question}
                  onUpvote={handleUpvote}
                  onToggleComments={toggleComments}
                  showComments={showComments[question._id] || false}
                  hasVoted={votedSet.has(question._id)}
                  isClosed={isClosed}
                  addComment={addComment}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Event Details & Question Form */}
        <div className="space-y-5">
          {/* Event Details */}
          <div className="rounded-xl p-5" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--cvx-text)" }}>Event Details</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: "var(--cvx-text-secondary)" }}>Description</h3>
                <p className="text-sm" style={{ color: "var(--cvx-text)" }}>{event.description}</p>
              </div>

              {event.date && (
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: "var(--cvx-text-secondary)" }}>Date</h3>
                  <p className="text-sm" style={{ color: "var(--cvx-text)" }}>
                    {formatEventDate(event.date)}
                  </p>
                </div>
              )}

              {isClosed && (
                <div className="flex items-center gap-1.5 text-xs font-medium pt-1" style={{ color: "var(--cvx-red)" }}>
                  <LockClosedIcon className="w-3 h-3" />
                  <span>Event Closed</span>
                </div>
              )}
            </div>
          </div>

          {/* Question Form */}
          <div className="rounded-xl p-5" style={{ background: "var(--cvx-bg-secondary)", border: "1px solid var(--cvx-border)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--cvx-text)" }}>Ask a Question</h2>

            {isClosed ? (
              <div className="text-center py-4">
                <LockClosedIcon className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--cvx-text-secondary)" }} />
                <p className="text-sm" style={{ color: "var(--cvx-text-secondary)" }}>
                  This event is closed. No new questions are being accepted.
                </p>
              </div>
            ) : !event.isActive ? (
              <div className="text-center py-4">
                <p className="text-sm mb-2" style={{ color: "var(--cvx-text-secondary)" }}>This event is not currently active.</p>
                {event.closedMessage && (
                  <p className="text-sm" style={{ color: "var(--cvx-text-secondary)" }}>{event.closedMessage}</p>
                )}
              </div>
            ) : isEventOpen === false ? (
              <div className="text-center py-4">
                <p className="text-sm" style={{ color: "var(--cvx-text-secondary)" }}>Question submission is currently closed for this event.</p>
              </div>
            ) : (
              <>
                <Authenticated>
                  <form onSubmit={handleSubmitQuestion} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Your name (optional)"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{
                          background: "var(--cvx-bg-primary)",
                          border: "1px solid var(--cvx-border)",
                          color: "var(--cvx-text)",
                        }}
                      />
                    </div>

                    <div>
                      <textarea
                        placeholder="What would you like to ask?"
                        value={questionContent}
                        onChange={(e) => setQuestionContent(e.target.value)}
                        maxLength={249}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none"
                        style={{
                          background: "var(--cvx-bg-primary)",
                          border: "1px solid var(--cvx-border)",
                          color: "var(--cvx-text)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      />
                      <div className="flex justify-end mt-1">
                        <span className="text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
                          {questionContent.length}/249
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!questionContent.trim() || questionContent.length > 249}
                      className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "var(--cvx-red)" }}
                    >
                      Submit Question
                    </button>
                  </form>
                </Authenticated>

                <Unauthenticated>
                  <div className="text-center py-4">
                    <p className="text-sm mb-4" style={{ color: "var(--cvx-text-secondary)" }}>Sign in to ask a question</p>
                    <SignInForm />
                  </div>
                </Unauthenticated>
              </>
            )}
          </div>

          {/* QR Code */}
          {/* <QRCode url={currentUrl} title={event.title} /> */}
        </div>
      </div>
    </div>
  );
}

interface QuestionItemProps {
  question: any;
  onUpvote: (questionId: Id<"questions">) => void;
  onToggleComments: (questionId: string) => void;
  showComments: boolean;
  hasVoted: boolean;
  isClosed: boolean;
  addComment: any;
}

function QuestionItem({ question, onUpvote, onToggleComments, showComments, hasVoted, isClosed, addComment }: QuestionItemProps) {
  const comments = useQuery(api.functions.listComments, { questionId: question._id });
  const [commentContent, setCommentContent] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || isClosed) return;

    try {
      await addComment({
        questionId: question._id,
        content: commentContent.trim(),
        authorName: commentAuthor.trim() || undefined,
      });
      setCommentContent("");
      setCommentAuthor("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const canVote = !isClosed && !hasVoted;

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: "var(--cvx-bg-secondary)",
        border: "1px solid var(--cvx-border)",
      }}
    >
      <div className="flex items-start space-x-3">
        {/* Upvote Button */}
        <div className="flex flex-col items-center space-y-1 pt-0.5">
          <button
            onClick={() => onUpvote(question._id)}
            disabled={!canVote}
            className="p-1.5 rounded-lg transition-all"
            style={{
              background: hasVoted ? "rgba(238,52,47,0.12)" : "var(--cvx-bg-primary)",
              cursor: canVote ? "pointer" : "default",
              opacity: isClosed ? 0.5 : 1,
            }}
            title={isClosed ? "Event closed" : hasVoted ? "Already voted" : "Upvote"}
          >
            <ChevronUpIcon
              className="w-4 h-4"
              style={{ color: hasVoted ? "var(--cvx-red)" : "var(--cvx-text-secondary)" }}
            />
          </button>
          <span className="text-sm font-bold" style={{ color: "var(--cvx-text)" }}>{question.upvotes}</span>
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="font-semibold text-sm" style={{ color: "var(--cvx-text)" }}>
              {question.authorName || "Anonymous"}
            </span>
            {question.answered && (
              <span
                className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(79, 176, 20, 0.12)", color: "rgb(79, 176, 20)" }}
              >
                <CheckIcon className="w-3 h-3" />
                <span>Answered</span>
              </span>
            )}
          </div>

          <p className="text-sm mb-2" style={{ color: "var(--cvx-text)", fontFamily: "Inter, sans-serif" }}>
            {question.content}
          </p>

          {question.answered && question.answer && (
            <div
              className="rounded-lg p-3 mb-2"
              style={{ background: "rgba(79, 176, 20, 0.08)", borderLeft: "3px solid rgb(79, 176, 20)" }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--cvx-text)" }}>Answer:</p>
              <p className="text-sm" style={{ color: "var(--cvx-text)" }}>{question.answer}</p>
              {question.answeredBy && (
                <p className="text-xs mt-1" style={{ color: "var(--cvx-text-secondary)" }}>— {question.answeredBy}</p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-4 text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
            <span>{new Date(question.createdAt).toLocaleString()}</span>
            <button
              onClick={() => onToggleComments(question._id)}
              className="flex items-center space-x-1 transition-colors hover:opacity-80"
            >
              <ChatBubbleIcon className="w-3 h-3" />
              <span>
                {comments?.length || 0} {comments?.length === 1 ? 'comment' : 'comments'}
              </span>
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-3 space-y-2">
              {comments?.map((comment) => (
                <div
                  key={comment._id}
                  className="rounded-lg p-3"
                  style={{ background: "var(--cvx-bg-primary)" }}
                >
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-xs" style={{ color: "var(--cvx-text)" }}>
                      {comment.authorName}
                    </span>
                    {comment.isAdmin && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "var(--cvx-red)", color: "white" }}
                      >
                        Admin
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--cvx-text-secondary)" }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--cvx-text)" }}>{comment.content}</p>
                </div>
              ))}

              {/* Add Comment Form — hidden when closed */}
              {!isClosed && (
                <form onSubmit={handleAddComment} className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg outline-none"
                    style={{
                      background: "var(--cvx-bg-primary)",
                      border: "1px solid var(--cvx-border)",
                      color: "var(--cvx-text)",
                    }}
                  />
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg outline-none"
                      style={{
                        background: "var(--cvx-bg-primary)",
                        border: "1px solid var(--cvx-border)",
                        color: "var(--cvx-text)",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!commentContent.trim()}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "var(--cvx-red)" }}
                    >
                      Post
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
