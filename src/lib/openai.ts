import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not defined in environment variables');
}

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

interface GolfRound {
  course_name: string;
  score: number;
  fairways_hit: number;
  greens_in_regulation: number;
  putts: number;
  round_date: string;
  tee_position: string;
  hole_by_hole_data?: Array<{
    strokes: number;
    putts: number;
    fairway: string;
    green: string;
  }>;
}

interface GolfStats {
  averageScore: number;
  roundsPlayed: number;
  fairwaysHitPercentage: number;
  greensInRegulationPercentage: number;
  averagePutts: number;
  bestScore: number;
  worstScore: number;
  scoreTrend: number[];
}

export async function generateGolfInsights(rounds: GolfRound[], stats: GolfStats) {
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rounds, stats }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate insights');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating golf insights:', error);
    return null;
  }
}

export async function analyzeHoleByHolePerformance(holeData: GolfRound['hole_by_hole_data']) {
  if (!holeData) return null;

  try {
    const response = await fetch('/api/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ holeData }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze performance');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing hole-by-hole performance:', error);
    return null;
  }
} 