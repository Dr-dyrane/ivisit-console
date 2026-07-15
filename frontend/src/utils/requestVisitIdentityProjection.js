const toRecord = (value) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === 'object' ? candidate : null;
};

const cleanId = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
};

const firstText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const parseSnapshot = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const pickRecordForId = (id, ...values) => {
  for (const value of values) {
    const record = toRecord(value);
    if (!record) continue;
    if (!id || cleanId(record.id) === id) return record;
  }
  return null;
};

const requestMatchesVisit = (request, visit) => {
  const visitRequestId = cleanId(visit?.request_id);
  const requestId = cleanId(request?.id);
  return !visitRequestId || !requestId || visitRequestId === requestId;
};

export const buildRequestVisitIdentityProjection = ({
  request = null,
  visit = null,
  patientProfile = null,
  doctorRecord = null,
  responderProfile = null,
} = {}) => {
  const linkedRequest = requestMatchesVisit(request, visit) ? request : null;
  const requestPatientProfileId = cleanId(linkedRequest?.user_id);
  const visitPatientProfileId = cleanId(visit?.user_id);
  const patientProfileId = requestPatientProfileId || visitPatientProfileId;
  const doctorId = cleanId(linkedRequest?.assigned_doctor_id) || cleanId(visit?.doctor_id);
  const responderProfileId = cleanId(linkedRequest?.responder_id);
  const ambulanceId = cleanId(linkedRequest?.ambulance_id);
  const snapshot = parseSnapshot(linkedRequest?.patient_snapshot);
  const legacyPatientName = firstText(
    linkedRequest?.patient_name,
    linkedRequest?.requester_name
  );

  const patientRecord = pickRecordForId(
    patientProfileId,
    patientProfile,
    visit?.patient,
    visit?.profiles,
    linkedRequest?.patient_profile,
    linkedRequest?.patient
  );
  const doctor = doctorId
    ? pickRecordForId(
        doctorId,
        doctorRecord,
        linkedRequest?.assigned_doctor,
        visit?.assignedDoctor,
        visit?.assigned_doctor,
        typeof visit?.doctor === 'object' ? visit.doctor : null
      )
    : null;
  const responder = responderProfileId
    ? pickRecordForId(
        responderProfileId,
        responderProfile,
        linkedRequest?.responder_profile,
        linkedRequest?.responder
      )
    : null;

  const patientName = firstText(
    patientRecord?.full_name,
    patientRecord?.username,
    snapshot.fullName,
    snapshot.full_name,
    snapshot.username,
    legacyPatientName,
    visit?.patient_name
  ) || (patientProfileId ? 'Linked patient' : 'No patient');
  const doctorSnapshotName = firstText(
    visit?.doctor_name,
    typeof visit?.doctor === 'string' ? visit.doctor : ''
  );
  const doctorName = firstText(doctor?.name, doctor?.full_name, doctorSnapshotName)
    || (doctorId ? 'Assigned doctor' : 'Unassigned');
  const responderSnapshotName = firstText(linkedRequest?.responder_name);
  const responderName = firstText(
    responder?.full_name,
    responder?.username,
    responderSnapshotName
  ) || (responderProfileId ? 'Assigned responder' : 'Unassigned');

  return {
    keys: {
      visitId: cleanId(visit?.id),
      requestId: cleanId(linkedRequest?.id) || cleanId(visit?.request_id),
      patientProfileId,
      doctorId,
      responderProfileId,
      ambulanceId,
    },
    patient: {
      profileId: patientProfileId,
      name: patientName,
      username: firstText(patientRecord?.username, snapshot.username) || null,
      phone: firstText(
        patientRecord?.phone,
        snapshot.phone,
        linkedRequest?.patient_phone,
        linkedRequest?.requester_phone,
        visit?.patient_phone
      ) || 'No contact',
      email: firstText(
        patientRecord?.email,
        snapshot.email,
        linkedRequest?.patient_email,
        legacyPatientName ? linkedRequest?.email : null,
        visit?.user_email
      ) || 'No email',
      avatar: firstText(
        patientRecord?.image_uri,
        patientRecord?.avatar_url,
        snapshot.image_uri,
        snapshot.avatar_url,
        snapshot.avatar
      ) || null,
      source: patientRecord
        ? 'profile_relation'
        : firstText(snapshot.fullName, snapshot.full_name, snapshot.username, legacyPatientName)
          ? 'patient_snapshot'
          : patientProfileId
            ? 'linked_identity'
            : 'unavailable',
    },
    doctor: {
      doctorId,
      name: doctorName,
      specialty: firstText(doctor?.specialization, visit?.specialty) || null,
      phone: firstText(doctor?.phone) || null,
      avatar: firstText(doctor?.image, doctor?.avatar_url, visit?.doctor_image) || null,
      hasDoctor: Boolean(doctorId || doctorSnapshotName),
      source: doctor
        ? 'doctor_relation'
        : doctorSnapshotName
          ? 'visit_snapshot'
          : doctorId
            ? 'linked_identity'
            : 'unassigned',
    },
    responder: {
      profileId: responderProfileId,
      ambulanceId,
      name: responderName,
      phone: firstText(responder?.phone, linkedRequest?.responder_phone) || null,
      avatar: firstText(responder?.image_uri, responder?.avatar_url) || null,
      vehicleType: firstText(linkedRequest?.responder_vehicle_type) || null,
      vehiclePlate: firstText(linkedRequest?.responder_vehicle_plate) || null,
      hasResponder: Boolean(
        responderProfileId ||
        firstText(linkedRequest?.responder_name)
      ),
      source: responder
        ? 'profile_relation'
        : responderSnapshotName
          ? 'request_snapshot'
          : responderProfileId
            ? 'linked_identity'
            : 'unassigned',
    },
    mismatches: {
      patientProfileId: Boolean(
        requestPatientProfileId &&
        visitPatientProfileId &&
        requestPatientProfileId !== visitPatientProfileId
      ),
    },
  };
};

export default buildRequestVisitIdentityProjection;
