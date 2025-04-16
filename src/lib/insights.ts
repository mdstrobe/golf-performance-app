interface HoleData {
  strokes: number;
  putts: number;
  fairway: string;
  green: string;
}

export async function analyzeHoleByHolePerformance(holeData: HoleData[]) {
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