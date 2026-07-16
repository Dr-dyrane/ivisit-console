import { useEffect, useRef, useState } from 'react';
import { getResolvedPricePreview } from '../../../services/pricing/resolvedPrice';
import { getPricingRuleType } from './pricingPageModel';

const IDLE_PREVIEW = Object.freeze({ status: 'idle', row: null });

// ADOPT-64 read-only preview: asks the verified pure-read resolver RPCs
// (get_service_price / get_room_price) what price the focused rule's
// resolution key returns at the rule's own facility scope. Never writes.
export const useResolvedPricePreview = (price) => {
  const [preview, setPreview] = useState(IDLE_PREVIEW);
  const requestRef = useRef(0);

  const priceId = price?.id || null;
  const family = price?.family || price?._pricingType || null;
  const type = getPricingRuleType(price || {});
  const hospitalId = price?.hospital_id || price?.hospitalId || null;

  useEffect(() => {
    if (!priceId) {
      setPreview(IDLE_PREVIEW);
      return undefined;
    }
    if (!family || !type) {
      setPreview({ status: 'unavailable', row: null });
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    let cancelled = false;
    const canApply = () => !cancelled && requestRef.current === requestId;

    setPreview({ status: 'loading', row: null });
    getResolvedPricePreview({ family, type, hospitalId })
      .then((result) => {
        if (canApply()) setPreview(result);
      })
      .catch(() => {
        if (canApply()) setPreview({ status: 'error', row: null });
      });

    return () => {
      cancelled = true;
    };
  }, [family, hospitalId, priceId, type]);

  return preview;
};
