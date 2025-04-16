import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

interface Insight {
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export async function POST(request: Request) {
  try {
    const { rounds } = await request.json();
    console.log('Received rounds data:', rounds);

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Model initialized:', model.model);

    const prompt = `Based on the following golf rounds data, generate exactly 4-6 specific insights and recommendations.
    
    Golf Rounds Data:
    ${JSON.stringify(rounds, null, 2)}
    
    For each insight, provide:
    1. A clear, specific title about one aspect of performance
    2. A detailed description of what the data shows
    3. A specific, actionable recommendation
    4. A priority level (high, medium, or low)
    
    Format your response as a clean JSON object with this exact structure:
    {
      "insights": [
        {
          "title": "Clear, specific title",
          "description": "Detailed description of the insight",
          "recommendation": "Specific, actionable recommendation",
          "priority": "high|medium|low"
        }
      ]
    }

    IMPORTANT:
    - Return ONLY valid JSON, no other text
    - Do not use markdown formatting
    - Each insight should focus on one specific aspect
    - Make recommendations specific and actionable`;

    console.log('Generating insights...');
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    console.log('Insights generated');

    const response = await result.response;
    const text = response.text();
    console.log('Raw response:', text);

    // Clean the response text
    const cleanedText = text
      .replace(/```json\s*|\s*```/g, '') // Remove markdown code blocks
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes with straight quotes
      .trim();
    
    console.log('Cleaned response:', cleanedText);

    try {
      const parsedResponse = JSON.parse(cleanedText);
      
      if (!parsedResponse.insights || !Array.isArray(parsedResponse.insights)) {
        throw new Error('Invalid response format');
      }

      // Validate and clean each insight
      const cleanedInsights = parsedResponse.insights.map((insight: Insight) => ({
        title: insight.title?.trim() || 'Performance Insight',
        description: insight.description?.trim() || 'No description provided',
        recommendation: insight.recommendation?.trim() || 'No recommendation provided',
        priority: ['high', 'medium', 'low'].includes(insight.priority?.toLowerCase()) 
          ? insight.priority.toLowerCase() 
          : 'medium'
      }));

      return NextResponse.json({ 
        success: true,
        insights: cleanedInsights
      });
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      // Return a single default insight if parsing fails
      return NextResponse.json({
        success: true,
        insights: [{
          title: "Performance Analysis",
          description: "Unable to generate detailed insights at this time. Please try again later.",
          recommendation: "Review your recent rounds manually and focus on consistent patterns.",
          priority: "medium"
        }]
      });
    }
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: 'Failed to generate insights',
      details: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
} 