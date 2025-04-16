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

    const data = await response.json();
    return data.insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

export async function analyzeHoleByHolePerformance(holeData: GolfRound['hole_by_hole_data']) {
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ holeData }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze hole performance');
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing hole performance:', error);
    throw error;
  }
} 