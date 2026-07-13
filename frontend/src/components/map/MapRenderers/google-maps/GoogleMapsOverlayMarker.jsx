import { useEffect, useRef } from 'react';
import { useMap as useGoogleMap } from '@vis.gl/react-google-maps';

export const GoogleMapsOverlayMarker = ({
  position,
  zIndex = 200,
  anchor = 'bottom',
  onClick,
  ariaLabel,
  renderNode,
  renderKey,
}) => {
  const map = useGoogleMap();
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const clickRef = useRef(onClick);
  const renderNodeRef = useRef(renderNode);
  const isInteractive = typeof onClick === 'function';
  const positionLat = position?.lat;
  const positionLng = position?.lng;

  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    renderNodeRef.current = renderNode;
  }, [renderNode]);

  useEffect(() => {
    if (!map || !window.google || positionLat == null || positionLng == null) return undefined;
    const lat = Number(positionLat);
    const lng = Number(positionLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'auto';
    container.style.userSelect = 'none';
    container.style.transform = anchor === 'center'
      ? 'translate(-50%, -50%)'
      : 'translate(-50%, -100%)';
    container.style.zIndex = String(zIndex);
    container.setAttribute('aria-label', ariaLabel || 'Map location');
    if (isInteractive) {
      container.setAttribute('role', 'button');
      container.tabIndex = 0;
    } else {
      container.setAttribute('role', 'img');
    }
    if (typeof renderNodeRef.current === 'function') {
      container.replaceChildren(renderNodeRef.current());
    }

    const handleClick = (event) => {
      event.stopPropagation();
      clickRef.current?.();
    };
    const handleKeyDown = (event) => {
      if (!['Enter', ' '].includes(event.key) || typeof clickRef.current !== 'function') return;
      event.preventDefault();
      handleClick(event);
    };
    container.addEventListener('click', handleClick);
    container.addEventListener('keydown', handleKeyDown);

    class DomOverlay extends window.google.maps.OverlayView {
      onAdd() {
        const panes = this.getPanes();
        if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(container);
      }

      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
        if (!point) return;
        container.style.left = `${point.x}px`;
        container.style.top = `${point.y}px`;
      }

      onRemove() {
        if (container.parentNode) container.parentNode.removeChild(container);
      }
    }

    const overlay = new DomOverlay();
    overlay.setMap(map);

    containerRef.current = container;
    overlayRef.current = overlay;

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('keydown', handleKeyDown);
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      containerRef.current = null;
    };
  }, [map, positionLat, positionLng, anchor, ariaLabel, isInteractive, zIndex]);

  useEffect(() => {
    if (!containerRef.current || typeof renderNodeRef.current !== 'function') return;
    const node = renderNodeRef.current();
    containerRef.current.replaceChildren(node);
  }, [renderKey]);

  return null;
};
