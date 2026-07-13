import {
  PRICING_MUTATION_UNAVAILABLE_REASON,
  PRICING_RECENT_DAYS,
} from './constants';
import {
  combinePricingSummaries,
  getFamiliesForPage,
  getScopedFamilyCount,
  normalizePricingFamily,
  normalizePricingRow,
  normalizeSearch,
  sortPricingRows,
} from './normalization';
import {
  getPricingFamilySummary,
  hydratePricingHospitals,
  loadFacilitySearchHospitals,
  loadOrganizationHospitals,
  loadPricingFamilyPrefix,
} from './projectionQueries';

export const getPricingPageData = async ({
  family = 'all',
  organizationId = null,
  search = '',
  scope = 'all',
  sortDirection = 'desc',
  page = 1,
  pageSize = 12,
} = {}) => {
  const requestedFamilies = getFamiliesForPage(family);
  const searchTerm = normalizeSearch(search);
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 12);
  const start = (safePage - 1) * safePageSize;
  const prefixSize = start + safePageSize;
  const organizationHospitals = await loadOrganizationHospitals(organizationId);
  const facilitySearchHospitals = await loadFacilitySearchHospitals(
    searchTerm,
    organizationId ? organizationHospitals : null,
  );
  const hospitalIds = organizationHospitals.map((hospital) => hospital.id);
  const facilitySearchIds = facilitySearchHospitals.map((hospital) => hospital.id);
  const context = {
    organizationId,
    hospitalIds,
    searchTerm,
    facilitySearchIds,
  };
  const recentCutoff = new Date(Date.now() - (PRICING_RECENT_DAYS * 86400000)).toISOString();
  const familySummaries = await Promise.all(
    requestedFamilies.map((requestedFamily) => (
      getPricingFamilySummary(context, requestedFamily, recentCutoff)
    )),
  );
  const combinedSummary = combinePricingSummaries(familySummaries);
  const totalCount = familySummaries.reduce(
    (total, familySummary) => total + getScopedFamilyCount(familySummary, scope),
    0,
  );
  const rowGroups = await Promise.all(familySummaries.map((familySummary) => (
    loadPricingFamilyPrefix({
      context,
      family: familySummary.family,
      scope,
      sortDirection,
      prefixSize,
      exactScopedCount: getScopedFamilyCount(familySummary, scope),
    })
  )));
  const pageEntries = rowGroups
    .flat()
    .sort((a, b) => sortPricingRows(a.row, b.row, sortDirection))
    .slice(start, start + safePageSize);
  const seedHospitals = [...organizationHospitals, ...facilitySearchHospitals];
  const hospitalHydration = await hydratePricingHospitals(pageEntries, seedHospitals);
  const rows = pageEntries.map(({ row, family: rowFamily }) => (
    normalizePricingRow(row, rowFamily, hospitalHydration.hospitalMap)
  ));

  return {
    actor: {
      organizationId: organizationId || null,
    },
    scope: {
      mode: organizationId ? 'organization_summary' : 'platform_default',
      hospitalId: null,
      organizationId: organizationId || null,
      editable: false,
      reason: PRICING_MUTATION_UNAVAILABLE_REASON,
    },
    rows,
    totalCount,
    summary: {
      ...combinedSummary,
      averageAmount: null,
      averageAvailable: false,
      exactCounts: true,
      basis: 'exact_server_counts',
      recentBasis: 'updated_at',
    },
    readState: {
      basis: 'exact_server_counts',
      source: 'service_pricing_room_pricing_projection',
      complete: true,
      pagination: 'server_windowed_union',
      average: 'unavailable_without_aggregate_receiver',
      facilityHydration: hospitalHydration.complete ? 'complete' : 'partial',
      unresolvedFacilityCount: hospitalHydration.unresolvedCount,
      boundedBy: {
        family: normalizePricingFamily(family),
        scope,
        search: searchTerm,
        page: safePage,
        pageSize: safePageSize,
      },
    },
  };
};
