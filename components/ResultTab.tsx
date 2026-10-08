/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Share2, Sparkles, Lock } from 'lucide-react';

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
    const shareText = `🚀 I just scored ${result.score}/100 on PROTOCOL X for my project ${result.repo_name}! Ranked #${rank} out of ${total} submissions. Check it out!`;
    navigator.clipboard.writeText(shareText);
    addToast('Result summary copied to clipboard! Share it with the world.', 'success');
  };

  // If no submission result, show empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-[var(--bg-elevated)] clip-chamfer-sm border border-[var(--border-subtle)] flex items-center justify-center text-[var(--red-primary)] shadow-glow">
          <Lock size={24} />
        </div>
        <h3 className="text-xl font-bold font-display text-white tracking-[0.25em] uppercase m-0">NO TRANSMISSION FOUND</h3>
        <p className="text-[10px] md:text-xs font-mono-custom text-[var(--text-muted)] tracking-[0.1em] max-w-sm uppercase">
          SUBMIT YOUR PROTOCOL FIRST TO UNLOCK THE COMPREHENSIVE SCORE BREAKDOWN.
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
      <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 md:p-8 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
        {/* Glow Line Top Accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--red-primary)] shadow-[0_0_10px_var(--red-primary)] opacity-80" />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-full flex items-center justify-center gap-2 mb-2">
            <div className="h-[1px] w-8 bg-[var(--red-primary)] opacity-50" />
            <span className="text-[10px] font-semibold tracking-[0.3em] text-[var(--text-muted)] uppercase">
              [ YOUR RESULT ]
            </span>
            <div className="h-[1px] w-8 bg-[var(--red-primary)] opacity-50" />
          </div>

          {/* Giant Score */}
          <div className="relative py-2">
            <span className="text-6xl md:text-8xl font-black font-display chrome-text tracking-tighter">
              {displayScore.toFixed(2)}
            </span>
            <div className="text-[10px] text-[var(--red-primary)] font-mono-custom uppercase tracking-[0.2em] mt-2">OUT OF 100</div>
            {result.latest_score !== undefined && result.latest_score !== result.score && (
              <div className="text-[9px] text-[var(--text-muted)] font-mono-custom mt-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] clip-chamfer-sm px-3 py-1.5 inline-block uppercase tracking-wider">
                LATEST ATTEMPT: <span className="text-white font-bold">{result.latest_score.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Rank Badge */}
          <div className="inline-flex flex-col items-center gap-1.5 px-6 py-3 bg-[rgba(255,30,30,0.05)] border border-[var(--border-red)] clip-chamfer-sm text-[10px] md:text-xs text-white select-none shadow-[0_0_10px_rgba(255,30,30,0.1)]">
            <span className="font-bold font-mono-custom tracking-[0.1em] flex items-center gap-2 uppercase">
              <Sparkles size={14} className="text-[var(--red-primary)]" />
              RANKED #{rank} OF {total}
            </span>
            {total > 1 && (
              <span className="text-[9px] text-[var(--chrome-low)] font-mono-custom uppercase tracking-wider">
                BETTER THAN {percentile}% OF PROTOCOLS
              </span>
            )}
          </div>

          <div className="w-full h-[1px] bg-[var(--border-subtle)] my-2" />

          {/* Name */}
          {result.team_name && (
            <div className="w-full flex flex-col items-center">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block font-mono-custom mb-1 tracking-[0.2em]">OPERATOR NAME</span>
              <span className="text-xs md:text-sm font-bold text-white font-mono-custom uppercase tracking-wider">{result.team_name}</span>
            </div>
          )}

          {/* Repo Link */}
          <div className="w-full flex flex-col items-center pt-2">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block font-mono-custom mb-1 tracking-[0.2em]">PROJECT PATH</span>
            <a
              href={result.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-high)] hover:text-[var(--red-primary)] transition-colors font-mono-custom uppercase tracking-wider"
            >
              {result.repo_name}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Deployment Link */}
          {result.deployment_link && (
            <div className="w-full flex flex-col items-center pt-2">
              <span className="text-[9px] text-[var(--text-muted)] uppercase block font-mono-custom mb-1 tracking-[0.2em]">LIVE DEPLOYMENT</span>
              <a
                href={result.deployment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-high)] hover:text-[var(--red-primary)] transition-colors font-mono-custom uppercase tracking-wider"
              >
                {result.deployment_link.replace(/^https?:\/\//, '')}
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Share CTA */}
          <button
            onClick={handleShare}
            className="w-full mt-4 bg-[var(--bg-void)] border border-[var(--red-primary)] text-white hover:bg-[var(--red-deep)] font-semibold font-mono-custom tracking-[0.2em] uppercase py-3.5 px-6 clip-chamfer-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-glow hover:shadow-[0_0_15px_var(--red-primary)] text-[10px] md:text-xs"
          >
            <Share2 size={14} />
            SHARE TRANSMISSION
          </button>
        </div>
      </div>

      {/* Category Breakdown (Simulated dynamic sliders) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 md:p-8 space-y-5 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--red-primary)]" />
          <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.25em] font-mono-custom">
            EVALUATION CRITERIA BREAKDOWN
          </h4>
        </div>
        
        <div className="space-y-4 pt-2">
          {categories.map((cat, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[9px] md:text-[10px] uppercase font-bold font-mono-custom tracking-widest">
                <span className="text-[var(--text-muted)]">{cat.label}</span>
                <span className="text-[var(--chrome-high)]">{cat.val}</span>
              </div>
              <div className="bg-[var(--bg-void)] h-1.5 border border-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{
                    width: animateBars ? `${cat.val}%` : '0%',
                    background: 'var(--red-primary)',
                    boxShadow: '0 0 8px var(--red-primary)',
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
