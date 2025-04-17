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
  { value: 'scorecard', label: 'Upload Scorecard' }
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
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">Log a Round</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Round Card */}
        <div 
          className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
            submissionType === 'basic' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setSubmissionType('basic')}
        >
          <h2 className="text-xl font-semibold text-green-800 mb-2">Basic Round</h2>
          <p className="text-gray-600">Quick entry of your total score and key stats.</p>
        </div>

        {/* Hole by Hole Card */}
        <div 
          className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
            submissionType === 'hole-by-hole' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setSubmissionType('hole-by-hole')}
        >
          <h2 className="text-xl font-semibold text-green-800 mb-2">Hole by Hole</h2>
          <p className="text-gray-600">Detailed entry for each hole including strokes, putts, and accuracy.</p>
        </div>

        {/* Scorecard Upload Card */}
        <div 
          className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
            submissionType === 'scorecard' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setSubmissionType('scorecard')}
        >
          <h2 className="text-xl font-semibold text-green-800 mb-2">Upload Scorecard</h2>
          <p className="text-gray-600">Upload a photo of your scorecard for automatic processing.</p>
        </div>
      </div>

      <div className="mt-8">
        {submissionType === 'basic' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-green-800 mb-4">Basic Round Details</h3>
            {renderBasicForm()}
          </div>
        )}

        {submissionType === 'hole-by-hole' && (
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-green-800 mb-4">Hole by Hole Details</h3>
            <div className="mb-6 space-y-4">
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
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="roundDate" className="block text-sm font-medium text-gray-700">
                    Round Date
                  </label>
                  <input
                    type="date"
                    id="roundDate"
                    value={roundDate}
                    onChange={(e) => setRoundDate(e.target.value)}
                    className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {TEE_POSITIONS.map((position) => (
                      <option key={position.value} value={position.value}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Front Nine */}
            <div className="mb-8">
              <h4 className="text-lg font-medium text-green-700 mb-4">Front Nine</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {holes.slice(0, 9).map((hole, index) => (
                  <div key={index} className="border p-4 rounded-md bg-gray-50">
                    <h5 className="font-medium mb-2">Hole {index + 1}</h5>
                    <div className="grid grid-cols-2 gap-2">
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
                          className="w-full p-2 border rounded-md"
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
                          className="w-full p-2 border rounded-md"
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
                          className="w-full p-2 border rounded-md"
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
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="hit">Hit</option>
                          <option value="miss">Miss</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Back Nine */}
            <div>
              <h4 className="text-lg font-medium text-green-700 mb-4">Back Nine</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {holes.slice(9, 18).map((hole, index) => (
                  <div key={index + 9} className="border p-4 rounded-md bg-gray-50">
                    <h5 className="font-medium mb-2">Hole {index + 10}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm text-gray-600">Strokes</label>
                        <input
                          type="number"
                          value={hole.strokes}
                          onChange={(e) => {
                            const newHoles = [...holes];
                            newHoles[index + 9] = { ...newHoles[index + 9], strokes: e.target.value };
                            setHoles(newHoles);
                          }}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600">Putts</label>
                        <input
                          type="number"
                          value={hole.putts}
                          onChange={(e) => {
                            const newHoles = [...holes];
                            newHoles[index + 9] = { ...newHoles[index + 9], putts: e.target.value };
                            setHoles(newHoles);
                          }}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600">Fairway</label>
                        <select
                          value={hole.fairway}
                          onChange={(e) => {
                            const newHoles = [...holes];
                            newHoles[index + 9] = { ...newHoles[index + 9], fairway: e.target.value };
                            setHoles(newHoles);
                          }}
                          className="w-full p-2 border rounded-md"
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
                            newHoles[index + 9] = { ...newHoles[index + 9], green: e.target.value };
                            setHoles(newHoles);
                          }}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="hit">Hit</option>
                          <option value="miss">Miss</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleHoleByHoleSubmit}
                disabled={loading}
                className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Round'}
              </button>
            </div>
          </div>
        )}

        {submissionType === 'scorecard' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-green-800 mb-4">Upload Scorecard</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              <button
                className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled
              >
                Coming Soon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}