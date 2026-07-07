import { supabase } from '../lib/supabase';

const SEARCH_HISTORY_TABLE = 'search_history';
const SEARCH_EVENTS_TABLE = 'search_events';

const isMissingRelationError = (error, relationName) => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST204') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes(String(relationName || '').toLowerCase()) && message.includes('does not exist');
};

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
      if (emergencies.length) results.push({ category: 'Requests', items: emergencies, icon: 'AlertTriangle', color: '#F59E0B' });
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
      .select(`
        id,
        name,
        specialization,
        department,
        rating,
        image,
        hospitals:hospital_id (
          name
        )
      `)
      .or(`name.ilike.%${query}%,specialization.ilike.%${query}%,department.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map((doctor) => {
      const hospitalName = Array.isArray(doctor.hospitals)
        ? doctor.hospitals[0]?.name
        : doctor.hospitals?.name;

      return {
        id: doctor.id,
        title: doctor.name || 'Unknown Doctor',
        subtitle: `${doctor.specialization || doctor.department || 'General'} - ${hospitalName || 'Independent'}`,
        avatar: doctor.image,
        rating: doctor.rating,
        type: 'doctor',
        path: `/doctors?id=${doctor.id}`,
      };
    });
  },

  async searchHospitals(query, limit) {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name, type, address, rating')
      .or(`name.ilike.%${query}%,type.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(limit);

    return (data || []).map(h => ({
      id: h.id,
      title: h.name || 'Unknown Hospital',
      subtitle: `${h.type || 'Unknown Type'} • ${h.address || 'Unknown Address'}`,
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
      title: a.call_sign || 'Unknown Ambulance',
      subtitle: `${a.type || 'Unknown Type'} • Status: ${a.status || 'Unknown'}`,
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
      title: v.hospital || 'Unknown Hospital',
      subtitle: `${v.doctor || 'Unknown Doctor'} • ${v.date ? new Date(v.date).toLocaleDateString() : 'Unknown Date'}`,
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
      title: e.service_type || 'Unknown request',
      subtitle: `${e.hospital_name || 'Unknown Hospital'} • ${e.status || 'Unknown Status'}`,
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
      title: u.username || 'Unknown User',
      subtitle: `${u.email || 'No email'} • ${u.role || 'Unknown Role'}`,
      avatar: u.avatar_url,
      type: 'user',
      path: `/users?id=${u.id}`
    }));
  },

  async trackSearch(query, resultCount) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from(SEARCH_HISTORY_TABLE).insert([
        {
          user_id: user.id,
          query: query.toLowerCase(),
          result_count: resultCount,
          created_at: new Date().toISOString()
        }
      ]);
      if (error && isMissingRelationError(error, SEARCH_HISTORY_TABLE)) {
        await supabase.from(SEARCH_EVENTS_TABLE).insert([
          {
            query: query.toLowerCase(),
            source: 'history_fallback',
            metadata: {
              result_count: resultCount,
            },
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      if (error) throw error;
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  },

  async getRecentSearches(limit = 8) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from(SEARCH_HISTORY_TABLE)
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

      const { error } = await supabase.from('search_selections').insert([
        {
          user_id: user.id,
          query: query.toLowerCase(),
          result_type: resultType,
          result_id: resultId,
          created_at: new Date().toISOString()
        }
      ]);

      if (error && isMissingRelationError(error, 'search_selections')) {
        await supabase.from(SEARCH_EVENTS_TABLE).insert([
          {
            query: query.toLowerCase(),
            source: 'selection_fallback',
            selected_key: resultId,
            metadata: {
              result_type: resultType,
            },
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
      if (error) throw error;
    } catch (error) {
      console.error('Error recording selection:', error);
    }
  }
};

