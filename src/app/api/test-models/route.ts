import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET() {
  try {
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Model initialized:', model.model);

    const prompt = 'Generate a short test message to verify the API is working.';

    console.log('Generating test content...');
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    console.log('Content generated');

    const response = await result.response;
    const text = response.text();
    console.log('Raw response:', text);

    return NextResponse.json({ 
      success: true,
      message: text
    });
  } catch (error) {
    console.error('Detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to generate test content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 