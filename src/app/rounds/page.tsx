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
  { value: 'scorecard', label: 'Scorecard Image' },
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

  // Scorecard image state
  const [scorecardImage, setScorecardImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleScorecardImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScorecardImage(file);
      setImagePreview(URL.createObjectURL(file));
      setLoading(true);

      try {
        // Here you would implement the AI scorecard reading logic
        // For now, we'll just show a loading state
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulated AI results
        setCourseName('Sample Golf Course');
        setScore('85');
        setFairwaysHit('8');
        setGreensInRegulation('6');
        setPutts('32');
        setRoundDate(new Date().toISOString().split('T')[0]);
        setTeePosition('middle');
        
        setSuccess('Scorecard processed successfully! Review the data below and submit if correct.');
      } catch (error) {
        setError('Failed to process scorecard image. Please try again or use manual entry.');
      } finally {
        setLoading(false);
      }
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
                <div className="font-medium">{course.name}</div>
                <div className="text-sm text-gray-500">{course.city}, {course.state}</div>
              </div>
            ))}
          </div>
        )}
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

      <div>
        <label htmlFor="score" className="block text-sm font-medium text-gray-700">
          Score
        </label>
        <input
          type="number"
          id="score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      <div>
        <label htmlFor="fairwaysHit" className="block text-sm font-medium text-gray-700">
          Fairways Hit (Optional)
        </label>
        <input
          type="number"
          id="fairwaysHit"
          value={fairwaysHit}
          onChange={(e) => setFairwaysHit(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="greensInRegulation" className="block text-sm font-medium text-gray-700">
          Greens in Regulation (Optional)
        </label>
        <input
          type="number"
          id="greensInRegulation"
          value={greensInRegulation}
          onChange={(e) => setGreensInRegulation(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="putts" className="block text-sm font-medium text-gray-700">
          Putts (Optional)
        </label>
        <input
          type="number"
          id="putts"
          value={putts}
          onChange={(e) => setPutts(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
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
                <div className="font-medium">{course.name}</div>
                <div className="text-sm text-gray-500">{course.city}, {course.state}</div>
              </div>
            ))}
          </div>
        )}
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hole</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strokes</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Putts</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fairway</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GIR</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {holes.map((hole, index) => (
              <tr key={index}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="number"
                    value={hole.strokes}
                    onChange={(e) => {
                      const newHoles = [...holes];
                      newHoles[index] = { ...hole, strokes: e.target.value };
                      setHoles(newHoles);
                    }}
                    className="p-1 border rounded w-16"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="number"
                    value={hole.putts}
                    onChange={(e) => {
                      const newHoles = [...holes];
                      newHoles[index] = { ...hole, putts: e.target.value };
                      setHoles(newHoles);
                    }}
                    className="p-1 border rounded w-16"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <select
                    value={hole.fairway}
                    onChange={(e) => {
                      const newHoles = [...holes];
                      newHoles[index] = { ...hole, fairway: e.target.value };
                      setHoles(newHoles);
                    }}
                    className="p-1 border rounded w-20"
                  >
                    <option value="">-</option>
                    <option value="hit">Hit</option>
                    <option value="miss">Miss</option>
                  </select>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <select
                    value={hole.green}
                    onChange={(e) => {
                      const newHoles = [...holes];
                      newHoles[index] = { ...hole, green: e.target.value };
                      setHoles(newHoles);
                    }}
                    className="p-1 border rounded w-20"
                  >
                    <option value="">-</option>
                    <option value="hit">Hit</option>
                    <option value="miss">Miss</option>
                  </select>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={hole.notes}
                    onChange={(e) => {
                      const newHoles = [...holes];
                      newHoles[index] = { ...hole, notes: e.target.value };
                      setHoles(newHoles);
                    }}
                    className="p-1 border rounded w-32"
                    placeholder="Notes"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
      >
        {loading ? 'Submitting...' : 'Submit Round'}
      </button>
    </form>
  );

  const renderScorecardUpload = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleScorecardImage}
          className="hidden"
          id="scorecard-upload"
        />
        <label
          htmlFor="scorecard-upload"
          className="cursor-pointer"
        >
          {imagePreview ? (
            <div className="space-y-2">
              <img
                src={imagePreview}
                alt="Scorecard preview"
                className="max-h-64 mx-auto"
              />
              <p className="text-sm text-gray-500">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Click to upload a photo of your scorecard
              </p>
            </div>
          )}
        </label>
      </div>

      {loading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Processing scorecard...</p>
        </div>
      )}

      {success && (
        <div className="space-y-4">
          <p className="text-green-600 text-sm">{success}</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Detected Round Data</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p className="font-medium">{courseName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Score</p>
                <p className="font-medium">{score}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fairways Hit</p>
                <p className="font-medium">{fairwaysHit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Greens in Regulation</p>
                <p className="font-medium">{greensInRegulation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Putts</p>
                <p className="font-medium">{putts}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{roundDate}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleBasicSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit Round'}
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
          <h1 className="text-2xl font-bold mb-6 text-center text-green-800">Log a Golf Round</h1>
          
          <div className="mb-6">
            <div className="flex space-x-4 justify-center">
              {SUBMISSION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSubmissionType(type.value)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    submissionType === type.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {submissionType === 'basic' && renderBasicForm()}
          {submissionType === 'hole-by-hole' && renderHoleByHoleForm()}
          {submissionType === 'scorecard' && renderScorecardUpload()}
        </div>
      </div>
    </div>
  );
}