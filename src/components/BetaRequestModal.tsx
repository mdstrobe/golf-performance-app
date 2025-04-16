import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BetaRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BetaRequestModal({ isOpen, onClose }: BetaRequestModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      console.log('Attempting to insert beta request for email:', email);
      const { data, error: emailError } = await supabase
        .from('beta_requests')
        .insert([{ email, requested_at: new Date().toISOString() }]);

      if (emailError) {
        console.error('Error inserting beta request:', emailError);
        setError(`Failed to send request: ${emailError.message}`);
        return;
      }

      console.log('Successfully inserted beta request:', data);
      setRequestSent(true);
      setEmail('');
    } catch (err: any) {
      console.error('Unexpected error in handleSubmit:', err);
      setError(`An unexpected error occurred: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Request Beta Access</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {requestSent ? (
          <div className="text-center py-4">
            <p className="text-green-600 mb-4">
              Thank you for your interest! We'll review your request and get back to you soon.
            </p>
            <button
              onClick={onClose}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Request Access
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 