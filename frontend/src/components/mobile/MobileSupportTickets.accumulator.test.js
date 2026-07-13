jest.mock('./MobileDetailSheet', () => ({
  MobileDetailSheet: () => null,
}));

import { QueryClient } from '@tanstack/react-query';
import {
  createMobileSupportAccumulator,
  pruneSupportTicketIdsFromCache,
  reconcileMobileSupportAccumulator,
} from './MobileSupportTickets';

const ticket = (id) => ({ id, subject: `Ticket ${id}` });
const ids = (rows) => rows.map((row) => row.id);

describe('MobileSupportTickets loaded-page reconciliation', () => {
  it('prunes a confirmed deletion from every loaded page and every later load-more window', () => {
    const accumulator = createMobileSupportAccumulator();
    const pageOne = [ticket('a'), ticket('b')];
    const pageTwo = [ticket('c'), ticket('d')];

    reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 1,
      sourceTickets: pageOne,
    });
    let rows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 2,
      sourceTickets: pageTwo,
    });
    expect(ids(rows)).toEqual(['a', 'b', 'c', 'd']);

    rows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 2,
      sourceTickets: pageTwo,
      confirmedDeletedTicketIds: ['b'],
    });
    expect(ids(rows)).toEqual(['a', 'c', 'd']);
    accumulator.pages.forEach((pageRows) => {
      expect(ids(pageRows)).not.toContain('b');
    });

    rows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 3,
      sourceTickets: [ticket('b'), ticket('e')],
      confirmedDeletedTicketIds: ['b'],
    });
    expect(ids(rows)).toEqual(['a', 'c', 'd', 'e']);
    expect(accumulator.deletedIds.has('b')).toBe(true);

    rows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'open-only',
      pageKey: 1,
      sourceTickets: [ticket('b'), ticket('f')],
      confirmedDeletedTicketIds: ['b'],
    });
    expect(ids(rows)).toEqual(['f']);
  });

  it('restores a failed optimistic delete without losing other loaded pages', () => {
    const accumulator = createMobileSupportAccumulator();
    const pageOne = [ticket('a'), ticket('b')];
    const pageTwo = [ticket('c'), ticket('d')];

    reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 1,
      sourceTickets: pageOne,
    });
    reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 2,
      sourceTickets: pageTwo,
    });

    const optimisticRows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 2,
      sourceTickets: [ticket('d')],
    });
    expect(ids(optimisticRows)).toEqual(['a', 'b', 'd']);
    expect(accumulator.deletedIds.has('c')).toBe(false);

    const rolledBackRows = reconcileMobileSupportAccumulator({
      accumulator,
      signature: 'all',
      pageKey: 2,
      sourceTickets: pageTwo,
    });
    expect(ids(rolledBackRows)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('prunes confirmed ids from each React Query page cache without changing unrelated caches', () => {
    const queryClient = new QueryClient();
    const firstPage = { data: [ticket('a'), ticket('b')], count: 4, stats: { total: 4 } };
    const laterPage = { data: [ticket('b'), ticket('c')], count: 4, stats: { total: 4 } };
    const unrelatedPage = { data: [ticket('d')], count: 4, stats: { total: 4 } };

    queryClient.setQueryData(['support', { offset: 0 }], firstPage);
    queryClient.setQueryData(['support', { offset: 20 }], laterPage);
    queryClient.setQueryData(['other'], unrelatedPage);
    queryClient.setQueriesData(
      { queryKey: ['support'] },
      (cache) => pruneSupportTicketIdsFromCache(cache, ['b'])
    );

    expect(queryClient.getQueryData(['support', { offset: 0 }])).toEqual({
      ...firstPage,
      data: [ticket('a')],
      count: 3,
    });
    expect(queryClient.getQueryData(['support', { offset: 20 }])).toEqual({
      ...laterPage,
      data: [ticket('c')],
      count: 3,
    });
    expect(queryClient.getQueryData(['other'])).toBe(unrelatedPage);
    expect(pruneSupportTicketIdsFromCache(unrelatedPage, ['b'])).toBe(unrelatedPage);
    expect(pruneSupportTicketIdsFromCache(firstPage, [])).toBe(firstPage);
  });
});
