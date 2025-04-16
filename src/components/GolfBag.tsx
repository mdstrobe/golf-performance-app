'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Club {
  id: string;
  name: string;
  brand: string;
  model: string;
  loft: number;
  typical_distance: number;
}

export default function GolfBag() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('user_id', user.id)
          .order('typical_distance', { ascending: false })
          .limit(5);

        if (error) throw error;
        setClubs(data || []);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-green-800">My Golf Bag</h2>
        <button
          onClick={() => router.push('/golf-bag')}
          className="text-green-600 hover:text-green-700 text-sm"
        >
          Manage Clubs
        </button>
      </div>
      <div className="space-y-4">
        {clubs.length > 0 ? (
          clubs.map((club) => (
            <div key={club.id} className="border-b border-gray-100 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-green-800">{club.name}</p>
                  <p className="text-sm text-gray-500">
                    {club.brand} {club.model} | {club.loft}° | {club.typical_distance} yards
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-2">No clubs added yet</p>
            <button
              onClick={() => router.push('/golf-bag')}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              Add your first club
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 