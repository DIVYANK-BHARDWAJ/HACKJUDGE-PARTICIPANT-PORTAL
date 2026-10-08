/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface Submission {
  id: string;
  github_url: string;
  repo_name: string;
  owner: string;
  score: number | string;
  submitted_at?: string;
}

interface LeaderboardTabProps {
  submissions: Submission[];
  userSubmissionUrl: string | null;
  isFrozen: boolean;
  onRefresh: () => Promise<void>;
}

// Deterministic tag assigner for visual diversity
const getCategoryTag = (repoName: string) => {
  const name = repoName.toLowerCase();
  if (name.includes('ai') || name.includes('model') || name.includes('gpt') || name.includes('llm') || name.includes('bot') || name.includes('agent')) {
    return 'AI';
  }
  if (name.includes('data') || name.includes('analytics') || name.includes('db') || name.includes('sql') || name.includes('chart')) {
    return 'Data';
  }
  if (name.includes('mobile') || name.includes('ios') || name.includes('android') || name.includes('app')) {
    return 'Mobile';
  }
  return 'Web';
};

export default function LeaderboardTab({
  submissions,
  userSubmissionUrl,
  isFrozen,
  onRefresh
}: LeaderboardTabProps) {
  const [countdown, setCountdown] = useState(10);
  const [animateBars, setAnimateBars] = useState(false);

  // Sorting submissions by score descending
  const sortedSubmissions = [...submissions].sort((a, b) => {
    return parseFloat(b.score as string) - parseFloat(a.score as string);
  });

  // Countdown timer for automatic refresh
  useEffect(() => {
    if (isFrozen) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRefresh();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFrozen, onRefresh]);

  // Width animation on load
  useEffect(() => {
    const t = setTimeout(() => setAnimateBars(true), 150);
    return () => clearTimeout(t);
  }, []);

  const getRankIndicator = (index: number) => {
    if (index === 0) return { medal: '🥇', color: 'var(--gold)', bg: 'rgba(255, 215, 0, 0.02)', border: '1px solid rgba(255, 215, 0, 0.3)' };
    if (index === 1) return { medal: '🥈', color: 'var(--silver)', bg: 'rgba(192, 192, 216, 0.02)', border: '1px solid rgba(192, 192, 216, 0.3)' };
    if (index === 2) return { medal: '🥉', color: 'var(--bronze)', bg: 'rgba(205, 127, 50, 0.02)', border: '1px solid rgba(205, 127, 50, 0.3)' };
    return { medal: `#${index + 1}`, color: 'var(--text3)', bg: 'transparent', border: '1px solid var(--border)' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner for Frozen State */}
      {isFrozen && (
        <div className="bg-gradient-to-r from-[rgba(255,184,48,0.1)] to-transparent border-l-4 border-[var(--amber)] p-4 rounded-r-lg shadow-glow flex flex-col md:flex-row md:items-center justify-between gap-2 select-none animate-pulse">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Leaderboard Frozen</h4>
            <p className="text-xs text-[var(--text2)]">Standings are currently locked by the administrator. Live updates are suspended.</p>
          </div>
          <span className="text-[10px] font-mono-custom text-[var(--amber)] border border-[rgba(255,184,48,0.3)] bg-[rgba(255,184,48,0.05)] px-2 py-0.5 rounded uppercase self-start md:self-auto">FROZEN</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase">Leaderboard</h2>
          <p className="text-xs text-[var(--text3)] font-mono-custom mt-0.5">STANDINGS AS OF TODAY</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text3)] font-mono-custom">
          {isFrozen ? (
            <span>STANDINGS LOCKED</span>
          ) : (
            <>
              <RefreshCw size={12} className="animate-spin text-[var(--cyan)]" />
              <span>Refreshing in {countdown}s...</span>
            </>
          )}
        </div>
      </div>

      {/* Leaderboard Rows container */}
      <div className="space-y-3.5">
        {sortedSubmissions.length === 0 ? (
          <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-8 space-y-2">
            <p className="text-sm text-[var(--text2)]">The arena is empty. No submissions recorded yet.</p>
            <p className="text-xs text-[var(--text3)] font-mono-custom">Submit your repo URL on the first tab to claim the crown!</p>
          </div>
        ) : (
          sortedSubmissions.map((sub, index) => {
            const rank = getRankIndicator(index);
            const isUserRepo = userSubmissionUrl === sub.github_url;
            const category = getCategoryTag(sub.repo_name);

            // Styling variables override for special rows
            let rowStyle: React.CSSProperties = {};
            let borderClass = 'border-[var(--border)]';
            let bgClass = 'bg-[var(--surface)]';

            if (isUserRepo) {
              rowStyle = { borderLeft: '4px solid var(--accent)' };
              bgClass = 'bg-[rgba(124,106,247,0.04)]';
              borderClass = 'border-[var(--accent)]';
            } else if (index === 0) {
              rowStyle = { borderLeft: '4px solid var(--gold)' };
              bgClass = 'bg-[rgba(255,215,0,0.02)]';
              borderClass = 'border-[rgba(255,215,0,0.4)]';
            } else if (index === 1) {
              rowStyle = { borderLeft: '4px solid var(--silver)' };
              bgClass = 'bg-[rgba(192,192,216,0.02)]';
              borderClass = 'border-[rgba(192,192,216,0.4)]';
            } else if (index === 2) {
              rowStyle = { borderLeft: '4px solid var(--bronze)' };
              bgClass = 'bg-[rgba(205,127,50,0.02)]';
              borderClass = 'border-[rgba(205,127,50,0.4)]';
            }

            // Animation delay calculation for staggered entry
            const delay = `${index * 50}ms`;

            return (
              <div
                key={sub.id}
                style={{
                  ...rowStyle,
                  animationDelay: delay,
                  animationFillMode: 'both'
                }}
                className={`relative ${bgClass} border ${borderClass} rounded-[14px] p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 hover:translate-x-1 hover:border-[var(--border2)] transition-all duration-300 shadow-glow select-none animate-slide-in-left`}
              >
                {/* Left content: Rank + Info */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Rank Badge */}
                  <div 
                    className="w-10 h-10 flex items-center justify-center font-bold rounded-lg font-mono-custom text-sm"
                    style={{
                      backgroundColor: rank.bg,
                      color: rank.color,
                      border: rank.border
                    }}
                  >
                    {rank.medal}
                  </div>

                  {/* Project Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm md:text-base tracking-tight">{sub.repo_name}</span>
                      <span className="text-[10px] font-mono-custom uppercase tracking-wider bg-[var(--surface2)] border border-[var(--border)] text-[var(--text2)] px-2 py-0.5 rounded-full">
                        {category}
                      </span>
                      {isUserRepo && (
                        <span className="text-[10px] font-mono-custom uppercase tracking-wider bg-[rgba(124,106,247,0.15)] border border-[var(--accent)] text-[var(--accent)] px-2 py-0.5 rounded-full animate-pulse">
                          YOU
                        </span>
                      )}
                    </div>
                    <a
                      href={sub.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--text3)] font-mono-custom hover:text-[var(--accent)] transition-colors"
                    >
                      github.com/{sub.owner}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Right content: Score Bar + Score Numbers */}
                <div className="flex items-center justify-between md:justify-end gap-6 grow md:max-w-md">
                  {/* Animated Score Track */}
                  <div className="hidden sm:block grow bg-[var(--surface2)] h-1 rounded-full overflow-hidden border border-[var(--border)]">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animateBars ? `${sub.score}%` : '0%',
                        background: index === 0 ? 'var(--gold)' : index === 1 ? 'var(--silver)' : index === 2 ? 'var(--bronze)' : 'linear-gradient(90deg, var(--accent), var(--cyan))',
                        boxShadow: `0 0 8px ${index === 0 ? 'var(--gold)' : index === 1 ? 'var(--silver)' : index === 2 ? 'var(--bronze)' : 'var(--accent)'}`
                      }}
                    />
                  </div>

                  {/* Score Indicator */}
                  <div className="text-right shrink-0">
                    <div className="text-xl md:text-2xl font-bold font-mono-custom tracking-tight" style={{ color: rank.color || 'var(--text)' }}>
                      {parseFloat(sub.score as string).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono-custom text-[var(--text3)] uppercase">/ 100 PTS</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
