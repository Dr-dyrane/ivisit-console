export const MAP_STYLES = {
  light: [
    { "elementType": "geometry", "stylers": [{ "color": "#f0f0f0" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi.medical", "stylers": [{ "visibility": "on" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#e0e0e0" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#d0d0d0" }] }
  ],
  dark: [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#aaaaaa" }] },
    { "featureType": "administrative", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "poi.medical", "stylers": [{ "visibility": "on" }] },
    { "featureType": "poi.medical", "elementType": "geometry", "stylers": [{ "color": "#1e3a8a" }] },
    { "featureType": "poi.medical", "elementType": "labels.text.fill", "stylers": [{ "color": "#3b82f6" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1f1f1f" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
  ]
};