import fs from 'fs';
import { readSourceEstate } from '../test/sourceEstates';

const read = (file) => fs.readFileSync(file, 'utf8');

describe('route-owned query convergence contract', () => {
  const queryPairs = [
    ['src/hooks/useHospitalsQuery.js', 'src/services/hospitals/pageQueries.js'],
    ['src/hooks/useDoctorsQuery.js', 'src/services/doctorsService.js'],
    ['src/hooks/useEmergencyQuery.js', 'src/services/emergency/listQueries.js'],
    ['src/hooks/useSupportTicketsQuery.js', 'src/services/support-tickets/pageQueries.js'],
    ['src/hooks/useAmbulancesQuery.js', 'src/services/ambulances/pageQueries.js'],
  ];

  it.each(queryPairs)('%s forwards cancellation into %s', (hookFile, serviceFile) => {
    const hook = read(hookFile);
    const service = read(serviceFile);

    expect(hook).toContain('queryFn: ({ signal })');
    expect(hook).toContain('abortSignal: signal');
    expect(service).toContain('applyQueryAbortSignal');
    expect(service).toContain('throwIfQueryAborted');
  });

  it('cancels a stale facility deep-link projection when the route changes', () => {
    const page = readSourceEstate({
      files: ['src/components/pages/HospitalsPage.jsx'],
      directories: ['src/components/pages/hospitals'],
    });

    expect(page).toContain('const controller = new AbortController();');
    expect(page).toContain('getHospital(hospitalId, {');
    expect(page).toContain('abortSignal: controller.signal');
    expect(page).toContain('organizationId: organizationScopeId');
    expect(page).toContain('controller.abort();');
    expect(page).toContain('isQueryAbortError(error)');
  });
});

describe('mutation settlement convergence contract', () => {
  const mutationHooks = [
    'src/hooks/useHospitalsMutations.js',
    'src/hooks/useDoctorsMutations.js',
    'src/hooks/useEmergencyMutations.js',
    'src/hooks/useSupportTicketsMutations.js',
    'src/hooks/useAmbulancesMutations.js',
  ];

  it.each(mutationHooks)('%s awaits a throwing invalidation without reversing a committed write', (file) => {
    const source = read(file);

    expect(source).toContain('async onSettled(data, error, variables, context)');
    expect(source).toContain('await invalidate({ throwOnError: true });');
    expect(source).toContain("if (!error && typeof onConvergenceError === 'function')");
  });
});
