'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { generatePersona } from '@/lib/persona';

// Tee position options
const TEE_POSITIONS = [
  { value: 'championship', label: 'Championship' },
  { value: 'blue', label: 'Blue' },
  { value: 'gold', label: 'Gold' },
  { value: 'white', label: 'White' },
  { value: 'ladies', label: 'Ladies' },
];

// Submission type options
const SUBMISSION_TYPES = [
  { value: 'basic', label: 'Basic Round' },
  { value: 'hole-by-hole', label: 'Hole by Hole' },
];

export default function RoundsPage() {
  const router = useRouter();
  const [submissionType, setSubmissionType] = useState('basic');
  const [courseName, setCourseName] = useState('');
  const [score, setScore] = useState('');
  const [fairwaysHit, setFairwaysHit] = useState('');
  const [greensInRegulation, setGreensInRegulation] = useState('');
  const [putts, setPutts] = useState('');
  const [roundDate, setRoundDate] = useState('');
  const [teePosition, setTeePosition] = useState('middle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; city: string; state: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hole-by-hole state
  const [holes, setHoles] = useState(Array(18).fill({
    strokes: '',
    putts: '',
    fairway: '',
    green: '',
    notes: ''
  }));

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchCourses = async () => {
      if (courseName.length < 2) {
        setSuggestions([]);
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('id, name, city, state')
        .ilike('name', `%${courseName}%`)
        .limit(5);

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      setSuggestions(data || []);
    };

    fetchCourses();
  }, [courseName]);

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to submit a round.');
      router.push('/login');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id,
          course_name: courseName,
          score: parseInt(score),
          fairways_hit: parseInt(fairwaysHit) || null,
          greens_in_regulation: parseInt(greensInRegulation) || null,
          putts: parseInt(putts) || null,
          round_date: roundDate,
          tee_position: teePosition,
        });

      if (insertError) throw insertError;

      const persona = await generatePersona(user.id, supabase);
      setSuccess(`Round submitted successfully! ${persona ? `Your persona: ${persona.persona_name}` : ''}`);
      
      // Reset form
      setCourseName('');
      setScore('');
      setFairwaysHit('');
      setGreensInRegulation('');
      setPutts('');
      setRoundDate('');
      setTeePosition('middle');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleHoleByHoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to submit a round.');
      router.push('/login');
      return;
    }

    try {
      // Calculate totals
      const totalStrokes = holes.reduce((sum, hole) => sum + (parseInt(hole.strokes) || 0), 0);
      const totalPutts = holes.reduce((sum, hole) => sum + (parseInt(hole.putts) || 0), 0);
      const fairwaysHit = holes.filter(hole => hole.fairway === 'hit').length;
      const greensInRegulation = holes.filter(hole => hole.green === 'hit').length;

      const { error: insertError } = await supabase
        .from('rounds')
        .insert({
          user_id: user.id,
          course_name: courseName,
          score: totalStrokes,
          fairways_hit: fairwaysHit,
          greens_in_regulation: greensInRegulation,
          putts: totalPutts,
          round_date: roundDate,
          tee_position: teePosition,
          hole_by_hole_data: holes,
        });

      if (insertError) throw insertError;

      const persona = await generatePersona(user.id, supabase);
      setSuccess(`Round submitted successfully! ${persona ? `Your persona: ${persona.persona_name}` : ''}`);
      
      // Reset form
      setCourseName('');
      setHoles(Array(18).fill({
        strokes: '',
        putts: '',
        fairway: '',
        green: '',
        notes: ''
      }));
      setRoundDate('');
      setTeePosition('middle');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicForm = () => (
    <form onSubmit={handleBasicSubmit} className="space-y-4">
      <div className="relative">
        <label htmlFor="courseName" className="block text-sm font-medium text-gray-700">
          Course Name
        </label>
        <input
          type="text"
          id="courseName"
          value={courseName}
          onChange={(e) => {
            setCourseName(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
          placeholder="Start typing to search for courses..."
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {suggestions.map((course) => (
              <div
                key={course.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setCourseName(course.name);
                  setShowSuggestions(false);
                }}
              >
                {course.name} - {course.city}, {course.state}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="score" className="block text-sm font-medium text-gray-700">
          Score
        </label>
        <input
          type="number"
          id="score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
        />
      </div>
      <div>
        <label htmlFor="fairwaysHit" className="block text-sm font-medium text-gray-700">
          Fairways Hit
        </label>
        <input
          type="number"
          id="fairwaysHit"
          value={fairwaysHit}
          onChange={(e) => setFairwaysHit(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
        />
      </div>
      <div>
        <label htmlFor="greensInRegulation" className="block text-sm font-medium text-gray-700">
          Greens in Regulation
        </label>
        <input
          type="number"
          id="greensInRegulation"
          value={greensInRegulation}
          onChange={(e) => setGreensInRegulation(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
        />
      </div>
      <div>
        <label htmlFor="putts" className="block text-sm font-medium text-gray-700">
          Putts
        </label>
        <input
          type="number"
          id="putts"
          value={putts}
          onChange={(e) => setPutts(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
        />
      </div>
      <div>
        <label htmlFor="roundDate" className="block text-sm font-medium text-gray-700">
          Round Date
        </label>
        <input
          type="date"
          id="roundDate"
          value={roundDate}
          onChange={(e) => setRoundDate(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
        />
      </div>
      <div>
        <label htmlFor="teePosition" className="block text-sm font-medium text-gray-700">
          Tee Position
        </label>
        <select
          id="teePosition"
          value={teePosition}
          onChange={(e) => setTeePosition(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
        >
          {TEE_POSITIONS.map((position) => (
            <option key={position.value} value={position.value}>
              {position.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Round'}
      </button>
    </form>
  );

  const renderHoleByHoleForm = () => (
    <form onSubmit={handleHoleByHoleSubmit} className="space-y-4">
      <div className="relative">
        <label htmlFor="courseName" className="block text-sm font-medium text-gray-700">
          Course Name
        </label>
        <input
          type="text"
          id="courseName"
          value={courseName}
          onChange={(e) => {
            setCourseName(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
          placeholder="Start typing to search for courses..."
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {suggestions.map((course) => (
              <div
                key={course.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setCourseName(course.name);
                  setShowSuggestions(false);
                }}
              >
                {course.name} - {course.city}, {course.state}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="roundDate" className="block text-sm font-medium text-gray-700">
          Round Date
        </label>
        <input
          type="date"
          id="roundDate"
          value={roundDate}
          onChange={(e) => setRoundDate(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
        />
      </div>
      <div>
        <label htmlFor="teePosition" className="block text-sm font-medium text-gray-700">
          Tee Position
        </label>
        <select
          id="teePosition"
          value={teePosition}
          onChange={(e) => setTeePosition(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
          required
        >
          {TEE_POSITIONS.map((position) => (
            <option key={position.value} value={position.value}>
              {position.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {holes.map((hole, index) => (
          <div key={index} className="border p-4 rounded-md">
            <h3 className="font-medium mb-2">Hole {index + 1}</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600">Strokes</label>
                <input
                  type="number"
                  value={hole.strokes}
                  onChange={(e) => {
                    const newHoles = [...holes];
                    newHoles[index] = { ...newHoles[index], strokes: e.target.value };
                    setHoles(newHoles);
                  }}
                  className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Putts</label>
                <input
                  type="number"
                  value={hole.putts}
                  onChange={(e) => {
                    const newHoles = [...holes];
                    newHoles[index] = { ...newHoles[index], putts: e.target.value };
                    setHoles(newHoles);
                  }}
                  className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Fairway</label>
                <select
                  value={hole.fairway}
                  onChange={(e) => {
                    const newHoles = [...holes];
                    newHoles[index] = { ...newHoles[index], fairway: e.target.value };
                    setHoles(newHoles);
                  }}
                  className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500"
                >
                  <option value="">Select</option>
                  <option value="hit">Hit</option>
                  <option value="miss">Miss</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Green</label>
                <select
                  value={hole.green}
                  onChange={(e) => {
                    const newHoles = [...holes];
                    newHoles[index] = { ...newHoles[index], green: e.target.value };
                    setHoles(newHoles);
                  }}
                  className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500"
                >
                  <option value="">Select</option>
                  <option value="hit">Hit</option>
                  <option value="miss">Miss</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Notes</label>
                <input
                  type="text"
                  value={hole.notes}
                  onChange={(e) => {
                    const newHoles = [...holes];
                    newHoles[index] = { ...newHoles[index], notes: e.target.value };
                    setHoles(newHoles);
                  }}
                  className="w-full p-2 border rounded-md text-gray-900 placeholder-gray-500"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Round'}
      </button>
    </form>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-green-800">Log a Round</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Submission Type
          </label>
          <div className="flex space-x-4">
            <select
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500"
            >
              {SUBMISSION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {submissionType === 'basic' && renderBasicForm()}
        {submissionType === 'hole-by-hole' && renderHoleByHoleForm()}
      </div>
    </div>
  );
}