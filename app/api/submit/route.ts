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
    const { github_url } = await req.json();
    if (!github_url || !github_url.includes('github.com')) {
      return NextResponse.json({ error: 'Please enter a valid GitHub repository URL.' }, { status: 400 });
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

    try {
      // Build URL endpoints matching your engine API structure
      const analyzeUrl = `${rawEngineUrl}/api/analyze`;
      
      console.log(`[API Proxy] Submitting to judging engine at: ${analyzeUrl}`);
      const analyzeRes = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: github_url,
          teamName: `Team ${repo_name}`,
          email: 'participant@hackarena.com'
        })
      });

      const analyzeData = await analyzeRes.json();
      
      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || 'Judging Engine initiation failed.');
      }

      const submissionId = analyzeData.id;
      
      if (submissionId) {
        console.log(`[API Proxy] Analysis initiated with ID: ${submissionId}. Polling for completion...`);
        
        let status = analyzeData.status || 'analyzing';
        const resultUrl = `${rawEngineUrl}/api/result/${submissionId}`;

        if (status === 'complete') {
          // Cached complete hit: Fetch score directly
          const resultRes = await fetch(resultUrl);
          if (resultRes.ok) {
            const resultData = await resultRes.json();
            score = parseFloat(resultData.scoreTotal || 0);
            console.log(`[API Proxy] Cached hit complete! Score: ${score}`);
          } else {
            throw new Error('Failed to fetch details for completed cached evaluation.');
          }
        } else {
          // Needs polling
          let attempts = 0;
          const maxAttempts = 15; // 15 attempts * 2s = 30 seconds max timeout
          
          while (status === 'analyzing' && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            attempts++;
            
            try {
              const resultRes = await fetch(resultUrl);
              if (resultRes.ok) {
                const resultData = await resultRes.json();
                status = resultData.status;
                if (status === 'complete') {
                  score = parseFloat(resultData.scoreTotal || 0);
                  console.log(`[API Proxy] Analysis complete! Score: ${score}`);
                  break;
                } else if (status === 'error') {
                  throw new Error(resultData.errorMessage || 'Analysis failed on the judging engine.');
                }
              }
            } catch (err: any) {
              console.warn(`[API Proxy] Polling attempt ${attempts} failed:`, err.message);
            }
          }
        }

        if (status !== 'complete') {
          throw new Error('Judging engine evaluation timed out.');
        }
      } else {
        // If no background ID returned, check if score was returned directly
        score = parseFloat(analyzeData.score || analyzeData.scoreTotal || 0);
      }

      if (score === 0) {
        throw new Error('Judging engine returned a score of 0.');
      }

    } catch (err: any) {
      console.error('Judging engine call failed:', err);
      return NextResponse.json({ error: `Judging engine evaluation failed: ${err.message}` }, { status: 500 });
    }

    // Try storing in Supabase
    let dbData = null;
    let dbError = null;
    let highScore = score;
    let improved = true;
    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');

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
              .update({ score, repo_name, owner })
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
            .insert([{ github_url, repo_name, owner, score }])
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
      score,
      highScore,
      improved,
      repo_name,
      owner,
      github_url,
      dbData,
      dbError,
      isMock: false
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission process failed.' }, { status: 500 });
  }
}
