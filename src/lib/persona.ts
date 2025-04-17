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
  recentTrends?: {
    scoreTrend: 'improving' | 'stable' | 'declining';
    fairwayTrend: 'improving' | 'stable' | 'declining';
    greenTrend: 'improving' | 'stable' | 'declining';
    puttingTrend: 'improving' | 'stable' | 'declining';
  };
}

export function calculatePerformanceMetrics(rounds: Round[]): PerformanceMetrics {
  if (!rounds.length) {
    return {
      avgScore: 0,
      avgFairwaysHit: 0,
      avgGreensInRegulation: 0,
      avgPutts: 0,
      scramblingPercentage: 0
    };
  }

  const totalRounds = rounds.length;
  const totalScore = rounds.reduce((sum, round) => sum + (round.score || 0), 0);
  const totalFairways = rounds.reduce((sum, round) => sum + (round.fairways_hit ?? 0), 0);
  const totalGreens = rounds.reduce((sum, round) => sum + (round.greens_in_regulation ?? 0), 0);
  const totalPutts = rounds.reduce((sum, round) => sum + (round.putts ?? 0), 0);
  
  const totalScramblingAttempts = rounds.reduce((sum, round) => {
    if (!round.hole_by_hole_data) return sum;
    return sum + round.hole_by_hole_data.filter(hole => hole.green === 'miss').length;
  }, 0);
  
  const totalScramblingSuccesses = rounds.reduce((sum, round) => {
    if (!round.hole_by_hole_data) return sum;
    return sum + round.hole_by_hole_data.filter(hole => hole.green === 'miss' && hole.strokes <= 2).length;
  }, 0);

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
      recentRounds.map(r => r.score || 0),
      olderRounds.map(r => r.score || 0)
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
    avgScore: totalScore / totalRounds,
    avgFairwaysHit: totalFairways / totalRounds,
    avgGreensInRegulation: totalGreens / totalRounds,
    avgPutts: totalPutts / totalRounds,
    scramblingPercentage: totalScramblingAttempts > 0 
      ? (totalScramblingSuccesses / totalScramblingAttempts) * 100 
      : 0,
    recentTrends: trends
  };
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