import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET() {
  try {
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    console.log('Model initialized:', model.model);

    console.log('Generating content...');
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    });
    console.log('Content generated');

    const response = await result.response;
    const text = response.text();
    console.log('Response received:', text);
    
    return NextResponse.json({ 
      success: true,
      response: text,
      modelInfo: model.model
    });
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: 'Failed to test model',
      details: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
} 