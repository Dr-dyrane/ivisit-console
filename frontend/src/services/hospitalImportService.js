// Hospital Import Service for Console - Manages Google Places integration
import { supabase } from '../lib/supabase';

// The three array columns update_hospital_by_admin overwrites unconditionally.
const PRESERVED_HOSPITAL_ARRAY_FIELDS = ['specialties', 'service_types', 'features'];

const toPreservedArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry === null || entry === undefined ? '' : String(entry)))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

/**
 * Guard against update_hospital_by_admin's unconditional array overwrite.
 *
 * The RPC sets specialties/service_types/features from the payload every call,
 * defaulting each absent key to '{}' — so a narrow write (bed count, status,
 * verify, approve, reject) would BLANK all three arrays on the shared row. This
 * fetches the row's CURRENT arrays and folds them into the payload for any of the
 * three keys the caller did not explicitly provide, so the RPC preserves them.
 *
 * Only the three array fields are touched; the caller's intended fields pass
 * through untouched. Null/undefined current arrays degrade to [] (never crash).
 *
 * @param {string} hospitalId
 * @param {Object} payload - the caller's intended narrow payload
 * @returns {Promise<Object>} payload with preserved arrays merged in
 */
export async function mergePreservedHospitalArrays(hospitalId, payload = {}) {
  const basePayload = payload && typeof payload === 'object' ? payload : {};

  // If the caller already supplied all three arrays, nothing to preserve.
  const missing = PRESERVED_HOSPITAL_ARRAY_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(basePayload, field)
  );
  if (missing.length === 0) {
    return { ...basePayload };
  }

  let current = null;
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('specialties, service_types, features')
      .eq('id', hospitalId)
      .maybeSingle();
    if (error) throw error;
    current = data;
  } catch (fetchError) {
    // Read failed (row missing / transient). Fall back to empty arrays for the
    // missing keys — worst case we don't add data that wasn't there, and we
    // still avoid crashing the intended narrow write.
    console.error(
      `mergePreservedHospitalArrays: could not read current arrays for ${hospitalId}, defaulting to []`,
      fetchError
    );
    current = null;
  }

  const merged = { ...basePayload };
  for (const field of missing) {
    merged[field] = toPreservedArray(current ? current[field] : []);
  }
  return merged;
}

class HospitalImportService {
  isMissingRelationError(error, relationName) {
    if (!error) return false;
    if (error.code === '42P01' || error.code === 'PGRST205') return true;
    const message = String(error.message || '').toLowerCase();
    return message.includes(String(relationName || '').toLowerCase()) && message.includes('does not exist');
  }

  // Whitelist of writable hospital columns. Mirrors ambulancesService.updateAmbulance
  // (VALID_COLUMNS) so callers cannot write arbitrary/forged columns through the RPC.
  static VALID_HOSPITAL_COLUMNS = [
    'name', 'address', 'phone', 'rating', 'type',
    'latitude', 'longitude', 'verified', 'verification_status',
    'status', 'place_id', 'wait_time', 'price_range',
    'available_beds', 'icu_beds_available', 'total_beds',
    'bed_availability', 'ambulances_count', 'emergency_level',
    'image', 'specialties', 'service_types', 'features', 'org_admin_id',
  ];

  // Write hospital fields through the SECURITY DEFINER RPC (hospitals has no direct
  // write RLS policy, so raw .update() is silently denied). Reuses the same
  // update_hospital_by_admin RPC hospitalsService.updateHospital uses. Re-reads the
  // row afterward so callers keep receiving the hospital object (RPC returns {success,id}).
  //
  // DATA-INTEGRITY GUARD: update_hospital_by_admin sets specialties/service_types/
  // features UNCONDITIONALLY from the payload (COALESCE-to-'{}' when a key is absent),
  // so a partial write would BLANK all three arrays on the shared row. Before every RPC
  // call we fetch the row's CURRENT arrays and merge them into the payload (only for keys
  // the caller did not explicitly provide) so the RPC's unconditional SET preserves them.
  async _writeHospitalViaRpc(hospitalId, payload, failureMessage) {
    const mergedPayload = await mergePreservedHospitalArrays(hospitalId, payload);

    const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
      target_hospital_id: hospitalId,
      payload: mergedPayload,
    });

    if (error) throw error;
    if (rpcResult && rpcResult.success === false) {
      throw new Error(rpcResult.error || failureMessage);
    }

    const { data, error: readError } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', hospitalId)
      .maybeSingle();

    if (readError) throw readError;
    return data;
  }

  // Import hospitals from Google Places using unified Edge Function
  async importHospitalsFromGoogle(lat, lng, radius = 10, adminId = null) {
    try {
      console.log('[HospitalImportService] Importing hospitals from unified Edge Function...', { lat, lng, radius });

      // Use the unified Edge Function with database merging
      const { data, error } = await supabase.functions.invoke('discover-hospitals', {
        body: { 
          latitude: lat, 
          longitude: lng, 
          radius: radius * 1000, // Convert to meters
          mode: 'nearby',
          limit: 20,
          includeGooglePlaces: true,
          mergeWithDatabase: true,
          createdBy: adminId
        }
      });

      if (error) {
        console.log('[HospitalImportService] Edge Function unavailable, using fallback:', error.message);
        // Fallback to direct database query for existing hospitals
        return this.getHospitalsDirectly(lat, lng, radius, adminId);
      }

      // Process unified results
      const hospitals = data?.data || [];
      const meta = data?.meta || {};
      
      console.log('[HospitalImportService] Unified results:', {
        total: hospitals.length,
        google_places: meta.google_places_count,
        database: meta.database_count,
        merged: meta.merged_count
      });

      // Filter for newly imported hospitals (Google-only or pending)
      const newlyImported = hospitals.filter(
        (h) => h.google_only || h.verification_status === 'pending' || h.verified !== true
      );

      return {
        success: true,
        hospitals: newlyImported,
        all_hospitals: hospitals, // All hospitals from the area
        total_found: hospitals.length,
        total_imported: newlyImported.length,
        meta: meta
      };
    } catch (error) {
      console.error('HospitalImportService.importHospitalsFromGoogle error:', error);
      // Final fallback - return existing hospitals from database
      return this.getHospitalsDirectly(lat, lng, radius, adminId);
    }
  }

  // Fallback method to get hospitals directly from database
  async getHospitalsDirectly(lat, lng, radius, adminId = null) {
    try {
      console.log('[HospitalImportService] Using fallback: direct database query');
      
      // Use the nearby_hospitals RPC function as fallback
      const { data, error } = await supabase
        .rpc('nearby_hospitals', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radius
        });

      if (error) throw error;

      return {
        success: true,
        hospitals: [], // No new imports in fallback mode
        all_hospitals: data || [],
        total_found: data?.length || 0,
        total_imported: 0,
        fallback_used: true
      };
    } catch (error) {
      console.error('HospitalImportService.getHospitalsDirectly error:', error);
      throw error;
    }
  }

  // Get hospitals pending verification
  async getPendingHospitals() {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('HospitalImportService.getPendingHospitals error:', error);
      throw error;
    }
  }

  // Get all hospitals with filtering
  async getHospitals(filters = {}) {
    try {
      let query = supabase
        .from('hospitals')
        .select('*');

      // Apply filters
      if (filters.import_status || filters.verification_status) {
        query = query.eq('verification_status', filters.verification_status || filters.import_status);
      }
      if (filters.org_admin_id) {
        query = query.eq('org_admin_id', filters.org_admin_id);
      }
      if (filters.verified !== undefined) {
        query = query.eq('verified', filters.verified);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('HospitalImportService.getHospitals error:', error);
      throw error;
    }
  }

  // Approve hospital import
  async approveHospital(hospitalId) {
    try {
      return await this._writeHospitalViaRpc(
        hospitalId,
        { verification_status: 'verified', verified: true, status: 'available' },
        'Hospital approval failed'
      );
    } catch (error) {
      console.error('HospitalImportService.approveHospital error:', error);
      throw error;
    }
  }

  // Reject hospital import
  async rejectHospital(hospitalId, reason = '') {
    try {
      return await this._writeHospitalViaRpc(
        hospitalId,
        { verification_status: 'rejected', verified: false, status: 'closed' },
        'Hospital rejection failed'
      );
    } catch (error) {
      console.error('HospitalImportService.rejectHospital error:', error);
      throw error;
    }
  }

  // Assign hospital to org admin
  // NOTE: cannot route through update_hospital_by_admin — that RPC's SET clause
  // does not include org_admin_id, so a routed write would be a silent no-op.
  // Kept as a direct write (read-back hardened to .maybeSingle()); a dedicated
  // assign RPC is tracked separately (see DATA_SYNC_REMEDIATION_AUDIT §B).
  async assignHospitalToAdmin(hospitalId, orgAdminId) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .update({
          org_admin_id: orgAdminId
        })
        .eq('id', hospitalId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('HospitalImportService.assignHospitalToAdmin error:', error);
      throw error;
    }
  }

  // Get available org admins for assignment
  async getAvailableOrgAdmins() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, provider_type')
        .eq('role', 'provider')
        .eq('provider_type', 'hospital')
        .order('full_name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('HospitalImportService.getAvailableOrgAdmins error:', error);
      throw error;
    }
  }

  // Get hospitals assigned to specific admin
  async getHospitalsByAdmin(orgAdminId) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('org_admin_id', orgAdminId)
        .eq('verification_status', 'verified')
        .order('name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('HospitalImportService.getHospitalsByAdmin error:', error);
      throw error;
    }
  }

  // Update hospital details
  async updateHospital(hospitalId, updates) {
    try {
      // Allowlist writable columns (mirrors ambulancesService.updateAmbulance
      // VALID_COLUMNS) so arbitrary/forged fields can't be pushed to the RPC.
      const input = updates || {};
      const payload = {};
      for (const key of HospitalImportService.VALID_HOSPITAL_COLUMNS) {
        if (key in input) {
          payload[key] = input[key];
        }
      }

      return await this._writeHospitalViaRpc(
        hospitalId,
        payload,
        'Hospital update failed'
      );
    } catch (error) {
      console.error('HospitalImportService.updateHospital error:', error);
      throw error;
    }
  }

  // Get import logs
  async getImportLogs(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('hospital_import_logs')
        .select(`
          *,
          profiles:created_by (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (this.isMissingRelationError(error, 'hospital_import_logs')) {
          return [];
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('HospitalImportService.getImportLogs error:', error);
      throw error;
    }
  }

  // Get hospital statistics
  async getHospitalStats() {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('verification_status, verified, status, org_admin_id');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(h => h.verification_status === 'pending').length,
        verified: data.filter(h => h.verification_status === 'verified').length,
        rejected: data.filter(h => h.verification_status === 'rejected').length,
        assigned: data.filter(h => h.org_admin_id).length,
        active: data.filter(h => h.status === 'available').length,
        inactive: data.filter(h => h.status === 'closed').length
      };

      return stats;
    } catch (error) {
      console.error('HospitalImportService.getHospitalStats error:', error);
      throw error;
    }
  }

  // Sync hospital with Google Places using unified Edge Function
  async syncHospitalWithGoogle(hospitalId) {
    try {
      // Get hospital details first
      const { data: hospital, error: fetchError } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle();

      if (fetchError || !hospital) {
        throw new Error('Hospital not found');
      }

      console.log('[HospitalImportService] Syncing hospital with unified Edge Function:', hospital.name);

      // Use the unified Edge Function in text search mode
      const { data, error } = await supabase.functions.invoke('discover-hospitals', {
        body: {
          query: hospital.name,
          mode: 'text_search',
          limit: 1,
          includeGooglePlaces: true,
          mergeWithDatabase: true
        }
      });

      if (error) {
        console.log('[HospitalImportService] Edge Function unavailable for sync, skipping:', error.message);
        // Return original hospital if Edge Function fails
        return hospital;
      }

      const results = data?.data || [];
      const updatedHospital = results[0];

      if (updatedHospital) {
        console.log('[HospitalImportService] Hospital synced successfully');
        return updatedHospital;
      }

      console.log('[HospitalImportService] No updated data found for hospital');
      return hospital;
    } catch (error) {
      console.error('HospitalImportService.syncHospitalWithGoogle error:', error);
      throw error;
    }
  }
}

export default new HospitalImportService();
