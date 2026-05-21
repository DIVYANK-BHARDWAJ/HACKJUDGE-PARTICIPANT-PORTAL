'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Share2, Sparkles } from 'lucide-react';

interface ResultData {
  github_url: string;
  repo_name: string;
  owner: string;
  team_name?: string;
  deployment_link?: string;
  score: number;
  latest_score?: number;
  improved?: boolean;
}

interface ResultTabProps {
  result: ResultData | null;
  submissions: any[];
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function ResultTab({
  result,
  submissions,
  addToast
}: ResultTabProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [animateBars, setAnimateBars] = useState(false);

  // Calculate rank and percentile
  const sorted = [...submissions].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  const rankIndex = result ? sorted.findIndex(s => s.github_url === result.github_url) : -1;
  const rank = rankIndex !== -1 ? rankIndex + 1 : 1;
  const total = submissions.length || 1;
  const percentile = result && total > 1
    ? Math.round(((total - rank) / (total - 1)) * 100)
    : 100;

  // Giant score count-up animation
  useEffect(() => {
    if (!result) return;
    
    setDisplayScore(0);
    const duration = 1500; // 1.5s
    const target = result.score;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing curve (easeOutQuad)
      const ease = progress * (2 - progress);
      const current = parseFloat((target * ease).toFixed(2));
      
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayScore(target);
        setAnimateBars(true);
      }
    };

    requestAnimationFrame(animate);
  }, [result]);

  const handleShare = () => {
    if (!result) return;
    const shareText = `🚀 I just scored ${result.score}/100 on HACK ARENA for my project ${result.repo_name}! Ranked #${rank} out of ${total} submissions. Check it out!`;
    navigator.clipboard.writeText(shareText);
    addToast('Result summary copied to clipboard! Share it with the world.', 'success');
  };

  // If no submission result, show empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full border border-dashed border-[var(--border2)] flex items-center justify-center text-[var(--text3)]">
          🔒
        </div>
        <h3 className="text-xl font-bold text-white uppercase tracking-wider">No Result Data Available</h3>
        <p className="text-sm text-[var(--text2)] max-w-sm">
          Submit your repository on the **Submit** tab to see your comprehensive score breakdown here.
        </p>
      </div>
    );
  }

  // Parameter breakdown calculation (deterministic simulation)
  const base = result.score;
  const categories = [
    { label: 'Innovation & Novelty', val: Math.min(100, Math.max(0, parseFloat((base * 0.95 + 4).toFixed(1)))) },
    { label: 'Code Standards & Quality', val: Math.min(100, Math.max(0, parseFloat((base * 1.02 - 1).toFixed(1)))) },
    { label: 'Impact & Functionality', val: Math.min(100, Math.max(0, parseFloat((base * 0.92 + 6).toFixed(1)))) },
    { label: 'Architecture & Scalability', val: Math.min(100, Math.max(0, parseFloat((base * 0.98 + 2).toFixed(1)))) },
    { label: 'Security & Optimization', val: Math.min(100, Math.max(0, parseFloat((base * 1.05 - 5).toFixed(1)))) },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-6 md:p-8 overflow-hidden shadow-glow">
        {/* Glow Line Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-[var(--cyan)]" />

        <div className="flex flex-col items-center text-center space-y-6">
          <span className="text-xs font-semibold tracking-widest text-[var(--text3)] font-mono-custom uppercase">
            → YOUR SCORE
          </span>

          {/* Giant Score */}
          <div className="relative py-2">
            <span className="text-6xl md:text-8xl font-black font-mono-custom tracking-tighter bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)] bg-clip-text text-transparent">
              {displayScore.toFixed(2)}
            </span>
            <div className="text-xs text-[var(--text2)] font-mono-custom uppercase tracking-wider mt-1">out of 100</div>
            {result.latest_score !== undefined && result.latest_score !== result.score && (
              <div className="text-xs text-[var(--text3)] font-mono-custom mt-2 bg-[var(--surface2)] border border-[var(--border)] px-3 py-1 rounded-full inline-block">
                Latest attempt: <span className="text-white font-bold">{result.latest_score.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Rank Badge */}
          <div className="inline-flex flex-col items-center gap-1.5 px-5 py-2.5 bg-[rgba(124,106,247,0.06)] border border-[rgba(124,106,247,0.25)] rounded-full text-xs md:text-sm text-white select-none">
            <span className="font-bold flex items-center gap-1">
              <Sparkles size={14} className="text-[var(--accent)]" />
              Ranked #{rank} of {total} submissions
            </span>
            {total > 1 && (
              <span className="text-[11px] text-[var(--text2)] font-mono-custom">
                Better than {percentile}% of submissions
              </span>
            )}
          </div>

          {/* Team Name */}
          {result.team_name && (
            <div className="pt-2">
              <span className="text-xs text-[var(--text3)] uppercase block font-mono-custom mb-1">TEAM</span>
              <span className="text-sm font-bold text-white font-mono-custom">{result.team_name}</span>
            </div>
          )}

          {/* Repo Link */}
          <div className="pt-2">
            <span className="text-xs text-[var(--text3)] uppercase block font-mono-custom mb-1">PROJECT PATH</span>
            <a
              href={result.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--cyan)] hover:text-white transition-colors font-mono-custom"
            >
              {result.repo_name}
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Deployment Link */}
          {result.deployment_link && (
            <div className="pt-2">
              <span className="text-xs text-[var(--text3)] uppercase block font-mono-custom mb-1">LIVE DEPLOYMENT</span>
              <a
                href={result.deployment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--lime)] hover:text-white transition-colors font-mono-custom"
              >
                {result.deployment_link.replace(/^https?:\/\//, '')}
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Share CTA */}
          <button
            onClick={handleShare}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] text-white hover:border-[var(--accent)] font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-glow-hover font-mono-custom text-sm"
          >
            <Share2 size={16} />
            SHARE YOUR RESULT
          </button>
        </div>
      </div>

      {/* Category Breakdown (Simulated dynamic sliders) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-6 md:p-8 space-y-5 shadow-glow">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono-custom">
          → EVALUATION CRITERIA BREAKDOWN
        </h4>
        
        <div className="space-y-4">
          {categories.map((cat, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium font-mono-custom">
                <span className="text-[var(--text2)]">{cat.label}</span>
                <span className="text-[var(--accent)] font-bold">{cat.val}</span>
              </div>
              <div className="bg-[var(--surface2)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: animateBars ? `${cat.val}%` : '0%',
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                    boxShadow: '0 0 4px var(--accent)',
                    transitionDelay: `${i * 100}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
