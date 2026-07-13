import { supabase } from '../../lib/supabase';
import { resolveVisitStatus } from '../../utils/visitStatus';
import {
  applyQueryAbortSignal,
  throwIfQueryAborted,
} from '../queryAbort';
import { ENRICHMENT_ID_CHUNK_SIZE } from './constants';
import { normalizeVisitForUI } from './normalization';

const chunkIdList = (ids = [], size = ENRICHMENT_ID_CHUNK_SIZE) => {
  const chunks = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
};

// Match the legacy enrichment contract: failed chunks contribute data || [].
async function fetchChunkedRows(ids, buildChunkQuery, abortSignal) {
  if (!ids.length) return [];
  const results = await Promise.all(
    chunkIdList(ids).map((chunk) => (
      applyQueryAbortSignal(buildChunkQuery(chunk), abortSignal)
    ))
  );
  throwIfQueryAborted(abortSignal);
  return results.flatMap(({ data }) => data || []);
}

export async function enrichVisitsForPage(visits = [], abortSignal) {
  if (!visits.length) return [];

  const userIds = [...new Set(visits.map(v => v.user_id).filter(Boolean))];
  // Only request-linked visits join emergency rows; visit UUIDs are not request UUIDs.
  const emergencyLookupIds = [
    ...new Set(visits.map((visit) => visit.request_id).filter(Boolean)),
  ];
  const directHospitalIds = [
    ...new Set(visits.map(visit => visit.hospital_id).filter(Boolean)),
  ];

  const [profiles, emergencyRows] = await Promise.all([
    fetchChunkedRows(userIds, (chunk) => supabase
      .from('profiles')
      .select('id, username, email, full_name')
      .in('id', chunk), abortSignal),
    fetchChunkedRows(emergencyLookupIds, (chunk) => supabase
      .from('emergency_requests')
      .select('id, hospital_id, hospital_name, status, service_type, assigned_doctor_id')
      .in('id', chunk), abortSignal),
  ]);
  throwIfQueryAborted(abortSignal);

  const profilesMap = (profiles || []).reduce((acc, profile) => ({
    ...acc,
    [profile.id]: profile,
  }), {});
  const emergencyByRequest = (emergencyRows || []).reduce((acc, row) => ({
    ...acc,
    [row.id]: row,
  }), {});

  const doctorIds = [
    ...new Set((emergencyRows || []).map(row => row.assigned_doctor_id).filter(Boolean)),
  ];

  let doctorsMap = {};
  if (doctorIds.length > 0) {
    const doctors = await fetchChunkedRows(doctorIds, (chunk) => supabase
      .from('doctors')
      .select('id, name')
      .in('id', chunk), abortSignal);
    doctorsMap = (doctors || []).reduce((acc, doctor) => ({
      ...acc,
      [doctor.id]: doctor,
    }), {});
  }

  const hospitalIds = [
    ...new Set([
      ...directHospitalIds,
      ...(emergencyRows || []).map(row => row.hospital_id).filter(Boolean),
    ]),
  ];

  let hospitalsMap = {};
  if (hospitalIds.length > 0) {
    const hospitalRows = await fetchChunkedRows(hospitalIds, (chunk) => supabase
      .from('hospitals')
      .select('id, name, address')
      .in('id', chunk), abortSignal);
    hospitalsMap = (hospitalRows || []).reduce((acc, hospital) => ({
      ...acc,
      [hospital.id]: hospital,
    }), {});
  }

  return visits.map((visit) => {
    const emergency =
      (visit.request_id ? emergencyByRequest[visit.request_id] : null) || null;
    const linkedHospitalId = visit.hospital_id || emergency?.hospital_id || null;
    const linkedHospitalName =
      visit.hospital_name ||
      emergency?.hospital_name ||
      hospitalsMap[linkedHospitalId]?.name ||
      null;
    const normalizedStatus = resolveVisitStatus({
      visitStatus: visit.status,
      emergencyStatus: emergency?.status,
    });
    const emergencyDoctorName = emergency?.assigned_doctor_id
      ? doctorsMap[emergency.assigned_doctor_id]?.name || null
      : null;
    const doctorName = visit.doctor_name || emergencyDoctorName || null;
    const visitType = visit.visit_type || visit.type || emergency?.service_type || null;

    return normalizeVisitForUI({
      ...visit,
      request_id: visit.request_id || emergency?.id || null,
      hospital_id: linkedHospitalId,
      hospital_name: linkedHospitalName,
      source_status: visit.status || null,
      emergency_status: emergency?.status || null,
      status: normalizedStatus,
      type: visitType,
      visit_type: visitType,
      doctor_name: doctorName,
      patient: profilesMap[visit.user_id] || null,
      doctor: visit.doctor || doctorName || null,
    });
  });
}
