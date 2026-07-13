import { VISIT_MUTATION_UNAVAILABLE_REASON } from './constants';

export async function createVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

export async function updateVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

export async function deleteVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

export async function completeVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

export async function cancelVisit() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}

export async function markVisitAsNoShow() {
  throw new Error(VISIT_MUTATION_UNAVAILABLE_REASON);
}
