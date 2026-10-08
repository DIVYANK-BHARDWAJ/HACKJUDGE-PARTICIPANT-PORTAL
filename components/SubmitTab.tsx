'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Info, Loader2, Sparkles } from 'lucide-react';

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
    if (!deploymentLink.trim()) {
      addToast('Please enter your deployment link.', 'error');
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
      <div className="text-center space-y-4 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs md:text-sm font-semibold tracking-wider text-[var(--accent)] border border-[rgba(124,106,247,0.3)] bg-[rgba(124,106,247,0.1)] rounded-full uppercase font-mono-custom animate-pulse">
          <Sparkles size={13} className="text-[var(--accent)]" />
          ⚡ BUILD. SUBMIT. DOMINATE.
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none text-white select-none">
          The arena is<br />
          <span 
            className="text-transparent"
            style={{ WebkitTextStroke: '1px var(--text2)', opacity: 0.8 }}
          >
            waiting for
          </span><br />
          <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)] bg-clip-text text-transparent">
            your code.
          </span>
        </h1>
        <p className="text-[var(--text2)] text-sm md:text-base max-w-lg mx-auto">
          Submit your public GitHub repository URL. Our AI judging engine will score your code in real-time based on innovation, code quality, and potential impact.
        </p>
      </div>

      {/* Submission Card Container */}
      <div className="w-full max-w-[620px] space-y-6">
        <div 
          className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-6 md:p-8 overflow-hidden shadow-glow"
          style={{ zIndex: 10 }}
        >
          {/* Gradient Top Edge line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-[var(--cyan)]" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-[var(--text3)] font-mono-custom">
                → NAME
              </label>
              <input
                type="text"
                required
                disabled={isEvaluating}
                placeholder="e.g. Divyank Bhardwaj"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm md:text-base font-mono-custom text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
              />
            </div>

            {/* GitHub Repo */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-[var(--text3)] font-mono-custom">
                → GITHUB REPOSITORY
              </label>
              <input
                type="url"
                required
                disabled={isEvaluating}
                placeholder="https://github.com/you/your-project"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm md:text-base font-mono-custom text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
              />
            </div>

            {/* Deployment Link */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-[var(--text3)] font-mono-custom">
                → DEPLOYMENT LINK
              </label>
              <input
                type="url"
                required
                disabled={isEvaluating}
                placeholder="https://your-project.vercel.app"
                value={deploymentLink}
                onChange={(e) => setDeploymentLink(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm md:text-base font-mono-custom text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60"
              />
            </div>

            {/* Prompt.md File Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-[var(--text3)] font-mono-custom">
                → PROMPT.MD (OPTIONAL)
              </label>
              <input
                type="file"
                accept=".md"
                disabled={isEvaluating}
                onChange={handleFileChange}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm md:text-base font-mono-custom text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-60 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent2)] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] hover:from-[var(--accent2)] hover:to-[var(--accent)] text-white font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5 shadow-glow-hover active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  EVALUATING IN THE ARENA...
                </>
              ) : (
                <>
                  SUBMIT TO THE ARENA
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-start gap-2 text-xs text-[var(--text3)]">
            <Info size={14} className="shrink-0 mt-0.5 text-[var(--text2)]" />
            <span>Public repositories only · Top 15 teams will be manually evaluated using your deployment link</span>
          </div>
        </div>

        {/* Evaluation Progress Card */}
        {isEvaluating && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-6 shadow-glow flex flex-col items-center text-center space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin text-[var(--accent)]" size={20} />
              <span className="text-sm font-semibold text-white">
                Evaluating: <span className="text-[var(--accent)] font-mono-custom">{getDisplayRepoName(repoUrl)}</span>
              </span>
            </div>
            
            {/* Stage text animation container */}
            <div className="h-6 flex items-center justify-center overflow-hidden">
              <span className="text-[var(--accent)] text-xs md:text-sm font-mono-custom tracking-wider font-semibold animate-pulse">
                {STAGES[currentStageIndex]}
              </span>
            </div>

            {/* 5-segment progress bar */}
            <div className="grid grid-cols-5 gap-2 w-full max-w-sm pt-2">
              {progressSegments.map((active, index) => (
                <div 
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    active 
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)] shadow-[0_0_8px_rgba(0,229,201,0.5)]' 
                      : 'bg-[var(--surface2)] border border-[var(--border)]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] shadow-glow">
        {/* Stat 1 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[10px] md:text-[11px] font-mono-custom tracking-widest text-[var(--text3)] uppercase">TOTAL SUBMISSIONS</span>
          <span className="text-2xl md:text-3xl font-bold font-mono-custom text-[var(--lime)]">{totalSubmissions}</span>
        </div>
        {/* Stat 2 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[10px] md:text-[11px] font-mono-custom tracking-widest text-[var(--text3)] uppercase">AVERAGE SCORE</span>
          <span className="text-2xl md:text-3xl font-bold font-mono-custom text-[var(--cyan)]">{averageScore.toFixed(2)}</span>
        </div>
        {/* Stat 3 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[10px] md:text-[11px] font-mono-custom tracking-widest text-[var(--text3)] uppercase">TOP SCORE</span>
          <span className="text-2xl md:text-3xl font-bold font-mono-custom text-[var(--accent)]">{topScore.toFixed(2)}</span>
        </div>
        {/* Stat 4 */}
        <div className="p-5 flex flex-col items-center md:items-start text-center md:text-left space-y-1 select-none">
          <span className="text-[10px] md:text-[11px] font-mono-custom tracking-widest text-[var(--text3)] uppercase">TIME REMAINING</span>
          <span className="text-2xl md:text-3xl font-bold font-mono-custom text-[var(--amber)] tracking-tighter">{countdownText}</span>
        </div>
      </div>
    </div>
  );
}
