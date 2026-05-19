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

    let score = 0;
    let isMock = false;

    if (!rawEngineUrl || rawEngineUrl.includes('placeholder')) {
      // Mock evaluation if no external URL is provided or if it's invalid
      score = parseFloat((80 + Math.random() * 19.5).toFixed(2));
      isMock = true;
    } else {
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
          
          // Poll the result endpoint until complete or times out (Max 30s)
          let status = analyzeData.status || 'analyzing';
          let attempts = 0;
          const maxAttempts = 15; // 15 attempts * 2s = 30 seconds max timeout
          
          const resultUrl = `${rawEngineUrl}/api/result/${submissionId}`;

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
        console.error('Judging engine call failed, using mock score:', err);
        // Fallback to mock for testing flow if engine fails
        score = parseFloat((80 + Math.random() * 19.5).toFixed(2));
        isMock = true;
      }
    }

    // Try storing in Supabase
    let dbData = null;
    let dbError = null;
    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');

    if (!isPlaceholder) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .upsert([{ github_url, repo_name, owner, score }], { onConflict: 'github_url' })
          .select();
        
        if (error) {
          dbError = error.message;
        } else {
          dbData = data;
        }
      } catch (err: any) {
        dbError = err.message;
      }
    } else {
      dbError = 'Supabase keys are placeholders. Storing submission in local fallback.';
    }

    return NextResponse.json({
      score,
      repo_name,
      owner,
      github_url,
      dbData,
      dbError,
      isMock
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission process failed.' }, { status: 500 });
  }
}
