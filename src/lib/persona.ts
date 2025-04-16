import { SupabaseClient } from '@supabase/supabase-js';

export async function generatePersona(userId: string, supabase: SupabaseClient) {
  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', userId)
    .order('round_date', { ascending: false })
    .limit(5);

  if (!rounds || rounds.length < 3) return null;

  const avgScore = rounds.reduce((acc, round) => acc + round.score, 0) / rounds.length;
  
  // Simple persona generation based on average score
  const persona = {
    persona_name: avgScore < 80 ? 'Pro' : avgScore < 90 ? 'Amateur' : 'Beginner',
    description: avgScore < 80 ? 'Elite player' : avgScore < 90 ? 'Solid golfer' : 'Learning the game'
  };

  return persona;
} 