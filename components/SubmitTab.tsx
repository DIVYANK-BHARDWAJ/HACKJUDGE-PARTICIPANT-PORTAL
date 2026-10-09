/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Info, Loader2, Sparkles, Users, Brain, Trophy, Lightbulb, UploadCloud, X as XIcon, CheckCircle2 } from 'lucide-react';

interface SubmitTabProps {
  onSubmissionSuccess: (result: any) => void;
  submissions: any[];
  endTime: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const STAGES = [
  "Fetching repository...",
  "Analyzing structure...",
  "Measuring code quality...",
  "Scoring innovation...",
  "Finalizing score..."
];

export default function SubmitTab({
  onSubmissionSuccess,
  submissions,
  endTime,
  addToast
}: SubmitTabProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [deploymentLink, setDeploymentLink] = useState('');
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [promptContent, setPromptContent] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progressSegments, setProgressSegments] = useState<boolean[]>([false, false, false, false, false]);
  const [countdownText, setCountdownText] = useState('00d 00h 00m 00s');

  const evalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiResultRef = useRef<any>(null);
  const animationFinishedRef = useRef(false);

  // Stats calculation
  const totalSubmissions = submissions.length;
  const averageScore = totalSubmissions > 0
    ? parseFloat((submissions.reduce((acc, curr) => acc + parseFloat(curr.score), 0) / totalSubmissions).toFixed(2))
    : 0.00;
  const topScore = totalSubmissions > 0
    ? Math.max(...submissions.map(s => parseFloat(s.score)))
    : 0.00;

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdownText('ENDED');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const dStr = days.toString().padStart(2, '0');
      const hStr = hours.toString().padStart(2, '0');
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');

      setCountdownText(`${dStr}d ${hStr}h ${mStr}m ${sStr}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Handle stage cycler & check if API is done
  const advanceEvaluation = (stageIndex: number) => {
    if (stageIndex >= STAGES.length) {
      animationFinishedRef.current = true;
      checkCompletion();
      return;
    }

    setCurrentStageIndex(stageIndex);
    setProgressSegments(prev => {
      const next = [...prev];
      next[stageIndex] = true;
      return next;
    });

    evalTimerRef.current = setTimeout(() => {
      advanceEvaluation(stageIndex + 1);
    }, 1400); // Cycle every 1.4s (total 7s evaluation experience)
  };

  const checkCompletion = () => {
    if (animationFinishedRef.current && apiResultRef.current) {
      setIsEvaluating(false);
      
      if (apiResultRef.current.error) {
        addToast(apiResultRef.current.error, 'error');
      } else {
        const { score, highScore, improved } = apiResultRef.current;
        
        // Parse repo key and increment submission count
        let repoKey = repoUrl.trim().toLowerCase();
        try {
          const cleaned = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
          const parts = cleaned.split('/');
          const name = parts.pop() || '';
          const owner = parts.pop() || '';
          if (name && owner) {
            repoKey = `${owner}/${name}`.toLowerCase();
          }
        } catch {}

        const counts = JSON.parse(localStorage.getItem('hackarena_submission_counts') || '{}');
        counts[repoKey] = (counts[repoKey] || 0) + 1;
        localStorage.setItem('hackarena_submission_counts', JSON.stringify(counts));

        if (improved) {
          addToast(`New high score! Evaluated: ${score} pts`, 'success');
        } else {
          addToast(`Evaluated: ${score} pts. (High score remains: ${highScore} pts)`, 'success');
        }
        onSubmissionSuccess(apiResultRef.current);
      }

      // Reset states
      apiResultRef.current = null;
      animationFinishedRef.current = false;
      setProgressSegments([false, false, false, false, false]);
      setCurrentStageIndex(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      addToast('Please enter your name.', 'error');
      return;
    }
    if (!repoUrl || !repoUrl.trim().startsWith('https://github.com/')) {
      addToast('Please input a valid public GitHub URL (https://github.com/username/repo)', 'error');
      return;
    }

    // Check submission count for this repository
    let repoKey = repoUrl.trim().toLowerCase();
    try {
      const cleaned = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
      const parts = cleaned.split('/');
      const name = parts.pop() || '';
      const owner = parts.pop() || '';
      if (name && owner) {
        repoKey = `${owner}/${name}`.toLowerCase();
      }
    } catch {}

    const counts = JSON.parse(localStorage.getItem('hackarena_submission_counts') || '{}');
    const currentCount = counts[repoKey] || 0;
    if (currentCount >= 2) {
      addToast('you cannot submit to arena more than 2 times', 'error');
      return;
    }

    // Check if hackathon has ended
    const targetTime = new Date(endTime).getTime();
    if (Date.now() > targetTime) {
      addToast('sorry you submitted after the deadline', 'error');
      return;
    }

    setIsEvaluating(true);
    setProgressSegments([false, false, false, false, false]);
    setCurrentStageIndex(0);
    apiResultRef.current = null;
    animationFinishedRef.current = false;

    // Start UI progress cycle
    advanceEvaluation(0);

    // Call API proxy route
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_url: repoUrl.trim(),
          team_name: teamName.trim(),
          deployment_link: deploymentLink.trim(),
          prompt_content: promptContent
        })
      });
      const data = await response.json();

      if (!response.ok) {
        apiResultRef.current = { error: data.error || 'Evaluation failed. Please try again.' };
      } else if (data.status === 'analyzing' && data.id) {
        // Poll endpoint client-side every 2 seconds to prevent serverless function timeouts
        const submissionId = data.id;
        let isDone = false;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds total polling limit
        
        while (!isDone && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            const pollResponse = await fetch(`/api/submit?id=${submissionId}&github_url=${encodeURIComponent(repoUrl.trim())}&team_name=${encodeURIComponent(teamName.trim())}&deployment_link=${encodeURIComponent(deploymentLink.trim())}`);
            const pollData = await pollResponse.json();
            
            if (!pollResponse.ok) {
              apiResultRef.current = { error: pollData.error || 'Evaluation status fetch failed.' };
              isDone = true;
            } else if (pollData.status === 'complete') {
              apiResultRef.current = pollData;
              isDone = true;
            } else if (pollData.status === 'error') {
              apiResultRef.current = { error: pollData.error || 'Analysis failed on the judging engine.' };
              isDone = true;
            }
          } catch (pollErr) {
            console.warn(`[Client Polling] Attempt ${attempts} failed:`, pollErr);
          }
        }
        
        if (!isDone) {
          apiResultRef.current = { error: 'Evaluation timed out. Please check again in a few moments.' };
        }
      } else {
        apiResultRef.current = data;
      }
    } catch (err: any) {
      apiResultRef.current = { error: 'Network error occurred. Using local demo fallback.' };
    }

    // Attempt completion (if animation finished fast, or we wait for animation)
    checkCompletion();
  };

  // Extract repo name for preview
  const getDisplayRepoName = (url: string) => {
    try {
      const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
      const parts = cleaned.split('/');
      return parts.pop() || 'Repository';
    } catch {
      return 'repository';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.md')) {
        addToast('Please upload a valid .md file.', 'error');
        return;
      }
      setPromptFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPromptContent(evt.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      setPromptFile(null);
      setPromptContent('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 md:py-16 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl animate-fade-in w-full">
        <div className="space-y-2">
          <div className="text-[10px] md:text-xs font-semibold tracking-[0.3em] text-[var(--text-muted)] uppercase">
            A PROMPT ENGINEERING CHALLENGE
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-widest chrome-text m-0 leading-none">PROTOCOL</h1>
            <span className="text-6xl md:text-8xl font-display font-black text-[var(--red-primary)] drop-shadow-[0_0_15px_var(--red-glow)] leading-none -ml-1">X</span>
          </div>
          <div className="text-xs md:text-sm font-semibold tracking-[0.2em] mt-2 uppercase">
            <span className="text-[var(--red-primary)] drop-shadow-[0_0_5px_var(--red-glow)]">HUMAN PROMPTS.</span> <span className="text-white">MACHINE POTENTIAL.</span>
          </div>
        </div>

        <div className="text-[10px] md:text-xs text-[var(--text-muted)] tracking-[0.2em] uppercase italic border-l-2 border-[var(--red-primary)] pl-3 mx-auto w-fit">
          "IT'S NOT JUST A PROMPT. IT'S A PROTOCOL."
        </div>

        {/* 4 Info Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] clip-chamfer-sm p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-[var(--red-primary)] hover:shadow-glow">
            <Users size={20} className="text-[var(--text-muted)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-white">TEAMS</span>
              <span className="text-[9px] font-mono-custom text-[var(--text-muted)] uppercase">2–4 MEMBERS</span>
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] clip-chamfer-sm p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-[var(--red-primary)] hover:shadow-glow">
            <Brain size={20} className="text-[var(--text-muted)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-white">CHALLENGES</span>
              <span className="text-[9px] font-mono-custom text-[var(--text-muted)] uppercase">REAL-WORLD PROBLEMS</span>
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] clip-chamfer-sm p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-[var(--red-primary)] hover:shadow-glow">
            <Trophy size={20} className="text-[var(--text-muted)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-white">PRIZES</span>
              <span className="text-[9px] font-mono-custom text-[var(--text-muted)] uppercase">EXCITING REWARDS</span>
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] clip-chamfer-sm p-4 flex flex-col items-center gap-2 text-center transition-all hover:border-[var(--red-primary)] hover:shadow-glow">
            <Lightbulb size={20} className="text-[var(--text-muted)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-white">LEARN</span>
              <span className="text-[9px] font-mono-custom text-[var(--text-muted)] uppercase">FROM EXPERTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Card Container */}
      <div className="w-full max-w-[620px] space-y-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
        <div 
          className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 md:p-8 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          style={{ zIndex: 10 }}
        >
          {/* Gradient Top Edge line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--red-primary)] shadow-[0_0_10px_var(--red-primary)] opacity-80" />
          
          <div className="mb-6 flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-sm font-bold tracking-[0.25em] uppercase text-white">[ SUBMIT YOUR PROTOCOL ]</h2>
            <div className="w-2 h-2 bg-[var(--red-primary)] animate-pulse rounded-full shadow-[0_0_5px_var(--red-primary)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                <span className="text-[var(--red-primary)]">→</span> OPERATOR NAME
              </label>
              <input
                type="text"
                required
                disabled={isEvaluating}
                placeholder="e.g. Divyank Bhardwaj"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-[var(--bg-void)] border border-[var(--border-subtle)] px-4 py-3 text-sm font-mono-custom text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--red-primary)] focus:shadow-[0_0_10px_var(--red-glow)] transition-all disabled:opacity-60"
              />
            </div>

            {/* GitHub Repo */}
            <div className="space-y-2">
              <label className="block text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                <span className="text-[var(--red-primary)]">→</span> SOURCE REPOSITORY
              </label>
              <input
                type="url"
                required
                disabled={isEvaluating}
                placeholder="https://github.com/you/your-project"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full bg-[var(--bg-void)] border border-[var(--border-subtle)] px-4 py-3 text-sm font-mono-custom text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--red-primary)] focus:shadow-[0_0_10px_var(--red-glow)] transition-all disabled:opacity-60"
              />
            </div>

            {/* Deployment Link */}
            <div className="space-y-2">
              <label className="block text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                <span className="text-[var(--red-primary)]">→</span> DEPLOYMENT ENDPOINT
              </label>
              <input
                type="url"
                disabled={isEvaluating}
                placeholder="https://your-project.vercel.app (Optional)"
                value={deploymentLink}
                onChange={(e) => setDeploymentLink(e.target.value)}
                className="w-full bg-[var(--bg-void)] border border-[var(--border-subtle)] px-4 py-3 text-sm font-mono-custom text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--red-primary)] focus:shadow-[0_0_10px_var(--red-glow)] transition-all disabled:opacity-60"
              />
            </div>

            {/* Prompt.md File Upload */}
            <div className="space-y-2">
              <label className="block text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                <span className="text-[var(--red-primary)]">→</span> PROMPT.MD
              </label>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".md"
                  required
                  disabled={isEvaluating}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={`w-full bg-[var(--bg-void)] border border-dashed transition-all p-6 flex flex-col items-center justify-center gap-3 text-center ${
                  promptFile ? 'border-[var(--success)] bg-[rgba(43,255,136,0.05)]' : 'border-[var(--border-red)] hover:bg-[rgba(255,30,30,0.05)] hover:border-[var(--red-primary)] focus-within:border-[var(--red-primary)] focus-within:shadow-[0_0_10px_var(--red-glow)]'
                }`}>
                  {promptFile ? (
                    <>
                      <CheckCircle2 size={24} className="text-[var(--success)]" />
                      <div>
                        <p className="text-sm font-mono-custom text-white">{promptFile.name}</p>
                        <p className="text-xs font-mono-custom text-[var(--text-muted)] mt-1">{(promptFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <p className="text-[10px] tracking-widest text-[var(--text-muted)] mt-2 uppercase">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-[var(--red-primary)] opacity-80" />
                      <p className="text-xs font-mono-custom tracking-[0.1em] text-[var(--text-muted)]">
                        DROP PROMPT.MD OR CLICK TO BROWSE
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full bg-[var(--bg-void)] border border-[var(--red-primary)] text-white font-bold tracking-[0.2em] py-4 px-6 clip-chamfer-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:bg-[var(--red-deep)] hover:shadow-glow disabled:opacity-60 disabled:pointer-events-none group"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="animate-spin text-[var(--red-primary)] group-hover:text-white" size={16} />
                  <span className="text-xs">TRANSMITTING...</span>
                </>
              ) : (
                <>
                  <span className="text-xs">TRANSMIT PROTOCOL</span>
                  <ArrowRight size={16} className="text-[var(--red-primary)] group-hover:text-white transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-start gap-2 text-[10px] text-[var(--text-muted)] font-mono-custom tracking-wider">
            <Info size={14} className="shrink-0 mt-0.5 text-[var(--red-primary)]" />
            <span>PUBLIC REPOSITORIES ONLY · TOP 15 TEAMS WILL BE MANUALLY EVALUATED USING YOUR DEPLOYMENT LINK</span>
          </div>
        </div>

        {/* Evaluation Progress Card */}
        {isEvaluating && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 shadow-glow flex flex-col items-center text-center space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin text-[var(--red-primary)]" size={20} />
              <span className="text-sm font-semibold tracking-widest text-white uppercase">
                ANALYZING: <span className="text-[var(--chrome-low)] font-mono-custom">{getDisplayRepoName(repoUrl)}</span>
              </span>
            </div>
            
            {/* Stage text animation container */}
            <div className="h-6 flex items-center justify-center overflow-hidden">
              <span className="text-[var(--red-primary)] text-xs md:text-sm font-mono-custom tracking-[0.2em] font-semibold animate-pulse uppercase">
                [ {STAGES[currentStageIndex]} ]
              </span>
            </div>

            {/* 5-segment progress bar */}
            <div className="grid grid-cols-5 gap-2 w-full max-w-sm pt-2">
              {progressSegments.map((active, index) => (
                <div 
                  key={index}
                  className={`h-1.5 transition-all duration-500 ${
                    active 
                      ? 'bg-[var(--red-primary)] shadow-[0_0_8px_var(--red-primary)]' 
                      : 'bg-[var(--bg-void)] border border-[var(--border-subtle)]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] mt-8">
        {/* Stat 1 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[9px] md:text-[10px] font-semibold tracking-[0.2em] text-[var(--text-muted)] uppercase">TOTAL SUBMISSIONS</span>
          <span className="text-xl md:text-2xl font-bold font-mono-custom text-white">{totalSubmissions}</span>
        </div>
        {/* Stat 2 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[9px] md:text-[10px] font-semibold tracking-[0.2em] text-[var(--text-muted)] uppercase">AVERAGE SCORE</span>
          <span className="text-xl md:text-2xl font-bold font-mono-custom text-[var(--chrome-low)]">{averageScore.toFixed(2)}</span>
        </div>
        {/* Stat 3 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[9px] md:text-[10px] font-semibold tracking-[0.2em] text-[var(--text-muted)] uppercase">TOP SCORE</span>
          <span className="text-xl md:text-2xl font-bold font-mono-custom text-[var(--success)] drop-shadow-[0_0_5px_var(--success)]">{topScore.toFixed(2)}</span>
        </div>
        {/* Stat 4 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[9px] md:text-[10px] font-semibold tracking-[0.2em] text-[var(--text-muted)] uppercase">TIME REMAINING</span>
          <span className="text-xl md:text-2xl font-bold font-mono-custom text-[var(--red-primary)] tracking-tight">{countdownText}</span>
        </div>
      </div>
    </div>
  );
}
