import L from 'leaflet';

export const createMarkerIcon = (type, data, getPriorityColor, getStatusColor) => {
	let html = "";

	if (type === "user") {
		html = `
        <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; inset: -12px; background-color: #3b82f64d; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #3b82f6; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
            </div>
        </div>`;
	} else if (type === "emergency") {
		const color = getPriorityColor(data.priority);
		// Using Lucide icons SVGs inline for fallback map
		html = `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${color};
            border: 4px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px ${color}80;
            position: relative;
            backdrop-filter: blur(4px);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
            ${data.priority === "critical"
					? '<span style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; border: 2px solid white;"></span>'
					: ""
				}
        </div>`;
	} else if (type === "ambulance") {
		const color = getStatusColor(data.status);
		html = `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${color};
            border: 4px solid rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px ${color}80;
            backdrop-filter: blur(4px);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>
        </div>`;
	} else if (type === "hospital") {
		html = `
        <div class="squircle" style="
            width: 44px;
            height: 44px;
            background-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3), 0 10px 25px -5px rgba(59, 130, 246, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        ">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M14 22v-4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4"></path><path d="M22 22h-6"></path><path d="M10 22H4"></path><path d="M14 2h4a2 2 0 0 1 2 2v2"></path><path d="M4 22V6a2 2 0 0 1 2-2h4"></path><path d="M8 2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>`;
	}

	return L.divIcon({
		html: html,
		className: "bg-transparent", // Remove default styles
		iconSize: type === "user" ? [24, 24] : [44, 44],
		iconAnchor: type === "user" ? [12, 12] : [22, 22],
	});
};
