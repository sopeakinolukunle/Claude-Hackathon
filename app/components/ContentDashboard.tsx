"use client";

import { useState } from "react";
import { GeneratedContent, BrandVoiceAnalysis } from "@/app/types";

interface ContentDashboardProps {
  topic: string;
  industry: string;
  contents: GeneratedContent[];
  brandVoice: BrandVoiceAnalysis | null;
  onRegenerate: () => void;
  onNewContent: () => void;
}

export default function ContentDashboard({
  topic,
  industry,
  contents,
  brandVoice,
  onRegenerate,
  onNewContent
}: ContentDashboardProps) {
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const formatLabels: Record<string, string> = {
    blog: "Blog Post",
    linkedin: "LinkedIn Posts",
    twitter: "Twitter Posts",
    "google-ads": "Google Ads"
  };

  const handleExport = (content: GeneratedContent) => {
    const blob = new Blob([content.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.format}-${topic.slice(0, 20)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConsistencyColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Floating Claude Logo Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${(i * 8.33) % 100}%`,
              top: `${(i * 7) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${15 + (i % 5)}s`
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Generated Content
              </h1>
              <p className="text-gray-600">
                <strong>Topic:</strong> {topic} | <strong>Industry:</strong> {industry}
              </p>
            </div>
            <button
              onClick={onNewContent}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md"
            >
              New Content
            </button>
          </div>

          {brandVoice && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Brand Voice Applied</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-purple-700 font-medium">Tone:</span>
                  <p className="text-purple-900">{brandVoice.tone}</p>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Style:</span>
                  <p className="text-purple-900">{brandVoice.style}</p>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Key Terms:</span>
                  <p className="text-purple-900">{brandVoice.terminology.slice(0, 3).join(", ")}</p>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Structure:</span>
                  <p className="text-purple-900">{brandVoice.structure}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contents.map((content, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {formatLabels[content.format] || content.format}
                  </h2>
                  {content.consistencyScore !== undefined && (
                    <span className={`text-sm font-semibold ${getConsistencyColor(content.consistencyScore)}`}>
                      {content.consistencyScore}% Match
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport(content)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement regenerate for single content
                      onRegenerate();
                    }}
                    disabled={regeneratingIndex === index}
                    className="px-3 py-1 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded transition-all disabled:opacity-50 shadow-md"
                  >
                    {regeneratingIndex === index ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {content.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Footer */}
        <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                {contents.length}
              </div>
              <div className="text-sm text-gray-600">Content Pieces Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                ~60s
              </div>
              <div className="text-sm text-gray-600">Generation Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                17x
              </div>
              <div className="text-sm text-gray-600">Faster Than Manual</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
