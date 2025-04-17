import { SupabaseClient } from '@supabase/supabase-js';
import { generateAIPersona } from './aiPersona';

interface Round {
  score: number;
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  putts: number | null;
  hole_by_hole_data?: Array<{
    strokes: number;
    putts: number;
    fairway: string;
    green: string;
  }>;
}

interface PerformanceMetrics {
  avgScore: number;
  avgFairwaysHit: number;
  avgGreensInRegulation: number;
  avgPutts: number;
  scramblingPercentage: number;
  puttingEfficiency: number;
  recentTrends?: {
    scoreTrend: 'improving' | 'stable' | 'declining';
    fairwayTrend: 'improving' | 'stable' | 'declining';
    greenTrend: 'improving' | 'stable' | 'declining';
    puttingTrend: 'improving' | 'stable' | 'declining';
  };
}

interface GolferPersona {
  id?: string;
  user_id: string;
  persona_name: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at?: string;
}

function calculatePerformanceMetrics(rounds: Round[]): PerformanceMetrics {
  const totalRounds = rounds.length;
  let totalFairways = 0;
  let totalGreens = 0;
  let totalPutts = 0;
  let totalScrambles = 0;
  let totalScrambleAttempts = 0;

  // Calculate basic metrics
  rounds.forEach(round => {
    totalFairways += round.fairways_hit || 0;
    totalGreens += round.greens_in_regulation || 0;
    totalPutts += round.putts || 0;

    if (round.hole_by_hole_data) {
      round.hole_by_hole_data.forEach(hole => {
        if (hole.green === 'miss') {
          totalScrambleAttempts++;
          if (hole.strokes <= 2) {
            totalScrambles++;
          }
        }
      });
    }
  });

  // Calculate trends
  const recentRounds = rounds.slice(0, 5);
  const olderRounds = rounds.slice(5, 10);
  
  const calculateTrend = (recent: number[], older: number[]): 'improving' | 'stable' | 'declining' => {
    if (recent.length < 2 || older.length < 2) return 'stable';
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (Math.abs(diff) < 0.5) return 'stable';
    return diff < 0 ? 'improving' : 'declining';
  };

  const trends = {
    scoreTrend: calculateTrend(
      recentRounds.map(r => r.score),
      olderRounds.map(r => r.score)
    ),
    fairwayTrend: calculateTrend(
      recentRounds.map(r => r.fairways_hit || 0),
      olderRounds.map(r => r.fairways_hit || 0)
    ),
    greenTrend: calculateTrend(
      recentRounds.map(r => r.greens_in_regulation || 0),
      olderRounds.map(r => r.greens_in_regulation || 0)
    ),
    puttingTrend: calculateTrend(
      recentRounds.map(r => r.putts || 0),
      olderRounds.map(r => r.putts || 0)
    )
  };

  return {
    avgScore: rounds.reduce((acc, round) => acc + round.score, 0) / totalRounds,
    avgFairwaysHit: totalFairways / totalRounds,
    avgGreensInRegulation: totalGreens / totalRounds,
    avgPutts: totalPutts / totalRounds,
    scramblingPercentage: totalScrambleAttempts > 0 ? (totalScrambles / totalScrambleAttempts) * 100 : 0,
    puttingEfficiency: totalPutts / totalRounds,
    recentTrends: trends
  };
}

function determinePersonaType(metrics: PerformanceMetrics, userId: string): GolferPersona {
  const { avgScore, avgFairwaysHit, avgGreensInRegulation, avgPutts, scramblingPercentage, puttingEfficiency } = metrics;
  
  // Define persona types based on performance metrics
  if (avgScore < 80 && avgGreensInRegulation > 12 && avgPutts < 30) {
    return {
      user_id: userId,
      persona_name: 'Elite Ball Striker',
      strengths: ['Exceptional ball striking', 'Strong iron play', 'Consistent tee shots'],
      weaknesses: ['Occasional putting lapses', 'Course management'],
      recommendations: [
        'Focus on short game practice',
        'Work on course strategy',
        'Consider professional tournament play'
      ]
    };
  } else if (avgScore < 85 && scramblingPercentage > 60) {
    return {
      user_id: userId,
      persona_name: 'Scrambler',
      strengths: ['Excellent short game', 'Strong mental game', 'Good recovery shots'],
      weaknesses: ['Inconsistent ball striking', 'Tee shot accuracy'],
      recommendations: [
        'Practice driving accuracy',
        'Work on approach shots',
        'Maintain short game focus'
      ]
    };
  } else if (avgScore < 90 && avgPutts < 32) {
    return {
      user_id: userId,
      persona_name: 'Putting Specialist',
      strengths: ['Excellent putting', 'Good course management', 'Consistent short game'],
      weaknesses: ['Ball striking consistency', 'Distance control'],
      recommendations: [
        'Focus on ball striking drills',
        'Work on distance control',
        'Maintain putting practice'
      ]
    };
  } else if (avgScore < 95) {
    return {
      user_id: userId,
      persona_name: 'Developing Player',
      strengths: ['Improving consistency', 'Good course management', 'Strong fundamentals'],
      weaknesses: ['Overall consistency', 'Short game', 'Putting'],
      recommendations: [
        'Focus on short game practice',
        'Work on putting consistency',
        'Develop pre-shot routine'
      ]
    };
  } else {
    return {
      user_id: userId,
      persona_name: 'Improving Beginner',
      strengths: ['Enthusiasm for improvement', 'Basic fundamentals', 'Willingness to learn'],
      weaknesses: ['Consistency', 'Short game', 'Course management'],
      recommendations: [
        'Focus on fundamentals',
        'Take lessons with a pro',
        'Practice short game regularly'
      ]
    };
  }
}

export async function generatePersona(userId: string, supabase: SupabaseClient) {
  // Fetch recent rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', userId)
    .order('round_date', { ascending: false })
    .limit(10);

  if (!rounds || rounds.length < 2) return null;

  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics(rounds as Round[]);

  // Generate AI-powered persona
  const persona = await generateAIPersona(metrics, userId);

  // Save persona to database
  const { data: existingPersona } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingPersona) {
    // Update existing persona
    const { error } = await supabase
      .from('personas')
      .update({
        ...persona,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) console.error('Error updating persona:', error);
  } else {
    // Create new persona
    const { error } = await supabase
      .from('personas')
      .insert({
        ...persona,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Error creating persona:', error);
  }

  return persona;
} 