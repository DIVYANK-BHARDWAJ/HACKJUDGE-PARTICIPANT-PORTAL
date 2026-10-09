import { NextRequest, NextResponse } from 'next/server';

function parseGithubUrl(url: string) {
  try {
    const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
    const parts = cleaned.split('/');
    const name = parts.pop() || '';
    const owner = parts.pop() || '';
    return { name, owner };
  } catch {
    return { name: 'Unknown', owner: 'Unknown' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { github_url, team_name, deployment_link, prompt_content } = await req.json();
    if (!github_url || !github_url.includes('github.com')) {
      return NextResponse.json({ error: 'Please enter a valid GitHub repository URL.' }, { status: 400 });
    }

    const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
    const deadline = new Date(defaultEndTime).getTime();
    if (Date.now() > deadline) {
      return NextResponse.json({ error: 'sorry you submitted after the deadline' }, { status: 400 });
    }

    const { name: repo_name, owner } = parseGithubUrl(github_url);

    // Call Judging Engine API
    let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
    
    // Clean trailing slash if present
    if (rawEngineUrl.endsWith('/')) {
      rawEngineUrl = rawEngineUrl.slice(0, -1);
    }

    if (!rawEngineUrl || rawEngineUrl.includes('placeholder')) {
      return NextResponse.json({ error: 'Judging engine URL is not configured. Please contact the administrator.' }, { status: 500 });
    }

    let score = 0;
    let analyzeData: any;

    try {
      const analyzeUrl = `${rawEngineUrl}/api/analyze`;
      console.log(`[API Proxy] Submitting to judging engine at: ${analyzeUrl}`);
      const analyzeRes = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: github_url,
          teamName: team_name || `Team ${repo_name}`,
          email: 'participant@hackarena.com',
          promptContent: prompt_content
        })
      });

      analyzeData = await analyzeRes.json();
      
      if (!analyzeRes.ok) {
        return NextResponse.json({ error: analyzeData.error || 'Judging Engine initiation failed.' }, { status: analyzeRes.status });
      }
    } catch (err: any) {
      console.error('Judging engine call failed:', err);
      return NextResponse.json({ error: `Judging engine evaluation failed: ${err.message}` }, { status: 500 });
    }

    const submissionId = analyzeData.id;
    const status = analyzeData.status || 'analyzing';
    let finalData = analyzeData;

    if (submissionId) {
      const resultUrl = `${rawEngineUrl}/api/result/${submissionId}`;

      if (status === 'complete') {
        // Cached complete hit: Fetch score directly
        const resultRes = await fetch(resultUrl);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          score = parseFloat(resultData.scoreTotal || 0);
          finalData = resultData;
          console.log(`[API Proxy] Cached hit complete! Score: ${score}`);
        } else {
          return NextResponse.json({ error: 'Failed to fetch details for completed cached evaluation.' }, { status: 500 });
        }
      } else {
        // Needs client-side polling. Immediately return the status to client.
        return NextResponse.json({ id: submissionId, status: 'analyzing', repo_name, owner, github_url, team_name, deployment_link });
      }
    } else {
      // If no background ID returned, check if score was returned directly
      score = parseFloat(analyzeData.score || analyzeData.scoreTotal || 0);
    }

    if (score === 0) {
      return NextResponse.json({ error: 'Judging engine returned a score of 0.' }, { status: 500 });
    }

    // Push to leaderboard directly via judging engine
    let dbError = null;
    try {
      const pushUrl = `${rawEngineUrl}/api/results/push`;
      const pushRes = await fetch(pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submissionId })
      });
      if (!pushRes.ok) {
        dbError = 'Failed to push to Neon DB leaderboard';
      }
    } catch (err: any) {
      dbError = err.message;
    }

    return NextResponse.json({
      status: 'complete',
      score,
      highScore: score,
      improved: true,
      repo_name,
      owner,
      github_url,
      team_name: team_name || '',
      deployment_link: deployment_link || '',
      dbData: null,
      dbError,
      isMock: false,
      scoreSecurity: finalData.scoreSecurity || 0,
      scoreCodeQuality: finalData.scoreCodeQuality || 0,
      scoreInnovation: finalData.scoreInnovation || 0,
      scoreUiUx: finalData.scoreUiUx || 0,
      scoreBackend: finalData.scoreBackend || 0,
      scoreCommits: finalData.scoreCommits || 0,
      scoreDocumentation: finalData.scoreDocumentation || 0,
      scorePrompt: finalData.scorePrompt || 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission process failed.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const github_url = searchParams.get('github_url');
    const team_name = searchParams.get('team_name') || '';
    const deployment_link = searchParams.get('deployment_link') || '';
    
    if (!id) {
      return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
    if (rawEngineUrl.endsWith('/')) {
      rawEngineUrl = rawEngineUrl.slice(0, -1);
    }
    
    if (!rawEngineUrl || rawEngineUrl.includes('placeholder')) {
      return NextResponse.json({ error: 'Judging engine URL is not configured.' }, { status: 500 });
    }

    const resultUrl = `${rawEngineUrl}/api/result/${id}`;
    const resultRes = await fetch(resultUrl);
    
    if (!resultRes.ok) {
      const errData = await resultRes.json().catch(() => ({}));
      return NextResponse.json({ error: errData.error || 'Failed to fetch status from judging engine.' }, { status: resultRes.status });
    }

    const resultData = await resultRes.json();
    const status = resultData.status;

    if (status !== 'complete') {
      if (status === 'error') {
        return NextResponse.json({ status: 'error', error: resultData.errorMessage || 'Analysis failed on the judging engine.' });
      }
      return NextResponse.json({ id, status, errorMessage: resultData.errorMessage || null });
    }

    // Call Judging Engine API to push to leaderboard
    let dbError = null;
    try {
      const pushUrl = `${rawEngineUrl}/api/results/push`;
      const pushRes = await fetch(pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!pushRes.ok) {
        dbError = 'Failed to push to Neon DB leaderboard';
      }
    } catch (err: any) {
      dbError = err.message;
    }

    const score = parseFloat(resultData.scoreTotal || 0);
    const repoUrl = resultData.repoUrl || github_url || '';
    const { name: repo_name, owner } = parseGithubUrl(repoUrl);

    return NextResponse.json({
      status: 'complete',
      score,
      highScore: score,
      improved: true,
      repo_name,
      owner,
      github_url: repoUrl,
      team_name,
      deployment_link,
      dbData: null,
      dbError,
      isMock: false,
      scoreSecurity: resultData.scoreSecurity || 0,
      scoreCodeQuality: resultData.scoreCodeQuality || 0,
      scoreInnovation: resultData.scoreInnovation || 0,
      scoreUiUx: resultData.scoreUiUx || 0,
      scoreBackend: resultData.scoreBackend || 0,
      scoreCommits: resultData.scoreCommits || 0,
      scoreDocumentation: resultData.scoreDocumentation || 0,
      scorePrompt: resultData.scorePrompt || 0
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'GET process failed.' }, { status: 500 });
  }
}
