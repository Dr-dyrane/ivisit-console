import { supabase } from '../../lib/supabase';
import { buildRequestVisitIdentityProjection } from '../../utils/requestVisitIdentityProjection';
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

  const visitUserIds = [...new Set(visits.map(v => v.user_id).filter(Boolean))];
  // Only request-linked visits join emergency rows; visit UUIDs are not request UUIDs.
  const emergencyLookupIds = [
    ...new Set(visits.map((visit) => visit.request_id).filter(Boolean)),
  ];
  const directHospitalIds = [
    ...new Set(visits.map(visit => visit.hospital_id).filter(Boolean)),
  ];

  const emergencyRows = await fetchChunkedRows(emergencyLookupIds, (chunk) => supabase
    .from('emergency_requests')
    .select([
      'id',
      'user_id',
      'hospital_id',
      'hospital_name',
      'status',
      'service_type',
      'assigned_doctor_id',
      'responder_id',
      'responder_name',
      'responder_phone',
      'responder_vehicle_type',
      'responder_vehicle_plate',
      'ambulance_id',
      'patient_snapshot',
    ].join(', '))
    .in('id', chunk), abortSignal);
  throwIfQueryAborted(abortSignal);

  const profileIds = [
    ...new Set([
      ...visitUserIds,
      ...(emergencyRows || []).map(row => row.user_id).filter(Boolean),
      ...(emergencyRows || []).map(row => row.responder_id).filter(Boolean),
    ]),
  ];
  const doctorIds = [
    ...new Set((emergencyRows || []).map(row => row.assigned_doctor_id).filter(Boolean)),
  ];
  const hospitalIds = [
    ...new Set([
      ...directHospitalIds,
      ...(emergencyRows || []).map(row => row.hospital_id).filter(Boolean),
    ]),
  ];

  const [profiles, doctors, hospitalRows] = await Promise.all([
    fetchChunkedRows(profileIds, (chunk) => supabase
      .from('profiles')
      .select('id, username, email, full_name, phone, image_uri, avatar_url')
      .in('id', chunk), abortSignal),
    fetchChunkedRows(doctorIds, (chunk) => supabase
      .from('doctors')
      .select('id, name, specialization, phone, image')
      .in('id', chunk), abortSignal),
    fetchChunkedRows(hospitalIds, (chunk) => supabase
      .from('hospitals')
      .select('id, name, address')
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
  const doctorsMap = (doctors || []).reduce((acc, doctor) => ({
    ...acc,
    [doctor.id]: doctor,
  }), {});
  const hospitalsMap = (hospitalRows || []).reduce((acc, hospital) => ({
    ...acc,
    [hospital.id]: hospital,
  }), {});

  return visits.map((visit) => {
    const emergency =
      (visit.request_id ? emergencyByRequest[visit.request_id] : null) || null;
    const doctorRecord = emergency?.assigned_doctor_id
      ? doctorsMap[emergency.assigned_doctor_id] || null
      : null;
    const identity = emergency ? buildRequestVisitIdentityProjection({
      request: emergency,
      visit,
      patientProfile: profilesMap[emergency.user_id || visit.user_id] || null,
      doctorRecord,
      responderProfile: emergency.responder_id
        ? profilesMap[emergency.responder_id] || null
        : null,
    }) : null;
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
    const doctorName = identity?.doctor.hasDoctor
      ? identity.doctor.name
      : visit.doctor_name || null;
    const visitType = visit.visit_type || visit.type || emergency?.service_type || null;

    const normalizedVisit = normalizeVisitForUI({
      ...visit,
      request_id: visit.request_id || emergency?.id || null,
      hospital_id: linkedHospitalId,
      hospital_name: linkedHospitalName,
      source_status: visit.status || null,
      emergency_status: emergency?.status || null,
      status: normalizedStatus,
      type: visitType,
      visit_type: visitType,
      doctor_id: identity?.doctor.doctorId || visit.doctor_id || null,
      doctor_name: doctorName,
      patient: identity
        ? profilesMap[identity.patient.profileId] || null
        : profilesMap[visit.user_id] || null,
      doctor_record: doctorRecord,
      doctor: visit.doctor || doctorName || null,
    });

    if (!identity) return normalizedVisit;

    const responder = identity.responder;
    return {
      ...normalizedVisit,
      identity,
      ambulance_id: responder.ambulanceId,
      responder_id: responder.profileId,
      responder_name: responder.hasResponder ? responder.name : null,
      responder: responder.hasResponder ? {
        id: responder.profileId,
        name: responder.name,
        phone: responder.phone,
        avatar: responder.avatar,
        ambulanceId: responder.ambulanceId,
        vehicleType: responder.vehicleType,
        vehiclePlate: responder.vehiclePlate,
      } : null,
    };
  });
}
