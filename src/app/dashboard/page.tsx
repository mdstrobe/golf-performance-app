'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { generatePersona } from '@/lib/persona';
import GolfBag from '@/components/GolfBag';
import { generateGolfInsights, analyzeHoleByHolePerformance } from '@/lib/openai';

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
}

interface Insight {
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface HoleAnalysis {
  analysis: {
    scoringPatterns: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

interface ExpandedInsights {
  [key: number]: boolean;
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
    scoreTrend: []
  });
  const [persona, setPersona] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [holeAnalysis, setHoleAnalysis] = useState<HoleAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<ExpandedInsights>({});
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchInsights = async (rounds: Round[], stats: Stats) => {
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

      // If the most recent round has hole-by-hole data, analyze it
      const latestRound = rounds[0];
      if (latestRound?.hole_by_hole_data) {
        const analysis = await analyzeHoleByHolePerformance(latestRound.hole_by_hole_data);
        setHoleAnalysis(analysis);
      }
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
      
      // Calculate detailed stats
      if (rounds && rounds.length > 0) {
        const totalScore = rounds.reduce((acc, round) => acc + round.score, 0);
        const totalFairways = rounds.reduce((acc, round) => acc + (round.fairways_hit || 0), 0);
        const totalGIR = rounds.reduce((acc, round) => acc + (round.greens_in_regulation || 0), 0);
        const totalPutts = rounds.reduce((acc, round) => acc + (round.putts || 0), 0);
        const scores = rounds.map(round => round.score);
        
        const newStats = {
          averageScore: Math.round(totalScore / rounds.length),
          roundsPlayed: rounds.length,
          fairwaysHitPercentage: Math.round((totalFairways / (rounds.length * 14)) * 100),
          greensInRegulationPercentage: Math.round((totalGIR / (rounds.length * 18)) * 100),
          averagePutts: Math.round((totalPutts / rounds.length) * 10) / 10,
          bestScore: Math.min(...scores),
          worstScore: Math.max(...scores),
          scoreTrend: scores.slice(0, 5).reverse()
        };
        
        setStats(newStats);
        // Fetch AI insights after stats are updated
        fetchInsights(rounds, newStats);
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800">Welcome back, {user.email?.split('@')[0]}</h1>
          <p className="text-gray-600 mt-2">Track your progress and improve your game</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Overview Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Average Score:</span>
                <span className="font-semibold text-green-800">{stats.averageScore || 'N/A'}</span>
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
            <h2 className="text-xl font-semibold text-green-800 mb-4">Recent Rounds</h2>
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

          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/rounds')}
                className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors"
              >
                Record New Round
              </button>
              <button className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors">
                Schedule Practice
              </button>
              <button className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors">
                View Statistics
              </button>
            </div>
          </div>

          {/* Golfer Persona Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Your Golfer Persona</h2>
            {persona ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="font-semibold text-green-800">{persona.persona_name}</h3>
                  <p className="text-gray-600 mt-2">{persona.description}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Strengths</h4>
                  <p className="text-gray-600">{persona.strengths}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">Areas for Improvement</h4>
                  <p className="text-gray-600">{persona.weaknesses}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Play more rounds to generate your golfer persona</p>
            )}
          </div>

          {/* Golf Bag Card */}
          <GolfBag />

          {/* Insights Card */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-green-800 mb-4">AI-Powered Insights</h2>
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
                <p className="text-gray-500 text-center py-8">No insights available yet. Submit more rounds to get personalized recommendations.</p>
              )}
            </div>

            {/* Hole-by-Hole Analysis */}
            {holeAnalysis && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Latest Round Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-green-800 mb-2">Strengths</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {holeAnalysis.analysis.strengths.map((strength, index) => (
                        <li key={index} className="text-green-700">{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-red-800 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {holeAnalysis.analysis.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-red-700">{weakness}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {holeAnalysis.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Round Modal */}
      {showEditModal && editingRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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

      <footer className="bg-green-800 text-white p-4 text-center">
        <p>&copy; 2025 Golf Performance App. All rights reserved.</p>
      </footer>
    </div>
  );
}