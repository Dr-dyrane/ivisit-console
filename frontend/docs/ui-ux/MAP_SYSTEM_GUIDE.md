# Map System Guide: Simulation & Recenter

**Purpose**: This document explains the "God Mode" map simulation logic and how to debug or remove it when real field operations begin. It also covers the "Recenter" functionality.

## 1. Simulation Logic (Why do hospitals float?)

Currently, to ensure the map looks populated during demos/development, we use a **simulation logic** in `src/components/pages/GodModeMap.jsx`.

### Use Case
If a hospital or ambulance has valid coordinates (`lat/lng` are not null), it is displayed there.
**However**, if coordinates are missing or `0,0`, the system automatically:
1.  Takes your current user location.
2.  Adds a deterministic random offset based on the item's ID.
3.  Places the marker near you so you can see and interact with it.
4.  **Constraint**: For hospitals, only the first 5 records are simulated to prevent map clutter.

### How to Remove It (for Field Ops)
When you have real data and want to disable this behavior:
1.  Open `src/components/pages/GodModeMap.jsx`.
2.  Search for `const simulateLocation`.
3.  Remove the logic inside `if (!hasRealLoc) { ... }` or simply return the item as-is.
4.  Alternatively, set the `spread` parameter to `0`.

```javascript
// BEFORE (Simulates)
return {
    ...item,
    lat: userLocation.lat + (pseudoRandom(index) - 0.5) * spread, ...
};

// AFTER (Strict Reality)
return item; // Markers without location will simply not collect or map
```

## 2. Recenter Functionality

The "Recenter" button (in Header, Sidebar, or FAB) resets the map view to the current user's location.

### How it works
1.  **Trigger**: User clicks a button.
2.  **Context**: The button calls `recenterMap()` from `MapContext`.
3.  **Event**: This dispatches a standard window event: `window.dispatchEvent(new CustomEvent('recenter-map'))`.
4.  **Feedback**: A toast notification appears ("Recentering map...").
5.  **Listener**:
    *   **Google Maps**: `GoogleMapsRefiner` listens for this event and pans the map.
    *   **Leaflet**: `LeafletMapRefiner` listens for this event and calls `map.setView()`.

### Debugging Recenter
If recenter stops working:
1.  Check if `recenterMap` is being called (do you see the toast?).
2.  If yes, check `LeafletMapRefiner.jsx` or `GoogleMapsRefiner.jsx` to ensure the event listener is attached.
3.  Verify `userLocation` is available (if the app doesn't know where you are, it can't center on you).

## 3. Data Source
- **Service**: `src/services/supabaseMapService.js`
- **Logic**: Bypasses standard filters (like "verified hospitals only") to show **ALL** raw data from Supabase for admin visibility.

---
**Version**: 1.1 (Simulation Enabled)
