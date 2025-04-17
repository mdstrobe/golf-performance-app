import { NextResponse } from 'next/server';

interface TrendData {
  scores: number[];
  fairways: number[];
  gir: number[];
  putts: number[];
}

function calculateTrend(data: number[], isScoreMetric: boolean = false): {
  trend: 'improving' | 'declining' | 'stable';
  percentage: number;
} {
  if (data.length < 2) return { trend: 'stable', percentage: 0 };

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  const threshold = 3; // 3% change threshold for significance

  if (Math.abs(percentageChange) < threshold) {
    return { trend: 'stable', percentage: Math.round(percentageChange) };
  }

  return {
    trend: isScoreMetric ? 
      (percentageChange < 0 ? 'improving' : 'declining') :
      (percentageChange > 0 ? 'improving' : 'declining'),
    percentage: Math.round(percentageChange)
  };
}

function generateInsight(label: string, trend: string, metric: string, percentage: number): string {
  const trendWords = {
    improving: ['improvement', 'better', 'progressing'],
    declining: ['decline', 'struggling', 'challenges'],
    stable: ['consistent', 'steady', 'maintaining']
  };

  const randomWord = (words: string[]) => words[Math.floor(Math.random() * words.length)];

  if (trend === 'stable') {
    return `Your ${metric} has remained ${randomWord(trendWords.stable)} over the last 10 rounds. Keep working on consistency.`;
  }

  if (trend === 'improving') {
    return `Your ${metric} shows a ${percentage}% ${randomWord(trendWords.improving)}. The practice is paying off!`;
  }

  return `Your ${metric} shows a ${percentage}% ${randomWord(trendWords.declining)}. Consider focusing on ${metric} in your next practice session.`;
}

export async function POST(request: Request) {
  try {
    const data: TrendData = await request.json();
    const { scores, fairways, gir, putts } = data;

    const scoreTrend = calculateTrend(scores, true);
    const fairwaysTrend = calculateTrend(fairways);
    const girTrend = calculateTrend(gir);
    const puttsTrend = calculateTrend(putts);

    const trends = [
      {
        label: 'Scoring',
        ...scoreTrend,
        insight: generateInsight('Scoring', scoreTrend.trend, 'scoring', scoreTrend.percentage)
      },
      {
        label: 'Fairways Hit',
        ...fairwaysTrend,
        insight: generateInsight('Fairways', fairwaysTrend.trend, 'accuracy off the tee', fairwaysTrend.percentage)
      },
      {
        label: 'Greens in Regulation',
        ...girTrend,
        insight: generateInsight('GIR', girTrend.trend, 'approach play', girTrend.percentage)
      },
      {
        label: 'Putting',
        ...puttsTrend,
        insight: generateInsight('Putting', puttsTrend.trend, 'putting', puttsTrend.percentage)
      }
    ];

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trends' },
      { status: 500 }
    );
  }
} 