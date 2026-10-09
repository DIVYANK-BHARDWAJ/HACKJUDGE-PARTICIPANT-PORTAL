export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
    if (rawEngineUrl.endsWith('/')) {
      rawEngineUrl = rawEngineUrl.slice(0, -1);
    }

    if (!rawEngineUrl || rawEngineUrl.includes('placeholder')) {
      return NextResponse.json({ results: [] });
    }

    const res = await fetch(`${rawEngineUrl}/api/results?evaluation=true`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }
    const data = await res.json();
    
    const formattedData = (data.results || []).map((s: any) => ({
      id: s.id,
      github_url: s.repoUrl,
      repo_name: s.repoName,
      owner: s.repoOwner,
      team_name: s.teamName,
      score: s.scoreTotal,
      submitted_at: s.createdAt,
      scoreSecurity: s.scoreSecurity,
      scoreCodeQuality: s.scoreCodeQuality,
      scoreInnovation: s.scoreInnovation,
      scoreUiUx: s.scoreUiUx,
      scoreBackend: s.scoreBackend,
      scoreCommits: s.scoreCommits,
      scoreDocumentation: s.scoreDocumentation,
      scorePrompt: s.scorePrompt,
    }));

    return NextResponse.json({ results: formattedData });
  } catch (err: any) {
    return NextResponse.json({ results: [] });
  }
}
