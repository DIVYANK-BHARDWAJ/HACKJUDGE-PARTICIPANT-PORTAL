import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { github_url, team_name, deployment_link } = await req.json();
    if (!github_url || !github_url.includes('github.com')) {
      return NextResponse.json({ error: 'Please enter a valid GitHub repository URL.' }, { status: 400 });
    }

    // Fetch deadline from config DB (or fallback)
    const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');
    let endTimeStr = defaultEndTime;

    if (!isPlaceholder) {
      try {
        const { data: configData } = await supabase
          .from('config')
          .select('value')
          .eq('key', 'end_time')
          .maybeSingle();

        if (configData?.value) {
          endTimeStr = configData.value;
        }
      } catch (err) {
        console.warn('[API Proxy] Error fetching config for deadline check:', err);
      }
    }

    const deadline = new Date(endTimeStr).getTime();
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
          email: 'participant@hackarena.com'
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
    let status = analyzeData.status || 'analyzing';

    if (submissionId) {
      const resultUrl = `${rawEngineUrl}/api/result/${submissionId}`;

      if (status === 'complete') {
        // Cached complete hit: Fetch score directly
        const resultRes = await fetch(resultUrl);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          score = parseFloat(resultData.scoreTotal || 0);
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

    // Try storing in Supabase
    let dbData = null;
    let dbError = null;
    let highScore = score;
    let improved = true;

    if (!isPlaceholder) {
      try {
        // Fetch existing submission if any to compare scores
        const { data: existing, error: fetchError } = await supabase
          .from('submissions')
          .select('*')
          .eq('github_url', github_url)
          .maybeSingle();

        if (fetchError) {
          console.warn('[API Proxy] Error fetching existing submission:', fetchError.message);
        }

        if (existing) {
          const existingScore = parseFloat(existing.score);
          if (score > existingScore) {
            // New score is better, update the DB
            const { data, error } = await supabase
              .from('submissions')
              .update({ score, repo_name, owner, team_name: team_name || existing.team_name, deployment_link: deployment_link || existing.deployment_link })
              .eq('github_url', github_url)
              .select();
            
            if (error) {
              dbError = error.message;
            } else {
              dbData = data;
              highScore = score;
              improved = true;
            }
          } else {
            // Existing score is better or equal, do not update score in DB
            dbData = [existing];
            highScore = existingScore;
            improved = false;
          }
        } else {
          // No existing submission, insert new
          const { data, error } = await supabase
            .from('submissions')
            .insert([{ github_url, repo_name, owner, score, team_name: team_name || '', deployment_link: deployment_link || '' }])
            .select();
          
          if (error) {
            dbError = error.message;
          } else {
            dbData = data;
            highScore = score;
            improved = true;
          }
        }
      } catch (err: any) {
        dbError = err.message;
      }
    } else {
      dbError = 'Supabase keys are placeholders. Storing submission in local fallback.';
    }

    return NextResponse.json({
      status: 'complete',
      score,
      highScore,
      improved,
      repo_name,
      owner,
      github_url,
      team_name: team_name || '',
      deployment_link: deployment_link || '',
      dbData,
      dbError,
      isMock: false
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

    // Since status is complete, save/upsert in Supabase!
    const score = parseFloat(resultData.scoreTotal || 0);
    if (score === 0) {
      return NextResponse.json({ error: 'Judging engine returned a score of 0.' }, { status: 500 });
    }

    const repoUrl = github_url || resultData.repoUrl;
    if (!repoUrl) {
      return NextResponse.json({ error: 'Missing github url.' }, { status: 400 });
    }

    const { name: repo_name, owner } = parseGithubUrl(repoUrl);

    let dbData = null;
    let dbError = null;
    let highScore = score;
    let improved = true;
    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');

    if (!isPlaceholder) {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('submissions')
          .select('*')
          .eq('github_url', repoUrl)
          .maybeSingle();

        if (existing) {
          const existingScore = parseFloat(existing.score);
          if (score > existingScore) {
            const { data, error } = await supabase
              .from('submissions')
              .update({ score, repo_name, owner, team_name: team_name || existing.team_name, deployment_link: deployment_link || existing.deployment_link })
              .eq('github_url', repoUrl)
              .select();
            
            if (error) dbError = error.message;
            else {
              dbData = data;
              highScore = score;
              improved = true;
            }
          } else {
            dbData = [existing];
            highScore = existingScore;
            improved = false;
          }
        } else {
          const { data, error } = await supabase
            .from('submissions')
            .insert([{ github_url: repoUrl, repo_name, owner, score, team_name: team_name || '', deployment_link: deployment_link || '' }])
            .select();
          
          if (error) dbError = error.message;
          else {
            dbData = data;
            highScore = score;
            improved = true;
          }
        }
      } catch (err: any) {
        dbError = err.message;
      }
    } else {
      dbError = 'Supabase keys are placeholders. Storing submission in local fallback.';
    }

    return NextResponse.json({
      status: 'complete',
      score,
      highScore,
      improved,
      repo_name,
      owner,
      github_url: repoUrl,
      team_name,
      deployment_link,
      dbData,
      dbError,
      isMock: false
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'GET process failed.' }, { status: 500 });
  }
}
