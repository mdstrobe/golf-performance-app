import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

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
  user_id: string;
  persona_name: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  playStyle: string;
  mentalGame: string;
  practiceFocus: string[];
  created_at?: string;
}

export async function generateAIPersona(metrics: PerformanceMetrics, userId: string): Promise<GolferPersona> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = `
    Analyze the following golf performance metrics and generate a detailed golfer persona:
    
    Performance Metrics:
    - Average Score: ${metrics.avgScore}
    - Fairways Hit: ${metrics.avgFairwaysHit}%
    - Greens in Regulation: ${metrics.avgGreensInRegulation}%
    - Average Putts: ${metrics.avgPutts}
    - Scrambling Percentage: ${metrics.scramblingPercentage}%
    - Putting Efficiency: ${metrics.puttingEfficiency}
    ${metrics.recentTrends ? `
    Recent Trends:
    - Score: ${metrics.recentTrends.scoreTrend}
    - Fairways: ${metrics.recentTrends.fairwayTrend}
    - Greens: ${metrics.recentTrends.greenTrend}
    - Putting: ${metrics.recentTrends.puttingTrend}
    ` : ''}

    Generate a detailed golfer persona in JSON format with the following structure:
    {
      "persona_name": "Creative name based on their playing style",
      "strengths": ["3 specific strengths based on their metrics"],
      "weaknesses": ["3 specific weaknesses based on their metrics"],
      "recommendations": ["3 specific recommendations for improvement"],
      "playStyle": "Description of their playing style and approach to the game",
      "mentalGame": "Analysis of their mental approach and potential areas for improvement",
      "practiceFocus": ["3 specific areas to focus on in practice"]
    }

    The persona should be:
    1. Based on their actual performance metrics
    2. Include specific, actionable insights
    3. Consider their recent trends if available
    4. Be encouraging while highlighting areas for improvement
    5. Use golf-specific terminology
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response and parse as JSON
    const cleanedText = text.replace(/```json\n|\n```/g, '').trim();
    const personaData = JSON.parse(cleanedText);

    return {
      user_id: userId,
      ...personaData,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating AI persona:', error);
    // Fallback to basic persona if AI generation fails
    return generateBasicPersona(metrics, userId);
  }
}

function generateBasicPersona(metrics: PerformanceMetrics, userId: string): GolferPersona {
  const { avgScore, avgFairwaysHit, avgGreensInRegulation, avgPutts, scramblingPercentage } = metrics;
  
  // Define persona types based on performance metrics
  if (avgScore < 75 && avgGreensInRegulation > 13) {
    return {
      user_id: userId,
      persona_name: 'Tour Ready',
      strengths: ['Elite ball striking', 'Consistent approach play', 'Strong course management'],
      weaknesses: ['Occasional putting lapses', 'Mental game under pressure'],
      recommendations: ['Focus on pressure putting', 'Work on pre-shot routine', 'Consider tournament play'],
      playStyle: 'Aggressive but calculated, with strong fundamentals',
      mentalGame: 'Generally strong but can improve under tournament pressure',
      practiceFocus: ['Pressure putting', 'Course strategy', 'Mental preparation']
    };
  } else if (avgScore < 80 && scramblingPercentage > 70) {
    return {
      user_id: userId,
      persona_name: 'Magician',
      strengths: ['Exceptional short game', 'Creative shot-making', 'Strong mental game'],
      weaknesses: ['Inconsistent tee shots', 'Distance control'],
      recommendations: ['Practice driving accuracy', 'Work on distance control', 'Maintain short game focus'],
      playStyle: 'Creative and adaptable, excels in recovery situations',
      mentalGame: 'Strong under pressure, good at managing expectations',
      practiceFocus: ['Driving accuracy', 'Distance control', 'Short game maintenance']
    };
  } else if (avgScore < 85 && avgPutts < 30) {
    return {
      user_id: userId,
      persona_name: 'Putting Machine',
      strengths: ['Excellent putting', 'Good course management', 'Consistent short game'],
      weaknesses: ['Ball striking consistency', 'Distance control'],
      recommendations: ['Focus on ball striking drills', 'Work on distance control', 'Maintain putting practice'],
      playStyle: 'Strategic and patient, relies on strong putting',
      mentalGame: 'Good at staying patient and managing expectations',
      practiceFocus: ['Ball striking', 'Distance control', 'Putting maintenance']
    };
  } else if (avgScore < 90 && avgFairwaysHit > 60) {
    return {
      user_id: userId,
      persona_name: 'Fairway Finder',
      strengths: ['Accurate driving', 'Good course management', 'Consistent ball striking'],
      weaknesses: ['Short game', 'Putting under pressure'],
      recommendations: ['Focus on short game practice', 'Work on putting consistency', 'Develop pre-shot routine'],
      playStyle: 'Conservative and accurate, focuses on fairways and greens',
      mentalGame: 'Good at managing expectations, can improve under pressure',
      practiceFocus: ['Short game', 'Putting', 'Pre-shot routine']
    };
  } else if (avgScore < 95) {
    return {
      user_id: userId,
      persona_name: 'Developing Player',
      strengths: ['Improving consistency', 'Good course management', 'Strong fundamentals'],
      weaknesses: ['Overall consistency', 'Short game', 'Putting'],
      recommendations: ['Focus on short game practice', 'Work on putting consistency', 'Develop pre-shot routine'],
      playStyle: 'Learning and improving, focusing on fundamentals',
      mentalGame: 'Developing confidence and consistency',
      practiceFocus: ['Short game', 'Putting', 'Fundamentals']
    };
  } else {
    return {
      user_id: userId,
      persona_name: 'Improving Beginner',
      strengths: ['Enthusiasm for improvement', 'Basic fundamentals', 'Willingness to learn'],
      weaknesses: ['Consistency', 'Short game', 'Course management'],
      recommendations: ['Focus on fundamentals', 'Take lessons with a pro', 'Practice short game regularly'],
      playStyle: 'Learning the basics, developing consistency',
      mentalGame: 'Building confidence and understanding',
      practiceFocus: ['Fundamentals', 'Short game', 'Course management']
    };
  }
} 