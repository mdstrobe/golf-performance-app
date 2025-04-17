'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { generatePersona } from '@/lib/persona';
import GolfBag from '@/components/GolfBag';
// import { analyzeHoleByHolePerformance } from '@/lib/insights';

interface Round {
  id: string;
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

interface Stats {
  averageScore: number;
  roundsPlayed: number;
  fairwaysHitPercentage: number;
  greensInRegulationPercentage: number;
  averagePutts: number;
  bestScore: number;
  worstScore: number;
  scoreTrend: number[];
  fairwaysTrend: number[];
  girTrend: number[];
  puttsTrend: number[];
}

interface Insight {
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface Persona {
  id?: string;
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

interface ExpandedInsights {
  [key: number]: boolean;
}

interface StatsTrend {
  label: string;
  trend: 'improving' | 'declining' | 'stable';
  percentage: number;
  insight: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentRounds, setRecentRounds] = useState<Round[]>([]);
  const [stats, setStats] = useState<Stats>({
    averageScore: 0,
    roundsPlayed: 0,
    fairwaysHitPercentage: 0,
    greensInRegulationPercentage: 0,
    averagePutts: 0,
    bestScore: 0,
    worstScore: 0,
    scoreTrend: [],
    fairwaysTrend: [],
    girTrend: [],
    puttsTrend: []
  });
  const [persona, setPersona] = useState<Persona | null>(null);
  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<ExpandedInsights>({});
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedPersona, setExpandedPersona] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsTrends, setStatsTrends] = useState<StatsTrend[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [showAllRoundsModal, setShowAllRoundsModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: 'round_date' | 'score' | 'course_name';
    direction: 'asc' | 'desc';
  }>({
    key: 'round_date',
    direction: 'desc'
  });

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        setUser(session.user);
        fetchRounds(session.user.id);
        fetchPersona(session.user.id);
      } catch (error) {
        console.error('Error fetching session:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchPersona = async (userId: string) => {
    try {
      const personaData = await generatePersona(userId, supabase);
      setPersona(personaData);
    } catch (error) {
      console.error('Error fetching persona:', error);
    }
  };

  const fetchInsights = async (rounds: Round[]) => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rounds }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      setAiInsights(data.insights || null);

    } catch (error) {
      console.error('Error fetching insights:', error);
      setAiInsights(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchRounds = async (userId: string) => {
    try {
      const { data: rounds, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('user_id', userId)
        .order('round_date', { ascending: false });

      if (error) throw error;

      setRecentRounds(rounds || []);
      
      if (rounds && rounds.length > 0) {
        const totalScore = rounds.reduce((acc, round) => acc + round.score, 0);
        const totalFairways = rounds.reduce((acc, round) => acc + (round.fairways_hit || 0), 0);
        const totalGIR = rounds.reduce((acc, round) => acc + (round.greens_in_regulation || 0), 0);
        const totalPutts = rounds.reduce((acc, round) => acc + (round.putts || 0), 0);
        const scores = rounds.map(round => round.score);
        
        // Calculate trends (last 10 rounds)
        const last10Rounds = rounds.slice(0, 10).reverse();
        const fairwaysTrend = last10Rounds.map(round => round.fairways_hit || 0);
        const girTrend = last10Rounds.map(round => round.greens_in_regulation || 0);
        const puttsTrend = last10Rounds.map(round => round.putts || 0);
        
        const newStats = {
          averageScore: Math.round(totalScore / rounds.length),
          roundsPlayed: rounds.length,
          fairwaysHitPercentage: Math.round((totalFairways / (rounds.length * 14)) * 100),
          greensInRegulationPercentage: Math.round((totalGIR / (rounds.length * 18)) * 100),
          averagePutts: Math.round((totalPutts / rounds.length) * 10) / 10,
          bestScore: Math.min(...scores),
          worstScore: Math.max(...scores),
          scoreTrend: scores.slice(0, 10).reverse(),
          fairwaysTrend,
          girTrend,
          puttsTrend
        };
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    }
  };

  const handleGenerateInsights = async () => {
    if (recentRounds.length < 2) {
      alert('You need at least 2 rounds to generate insights');
      return;
    }
    await fetchInsights(recentRounds);
  };

  const toggleInsight = (index: number) => {
    setExpandedInsights(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setShowEditModal(true);
  };

  const handleUpdateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;

    try {
      const { error } = await supabase
        .from('rounds')
        .update({
          course_name: editingRound.course_name,
          score: editingRound.score,
          fairways_hit: editingRound.fairways_hit,
          greens_in_regulation: editingRound.greens_in_regulation,
          putts: editingRound.putts,
          round_date: editingRound.round_date,
          tee_position: editingRound.tee_position
        })
        .eq('id', editingRound.id);

      if (error) throw error;

      // Refresh rounds data
      if (user) {
        fetchRounds(user.id);
      }
      setShowEditModal(false);
      setEditingRound(null);
    } catch (error) {
      console.error('Error updating round:', error);
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm('Are you sure you want to delete this round?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);

      if (error) throw error;

      // Refresh rounds data
      if (user) {
        fetchRounds(user.id);
      }
    } catch (error) {
      console.error('Error deleting round:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const analyzeTrends = async () => {
    setLoadingTrends(true);
    try {
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          scores: stats.scoreTrend,
          fairways: stats.fairwaysTrend,
          gir: stats.girTrend,
          putts: stats.puttsTrend
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze trends');
      }

      const data = await response.json();
      setStatsTrends(data.trends);
    } catch (error) {
      console.error('Error analyzing trends:', error);
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleViewStats = () => {
    setShowStatsModal(true);
    analyzeTrends();
  };

  // Add sorting function
  const sortRounds = (rounds: Round[]) => {
    return [...rounds].sort((a, b) => {
      if (sortConfig.key === 'round_date') {
        const dateA = new Date(a.round_date).getTime();
        const dateB = new Date(b.round_date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'score') {
        return sortConfig.direction === 'asc' ? a.score - b.score : b.score - a.score;
      }
      // course_name
      const nameA = a.course_name.toLowerCase();
      const nameB = b.course_name.toLowerCase();
      return sortConfig.direction === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  };

  const handleSort = (key: 'round_date' | 'score' | 'course_name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-800">Welcome back, {user.email?.split('@')[0]}</h1>
            <p className="text-gray-600 mt-2">Track your progress and improve your game</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <button 
              onClick={() => router.push('/rounds')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Record New Round
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
              Schedule Practice
            </button>
            <button 
              onClick={handleViewStats}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View Statistics
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Average Score:</span>
                <span className="font-semibold text-green-800">{stats.averageScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rounds Played:</span>
                <span className="font-semibold text-green-800">{stats.roundsPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fairways Hit %:</span>
                <span className="font-semibold text-green-800">{stats.fairwaysHitPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GIR %:</span>
                <span className="font-semibold text-green-800">{stats.greensInRegulationPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Putts:</span>
                <span className="font-semibold text-green-800">{stats.averagePutts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Score:</span>
                <span className="font-semibold text-green-800">{stats.bestScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Worst Score:</span>
                <span className="font-semibold text-green-800">{stats.worstScore}</span>
              </div>
            </div>
          </div>

          {/* Recent Rounds Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-800">Recent Rounds</h2>
              <button
                onClick={() => setShowAllRoundsModal(true)}
                className="text-green-600 hover:text-green-800 flex items-center space-x-1"
              >
                <span className="text-sm">View All</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {recentRounds.length > 0 ? (
                recentRounds.slice(0, 5).map((round, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-800">{round.course_name}</p>
                        <p className="text-sm text-gray-500">{new Date(round.round_date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">
                          {round.fairways_hit || 0} FW | {round.greens_in_regulation || 0} GIR | {round.putts || 0} putts
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-green-800">{round.score}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEditRound(round)}
                            className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                            title="Edit round"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRound(round.id)}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete round"
                            disabled={isDeleting}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No rounds recorded yet</p>
              )}
            </div>
          </div>

          {/* Golfer Persona Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-800">Your Golfer Persona</h2>
              <button
                onClick={() => fetchPersona(user?.id || '')}
                className="p-2 text-green-600 hover:text-green-800 transition-colors"
                title="Refresh Persona"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {persona ? (
              <div>
                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="font-semibold text-green-800 text-lg mb-2">{persona.persona_name}</h3>
                  <p className="text-gray-600 mb-2">{persona.playStyle}</p>
                  
                  {/* Condensed View */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700">Key Strength</span>
                      <span className="text-sm text-gray-600">{persona.strengths[0]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700">Focus Area</span>
                      <span className="text-sm text-gray-600">{persona.weaknesses[0]}</span>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => setExpandedPersona(!expandedPersona)}
                    className="mt-4 w-full flex items-center justify-center space-x-2 text-green-600 hover:text-green-800"
                  >
                    <span className="text-sm">{expandedPersona ? 'Show Less' : 'Show More'}</span>
                    <svg 
                      className={`w-4 h-4 transform transition-transform ${expandedPersona ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedPersona && (
                  <div className="mt-4 space-y-4 bg-white p-4 rounded-md border border-gray-200">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">All Strengths</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {persona.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Areas for Improvement</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {persona.weaknesses.map((weakness, index) => (
                          <li key={index}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Practice Focus</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {persona.practiceFocus.map((focus, index) => (
                          <li key={index}>{focus}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Mental Game</h4>
                      <p className="text-gray-600">{persona.mentalGame}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {persona.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Play more rounds to generate your golfer persona</p>
            )}
          </div>
        </div>

        {/* Golf Bag Card */}
        <div className="mt-6">
          <GolfBag />
        </div>

        {/* AI-Powered Insights Card */}
        <div className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-800">AI-Powered Insights</h2>
              {recentRounds.length >= 2 && !aiInsights && (
                <button
                  onClick={handleGenerateInsights}
                  disabled={loadingInsights}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loadingInsights ? 'Generating...' : 'Generate Insights'}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {loadingInsights ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                </div>
              ) : aiInsights && aiInsights.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {aiInsights.map((insight, index) => (
                    <div 
                      key={index} 
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleInsight(index)}
                        className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
                          expandedInsights[index] ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            insight.priority === 'high' ? 'bg-red-500' :
                            insight.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></span>
                          <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                        </div>
                        <svg 
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${
                            expandedInsights[index] ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedInsights[index] && (
                        <div className="p-4 border-t border-gray-200 bg-white">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Analysis</h4>
                              <p className="text-gray-700">{insight.description}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-md">
                              <h4 className="text-sm font-medium text-green-800 mb-1">Recommendation</h4>
                              <p className="text-green-700">{insight.recommendation}</p>
                            </div>
                            <div className="flex items-center justify-end">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                                insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {insight.priority} priority
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {recentRounds.length >= 2 
                    ? "You have enough rounds to analyze! Click 'Generate Insights' to get personalized recommendations."
                    : "No insights available yet. Submit more rounds to get personalized insights and recommendations."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Round Modal */}
      {showEditModal && editingRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Round</h3>
            <form onSubmit={handleUpdateRound} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Course Name</label>
                <input
                  type="text"
                  value={editingRound.course_name}
                  onChange={(e) => setEditingRound({...editingRound, course_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Score</label>
                <input
                  type="number"
                  value={editingRound.score}
                  onChange={(e) => setEditingRound({...editingRound, score: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fairways Hit</label>
                  <input
                    type="number"
                    value={editingRound.fairways_hit}
                    onChange={(e) => setEditingRound({...editingRound, fairways_hit: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GIR</label>
                  <input
                    type="number"
                    value={editingRound.greens_in_regulation}
                    onChange={(e) => setEditingRound({...editingRound, greens_in_regulation: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Putts</label>
                <input
                  type="number"
                  value={editingRound.putts}
                  onChange={(e) => setEditingRound({...editingRound, putts: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={editingRound.round_date}
                  onChange={(e) => setEditingRound({...editingRound, round_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tee Position</label>
                <select
                  value={editingRound.tee_position}
                  onChange={(e) => setEditingRound({...editingRound, tee_position: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="forward">Forward</option>
                  <option value="middle">Middle</option>
                  <option value="back">Back</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRound(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* All Rounds Modal */}
      {showAllRoundsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-green-800">Round History</h3>
                <button
                  onClick={() => setShowAllRoundsModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('round_date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        {sortConfig.key === 'round_date' && (
                          <svg className={`w-4 h-4 transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('course_name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Course</span>
                        {sortConfig.key === 'course_name' && (
                          <svg className={`w-4 h-4 transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('score')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Score</span>
                        {sortConfig.key === 'score' && (
                          <svg className={`w-4 h-4 transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortRounds(recentRounds).map((round, index) => (
                    <tr key={round.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(round.round_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{round.course_name}</div>
                        <div className="text-sm text-gray-500">{round.tee_position} tees</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{round.score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                            FW: {round.fairways_hit || 0}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            GIR: {round.greens_in_regulation || 0}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Putts: {round.putts || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRound(round)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit round"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRound(round.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete round"
                            disabled={isDeleting}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Total Rounds: {recentRounds.length}
                </span>
                <button
                  onClick={() => setShowAllRoundsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-green-800">Detailed Statistics</h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Score Trends */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Score History</h4>
                <div className="h-48 bg-white p-4 rounded-md">
                  <div className="flex items-end justify-between h-32 space-x-1">
                    {stats.scoreTrend.map((score, index) => {
                      // Calculate the height percentage (lower scores = taller bars)
                      const maxScore = Math.max(...stats.scoreTrend);
                      const minScore = Math.min(...stats.scoreTrend);
                      const scoreRange = maxScore - minScore;
                      const heightPercentage = scoreRange > 0 
                        ? ((score - minScore) / scoreRange) * 80 + 20 // Scale to 20-100% range
                        : 50; // If all scores are the same, show 50% height
                      
                      return (
                        <div
                          key={index}
                          className="w-8 bg-green-500 rounded-t flex flex-col items-center relative group"
                          style={{ height: `${heightPercentage}%` }}
                        >
                          <span className="text-xs font-medium absolute -top-5 text-gray-700">{score}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-4">
                    <span>Oldest</span>
                    <span>Most Recent</span>
                  </div>
                </div>
              </div>

              {/* Key Stats */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800 mb-4">Performance Metrics</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Score:</span>
                    <span className="font-semibold text-green-800">{stats.averageScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Best Score:</span>
                    <span className="font-semibold text-green-800">{stats.bestScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fairways Hit %:</span>
                    <span className="font-semibold text-green-800">{stats.fairwaysHitPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">GIR %:</span>
                    <span className="font-semibold text-green-800">{stats.greensInRegulationPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Putts:</span>
                    <span className="font-semibold text-green-800">{stats.averagePutts}</span>
                  </div>
                </div>
              </div>

              {/* Trend Analysis */}
              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800 mb-4">AI Trend Analysis</h4>
                {loadingTrends ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statsTrends.map((trend, index) => (
                      <div key={index} className="bg-white p-4 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">{trend.label}</span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            trend.trend === 'improving' ? 'bg-green-100 text-green-800' :
                            trend.trend === 'declining' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {trend.trend}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{trend.insight}</p>
                        {trend.percentage !== 0 && (
                          <div className="mt-2 text-sm">
                            <span className={trend.trend === 'improving' ? 'text-green-600' : 'text-red-600'}>
                              {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
                            </span>
                            <span className="text-gray-500"> change</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-green-800 text-white p-4 text-center">
        <p>&copy; 2025 Golf Performance App. All rights reserved.</p>
      </footer>
    </div>
  );
}