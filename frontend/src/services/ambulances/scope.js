import { isValidUUID } from '../../lib/utils';
import { applyAuthFilter } from '../authService';

const getActorFacilityIds = (actor = {}) => {
  const facilityIds = [
    ...(Array.isArray(actor.hospital_ids) ? actor.hospital_ids : []),
    ...(Array.isArray(actor.facility_ids) ? actor.facility_ids : []),
    ...(Array.isArray(actor.organization_scope?.facilityIds)
      ? actor.organization_scope.facilityIds
      : []),
  ];

  return new Set(facilityIds.filter(isValidUUID));
};

const createAmbulanceScopeError = (message) => {
  const error = new Error(message);
  error.code = 'AMBULANCE_SCOPE_DENIED';
  return error;
};

export function filterAmbulanceStationOptions(stations, actor = {}) {
  const rows = Array.isArray(stations) ? stations : [];
  if (actor.role === 'admin') return rows;
  if (actor.role !== 'org_admin') return [];

  const allowedFacilityIds = getActorFacilityIds(actor);
  return rows.filter((station) => allowedFacilityIds.has(station?.id));
}

export function assertAmbulanceWriteScope(input = {}, actor = {}) {
  if (actor.role !== 'org_admin') return input;

  const actorOrganizationId = actor.organization_id;
  if (!isValidUUID(actorOrganizationId)) {
    throw createAmbulanceScopeError('Your organization scope could not be verified.');
  }

  if (input.organization_id && input.organization_id !== actorOrganizationId) {
    throw createAmbulanceScopeError('This ambulance belongs to another organization.');
  }

  if (input.hospital_id) {
    const allowedFacilityIds = getActorFacilityIds(actor);
    if (!allowedFacilityIds.has(input.hospital_id)) {
      throw createAmbulanceScopeError('Select a station in your organization.');
    }
  }

  return input;
}

// Direct organization ownership is canonical. The facility edge is a fallback
// only for legacy rows whose organization_id is null. This mirrors RLS and keeps
// historical cross-edge mismatches visible only to the direct owner for repair.
export function applyAmbulanceOrgAdminScope(query, user) {
  const orgId = user.organization_id;
  const hospitalIds = (Array.isArray(user.hospital_ids) ? user.hospital_ids : [])
    .filter(isValidUUID);

  if (hospitalIds.length > 0) {
    return query.or(
      `organization_id.eq.${orgId},and(organization_id.is.null,hospital_id.in.(${hospitalIds.join(',')}))`
    );
  }
  return query.eq('organization_id', orgId);
}

export function applyAmbulancePageAuth(query, user) {
  if (user?.role === 'org_admin' && user?.organization_id) {
    return applyAmbulanceOrgAdminScope(query, user);
  }
  return applyAuthFilter(query, user, {
    userIdField: 'profile_id',
    orgIdField: 'organization_id',
    resourceType: 'ambulances',
  });
}
