import { supabase } from '../lib/supabase';

export const searchService = {
  async searchAll(query, limit = 50) {
    if (!query || query.trim().length < 2) return { results: [], total: 0 };

    const searchTerm = query.toLowerCase();
    const results = [];

    try {
      const [doctors, hospitals, ambulances, visits, emergencies, users] = await Promise.all([
        this.searchDoctors(searchTerm, limit),
        this.searchHospitals(searchTerm, limit),
        this.searchAmbulances(searchTerm, limit),
        this.searchVisits(searchTerm, limit),
        this.searchEmergencies(searchTerm, limit),
        this.searchUsers(searchTerm, limit),
      ]);

      if (doctors.length) results.push({ category: 'Doctors', items: doctors, icon: 'Stethoscope', color: '#8B5CF6' });
      if (hospitals.length) results.push({ category: 'Hospitals', items: hospitals, icon: 'Building2', color: '#3B82F6' });
      if (ambulances.length) results.push({ category: 'Ambulances', items: ambulances, icon: 'Ambulance', color: '#EF4444' });
      if (visits.length) results.push({ category: 'Visits', items: visits, icon: 'Calendar', color: '#10B981' });
      if (emergencies.length) results.push({ category: 'Emergency Requests', items: emergencies, icon: 'AlertTriangle', color: '#F59E0B' });
      if (users.length) results.push({ category: 'Users', items: users, icon: 'Users', color: '#06B6D4' });

      await this.trackSearch(query, results.reduce((sum, cat) => sum + cat.items.length, 0));

      return { results, total: results.reduce((sum, cat) => sum + cat.items.length, 0) };
    } catch (error) {
      console.error('Search error:', error);
      return { results: [], total: 0, error };
    }
  },

  async searchDoctors(query, limit) {
    const { data } = await supabase
      .from('doctors')
      .select('id, name, specialty, hospital, rating, avatar_url')
      .or(`name.ilike.%${query}%,specialty.ilike.%${query}%,hospital.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(d => ({
      id: d.id,
      title: d.name,
      subtitle: `${d.specialty} • ${d.hospital || 'Independent'}`,
      avatar: d.avatar_url,
      rating: d.rating,
      type: 'doctor',
      path: `/doctors?id=${d.id}`
    }));
  },

  async searchHospitals(query, limit) {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name, type, address, rating')
      .or(`name.ilike.%${query}%,type.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(h => ({
      id: h.id,
      title: h.name,
      subtitle: `${h.type} • ${h.address}`,
      rating: h.rating,
      type: 'hospital',
      path: `/hospitals?id=${h.id}`
    }));
  },

  async searchAmbulances(query, limit) {
    const { data } = await supabase
      .from('ambulances')
      .select('id, call_sign, type, status, hospital')
      .or(`call_sign.ilike.%${query}%,type.ilike.%${query}%,hospital.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(a => ({
      id: a.id,
      title: a.call_sign,
      subtitle: `${a.type} • Status: ${a.status}`,
      type: 'ambulance',
      path: `/ambulances?id=${a.id}`
    }));
  },

  async searchVisits(query, limit) {
    const { data } = await supabase
      .from('visits')
      .select('id, hospital, doctor, specialty, date, status')
      .or(`hospital.ilike.%${query}%,doctor.ilike.%${query}%,specialty.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(v => ({
      id: v.id,
      title: `${v.hospital}`,
      subtitle: `${v.doctor} • ${new Date(v.date).toLocaleDateString()}`,
      type: 'visit',
      path: `/visits?id=${v.id}`
    }));
  },

  async searchEmergencies(query, limit) {
    const { data } = await supabase
      .from('emergency_requests')
      .select('id, service_type, hospital_name, status, created_at')
      .or(`service_type.ilike.%${query}%,hospital_name.ilike.%${query}%,status.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(e => ({
      id: e.id,
      title: e.service_type,
      subtitle: `${e.hospital_name} • ${e.status}`,
      type: 'emergency',
      path: `/emergencies?id=${e.id}`
    }));
  },

  async searchUsers(query, limit) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, role')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(u => ({
      id: u.id,
      title: u.username,
      subtitle: `${u.email} • ${u.role}`,
      avatar: u.avatar_url,
      type: 'user',
      path: `/users?id=${u.id}`
    }));
  },

  async trackSearch(query, resultCount) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('search_history').insert([
        {
          user_id: user.id,
          query: query.toLowerCase(),
          result_count: resultCount,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  },

  async getRecentSearches(limit = 8) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('search_history')
        .select('query, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []).map(item => ({
        query: item.query,
        timestamp: new Date(item.created_at),
        icon: 'Clock'
      }));
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      return [];
    }
  },

  async getTrendingSearches(limit = 8, days = 7) {
    try {
      const { data } = await supabase
        .rpc('get_trending_searches', {
          days_back: days,
          limit_count: limit
        });

      return (data || []).map((item, idx) => ({
        query: item.query,
        count: item.count,
        rank: idx + 1,
        icon: 'TrendingUp',
        color: ['#EF4444', '#F97316', '#F59E0B', '#FBBF24'][idx % 4]
      }));
    } catch (error) {
      console.log('Trending RPC not yet available, returning empty');
      return [];
    }
  },

  async recordSelection(query, resultType, resultId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('search_selections').insert([
        {
          user_id: user.id,
          query: query.toLowerCase(),
          result_type: resultType,
          result_id: resultId,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error recording selection:', error);
    }
  }
};
