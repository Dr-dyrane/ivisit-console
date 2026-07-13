export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
export const GOOGLE_MAP_ID = (
  process.env.REACT_APP_GOOGLE_MAP_ID
  || process.env.REACT_APP_GOOGLE_MAPS_MAP_ID
  || ''
).trim() || null;
export const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 };
export const HOSPITAL_MARKER_IMAGE = '/map/hospital.png';
export const HOSPITAL_MARKER_SELECTED_IMAGE = '/map/selected_hospital.png';
export const AMBULANCE_MARKER_IMAGE = '/map/ambulance.png';

const sanitizeStrokeColor = (value, fallback = '#86100E') => {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  if (!color || color.includes('var(')) return fallback;
  return color;
};

export const getRouteStrokeOptions = ({ color, dashed }) => {
  const strokeColor = sanitizeStrokeColor(color, '#86100E');
  if (!dashed) {
    return {
      strokeColor,
      strokeOpacity: 0.82,
      strokeWeight: 5,
      geodesic: false,
    };
  }

  return {
    strokeColor,
    strokeOpacity: 0,
    strokeWeight: 0,
    geodesic: false,
    icons: [{
      icon: {
        path: 'M 0,-1 0,1',
        strokeColor,
        strokeOpacity: 0.72,
        strokeWeight: 4,
        scale: 3,
      },
      offset: '0',
      repeat: '18px',
    }],
  };
};

export const createImageOverlayNode = ({ src, width, height, opacity = 1 }) => {
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.draggable = false;
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;
  img.style.opacity = String(opacity);
  img.style.userSelect = 'none';
  img.style.pointerEvents = 'none';
  return img;
};

export const createEmergencyOverlayNode = ({ color, critical = false }) => {
  const root = document.createElement('div');
  root.style.width = '30px';
  root.style.height = '42px';
  root.style.position = 'relative';
  root.style.pointerEvents = 'none';

  const pin = document.createElement('div');
  pin.style.position = 'absolute';
  pin.style.left = '0';
  pin.style.top = '0';
  pin.style.width = '30px';
  pin.style.height = '30px';
  pin.style.background = color || '#ef4444';
  pin.style.borderRadius = '50% 50% 50% 0';
  pin.style.transform = 'rotate(-45deg)';
  pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';

  const icon = document.createElement('div');
  icon.textContent = '!';
  icon.style.position = 'absolute';
  icon.style.left = '8px';
  icon.style.top = '4px';
  icon.style.color = '#ffffff';
  icon.style.fontWeight = '900';
  icon.style.fontSize = '15px';
  icon.style.transform = 'rotate(45deg)';
  icon.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  pin.appendChild(icon);
  root.appendChild(pin);

  if (critical) {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.right = '-2px';
    dot.style.top = '-2px';
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '999px';
    dot.style.background = '#ef4444';
    dot.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.7)';
    root.appendChild(dot);
  }

  return root;
};

export const createUserOverlayNode = () => {
  const root = document.createElement('div');
  root.style.width = '18px';
  root.style.height = '18px';
  root.style.borderRadius = '999px';
  root.style.background = '#7c3aed';
  root.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  root.style.pointerEvents = 'none';
  return root;
};

export const markerLabel = (type, data = {}) => {
  if (type === 'emergency') {
    return `Request ${data.display_id || data.id || 'location'}${data.priority ? `, ${data.priority} priority` : ''}`;
  }
  if (type === 'ambulance') {
    return `Ambulance ${data.call_sign || data.vehicle_number || data.id || 'location'}`;
  }
  if (type === 'hospital') {
    return `Hospital ${data.name || data.hospital_name || data.id || 'location'}`;
  }
  return 'Your location';
};
