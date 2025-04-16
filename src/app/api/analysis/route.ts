import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface HoleData {
  strokes: number;
  putts: number;
  fairway: string;
  green: string;
}

export async function POST(request: Request) {
  try {
    const { holeData } = await request.json();

    const prompt = `Analyze this hole-by-hole performance data and provide specific insights about patterns and areas for improvement:

${holeData.map((hole: HoleData, index: number) => `
Hole ${index + 1}:
- Strokes: ${hole.strokes}
- Putts: ${hole.putts}
- Fairway: ${hole.fairway}
- GIR: ${hole.green}
`).join('\n')}

Please provide specific insights about:
1. Scoring patterns (which holes are consistently better/worse)
2. Putting performance
3. Driving accuracy
4. Greens in regulation
5. Any noticeable trends or patterns

Format the response as a JSON object with the following structure:
{
  "analysis": {
    "scoringPatterns": string[],
    "strengths": string[],
    "weaknesses": string[],
    "recommendations": string[]
  }
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    const response = await result.response;
    const text = response.text();
    
    try {
      const parsedResponse = JSON.parse(text);
      return NextResponse.json(parsedResponse);
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error analyzing hole-by-hole performance:', error);
    return NextResponse.json({ error: 'Failed to analyze performance' }, { status: 500 });
  }
} 