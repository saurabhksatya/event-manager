"use client";

import { useState, useRef } from "react";

interface AIInsightsProps {
  eventId: string;
}

const EXAMPLE_QUESTIONS = [
  "How many people have checked in so far?",
  "What time did check-ins peak?",
];

export default function AIInsights({ eventId }: AIInsightsProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAi, setIsAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch(`/api/events/${eventId}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setAnswer(data.answer);
      setIsAi(data.isAi);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get insights");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-md shadow-indigo-500/20">
          ✨
        </div>
        <div>
          <div className="font-bold text-base text-slate-900">
            AI Event Insights
          </div>
          <div className="text-xs text-slate-500">
            Ask anything about your event data
          </div>
        </div>
      </div>

      {/* Example questions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
            onClick={() => {
              setQuestion(q);
              ask(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2.5"
      >
        <input
          ref={inputRef}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
          placeholder="Ask a question about this event..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shrink-0 cursor-pointer shadow-sm shadow-indigo-600/30 flex items-center justify-center"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Ask"}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="mt-5 flex items-center gap-3 text-slate-600 text-sm">
          <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          Analyzing event data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Answer */}
      {answer && !loading && (
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm leading-relaxed text-slate-800 whitespace-pre-line">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500">
            {isAi ? (
              <>
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                AI RESPONSE
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                RAW STATS (AI unavailable)
              </>
            )}
          </div>
          {answer}
        </div>
      )}
    </div>
  );
}
