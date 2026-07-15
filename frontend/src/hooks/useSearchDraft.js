import { useEffect, useRef, useState } from 'react';

// Lane-neutral search draft debounce (donor: mobile canon SearchRow; extracted so
// the tablet lane composes the SAME mechanism instead of re-deriving it).
// 300ms draft -> committed filter; external writes sync back into the draft.
export const SEARCH_DEBOUNCE_MS = 300;

export const useSearchDraft = (search, commit) => {
  const [searchDraft, setSearchDraft] = useState(search || '');
  // Consumers pass inline commit lambdas; holding the latest in a ref keeps the
  // debounce timer keyed to KEYSTROKES, not to every parent re-render.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => { setSearchDraft(search || ''); }, [search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((search || '') !== searchDraft) commitRef.current?.(searchDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft, search]);

  return [searchDraft, setSearchDraft];
};
