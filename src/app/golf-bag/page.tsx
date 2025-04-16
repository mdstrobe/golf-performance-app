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
  user_id: string;
}

export default function GolfBagPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [newClub, setNewClub] = useState({
    name: '',
    brand: '',
    model: '',
    loft: '',
    typical_distance: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      fetchClubs(user.id);
    };
    checkAuth();
  }, [router]);

  const fetchClubs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('user_id', userId)
        .order('typical_distance', { ascending: false });

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('clubs')
        .insert({
          ...newClub,
          user_id: user.id,
          loft: parseFloat(newClub.loft),
          typical_distance: parseFloat(newClub.typical_distance)
        });

      if (error) throw error;
      
      // Refresh clubs list
      fetchClubs(user.id);
      // Reset form
      setNewClub({
        name: '',
        brand: '',
        model: '',
        loft: '',
        typical_distance: ''
      });
    } catch (error) {
      console.error('Error adding club:', error);
    }
  };

  const handleUpdateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;

    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: editingClub.name,
          brand: editingClub.brand,
          model: editingClub.model,
          loft: editingClub.loft,
          typical_distance: editingClub.typical_distance
        })
        .eq('id', editingClub.id);

      if (error) throw error;
      
      // Refresh clubs list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchClubs(user.id);
      setEditingClub(null);
    } catch (error) {
      console.error('Error updating club:', error);
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    try {
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (error) throw error;
      
      // Refresh clubs list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchClubs(user.id);
    } catch (error) {
      console.error('Error deleting club:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800">My Golf Bag</h1>
          <p className="text-gray-600 mt-2">Manage your clubs and track your distances</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Club Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Add New Club</h2>
            <form onSubmit={handleAddClub} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Club Name</label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <input
                  type="text"
                  value={newClub.brand}
                  onChange={(e) => setNewClub({ ...newClub, brand: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={newClub.model}
                  onChange={(e) => setNewClub({ ...newClub, model: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loft (degrees)</label>
                <input
                  type="number"
                  value={newClub.loft}
                  onChange={(e) => setNewClub({ ...newClub, loft: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Typical Distance (yards)</label>
                <input
                  type="number"
                  value={newClub.typical_distance}
                  onChange={(e) => setNewClub({ ...newClub, typical_distance: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Add Club
              </button>
            </form>
          </div>

          {/* Club List */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-green-800 mb-4">My Clubs</h2>
            <div className="space-y-4">
              {clubs.length > 0 ? (
                clubs.map((club) => (
                  <div key={club.id} className="border-b border-gray-100 pb-4">
                    {editingClub?.id === club.id ? (
                      <form onSubmit={handleUpdateClub} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editingClub.name}
                            onChange={(e) => setEditingClub({ ...editingClub, name: e.target.value })}
                            className="p-2 border rounded-md"
                            required
                          />
                          <input
                            type="text"
                            value={editingClub.brand}
                            onChange={(e) => setEditingClub({ ...editingClub, brand: e.target.value })}
                            className="p-2 border rounded-md"
                            required
                          />
                          <input
                            type="text"
                            value={editingClub.model}
                            onChange={(e) => setEditingClub({ ...editingClub, model: e.target.value })}
                            className="p-2 border rounded-md"
                            required
                          />
                          <input
                            type="number"
                            value={editingClub.loft}
                            onChange={(e) => setEditingClub({ ...editingClub, loft: parseFloat(e.target.value) })}
                            className="p-2 border rounded-md"
                            required
                          />
                          <input
                            type="number"
                            value={editingClub.typical_distance}
                            onChange={(e) => setEditingClub({ ...editingClub, typical_distance: parseFloat(e.target.value) })}
                            className="p-2 border rounded-md"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClub(null)}
                            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-green-800">{club.name}</h3>
                          <p className="text-sm text-gray-600">
                            {club.brand} {club.model} | {club.loft}° | {club.typical_distance} yards
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingClub(club)}
                            className="text-green-600 hover:text-green-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClub(club.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No clubs added yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 