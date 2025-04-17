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
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [uniqueModels, setUniqueModels] = useState<{[brand: string]: string[]}>({}); // Models by brand
  const [lastUsedBrand, setLastUsedBrand] = useState('');
  const [lastUsedModel, setLastUsedModel] = useState('');
  const [lastUsedLoft, setLastUsedLoft] = useState<number | null>(null);
  
  const CLUB_OPTIONS = [
    'Driver',
    '4 Iron',
    '5 Iron',
    '6 Iron',
    '7 Iron',
    '8 Iron',
    '9 Iron',
    'Pitching Wedge',
    'Sand Wedge',
    'Wedge',
    'Putter'
  ];

  const DISTANCE_OPTIONS = [
    300, 275, 250, 225, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80
  ];

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
      
      // Extract unique brands and models
      const brands = new Set<string>();
      const modelsByBrand: {[brand: string]: Set<string>} = {};
      
      data?.forEach(club => {
        if (club.brand) {
          brands.add(club.brand);
          if (!modelsByBrand[club.brand]) {
            modelsByBrand[club.brand] = new Set<string>();
          }
          if (club.model) {
            modelsByBrand[club.brand].add(club.model);
          }
        }
      });
      
      setUniqueBrands(Array.from(brands));
      const modelsByBrandArray: {[brand: string]: string[]} = {};
      Object.keys(modelsByBrand).forEach(brand => {
        modelsByBrandArray[brand] = Array.from(modelsByBrand[brand]);
      });
      setUniqueModels(modelsByBrandArray);
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
      const clubData = {
        ...newClub,
        user_id: user.id,
        loft: newClub.name === 'Putter' ? null : parseFloat(newClub.loft),
        typical_distance: newClub.name === 'Putter' ? null : parseFloat(newClub.typical_distance)
      };

      const { error } = await supabase
        .from('clubs')
        .insert(clubData);

      if (error) throw error;
      
      // Save last used values
      setLastUsedBrand(newClub.brand);
      setLastUsedModel(newClub.model);
      setLastUsedLoft(newClub.name === 'Putter' ? null : parseFloat(newClub.loft));
      
      // Refresh clubs list
      fetchClubs(user.id);
      // Reset form but keep the brand and model
      setNewClub({
        name: '',
        brand: newClub.brand,
        model: newClub.model,
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

  const handleLoftGap = (gap: number) => {
    if (lastUsedLoft !== null) {
      const newLoft = (lastUsedLoft + gap).toFixed(1);
      setNewClub({ ...newClub, loft: newLoft });
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
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-green-800">My Golf Bag</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-green-600 hover:text-green-800 transition-colors"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
          <p className="text-gray-600">Manage your clubs and track your distances</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Club Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Add New Club</h2>
            <form onSubmit={handleAddClub} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Club Name</label>
                <select
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  className="mt-1 p-2 w-full border rounded-md"
                  required
                >
                  <option value="">Select a club</option>
                  {CLUB_OPTIONS.map((club) => (
                    <option key={club} value={club}>
                      {club}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newClub.brand}
                    onChange={(e) => setNewClub({ ...newClub, brand: e.target.value })}
                    className="mt-1 p-2 flex-1 border rounded-md"
                    required
                    placeholder="Enter brand name"
                  />
                  {uniqueBrands.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewClub({ ...newClub, brand: e.target.value });
                        }
                      }}
                      className="mt-1 p-2 border rounded-md"
                    >
                      <option value="">Previous brands</option>
                      {uniqueBrands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newClub.model}
                    onChange={(e) => setNewClub({ ...newClub, model: e.target.value })}
                    className="mt-1 p-2 flex-1 border rounded-md"
                    required
                    placeholder="Enter model name"
                  />
                  {uniqueModels[newClub.brand]?.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewClub({ ...newClub, model: e.target.value });
                        }
                      }}
                      className="mt-1 p-2 border rounded-md"
                    >
                      <option value="">Previous models</option>
                      {uniqueModels[newClub.brand].map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {/* Only show loft and typical distance for non-putters */}
              {newClub.name !== 'Putter' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loft (degrees)</label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={newClub.loft}
                        onChange={(e) => setNewClub({ ...newClub, loft: e.target.value })}
                        className="mt-1 p-2 w-full border rounded-md"
                        required
                        step="0.1"
                      />
                      {lastUsedLoft !== null && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Last loft: {lastUsedLoft}°</span>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleLoftGap(-4)}
                              className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              -4°
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoftGap(-3)}
                              className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              -3°
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoftGap(3)}
                              className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              +3°
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoftGap(4)}
                              className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              +4°
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Typical Distance (yards)</label>
                    <select
                      value={newClub.typical_distance}
                      onChange={(e) => setNewClub({ ...newClub, typical_distance: e.target.value })}
                      className="mt-1 p-2 w-full border rounded-md"
                      required
                    >
                      <option value="">Select typical distance</option>
                      {DISTANCE_OPTIONS.map((distance) => (
                        <option key={distance} value={distance}>
                          {distance} yards
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
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
                          <select
                            value={editingClub.name}
                            onChange={(e) => setEditingClub({ ...editingClub, name: e.target.value })}
                            className="p-2 border rounded-md"
                            required
                          >
                            <option value="">Select a club</option>
                            {CLUB_OPTIONS.map((club) => (
                              <option key={club} value={club}>
                                {club}
                              </option>
                            ))}
                          </select>
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
                          {editingClub.name !== 'Putter' && (
                            <>
                              <input
                                type="number"
                                value={editingClub.loft}
                                onChange={(e) => setEditingClub({ ...editingClub, loft: parseFloat(e.target.value) })}
                                className="p-2 border rounded-md"
                                required
                                step="0.1"
                              />
                              <select
                                value={editingClub.typical_distance}
                                onChange={(e) => setEditingClub({ ...editingClub, typical_distance: parseFloat(e.target.value) })}
                                className="p-2 border rounded-md"
                                required
                              >
                                <option value="">Select typical distance</option>
                                {DISTANCE_OPTIONS.map((distance) => (
                                  <option key={distance} value={distance}>
                                    {distance} yards
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
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