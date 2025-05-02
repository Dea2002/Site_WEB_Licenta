import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPop_up.css";

// Aceste importuri sunt optionale, daca nu doresti sa folosesti iconitele implicite
import iconRetinaUrl from "/leaflet-images/marker-icon-2x.png";
import iconUrl from "/leaflet-images/marker-icon.png";
import shadowUrl from "/leaflet-images/marker-shadow.png";

// Setam optiunile implicite pentru iconitele Leaflet
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
});

interface MapPopUpProps {
    lat: number;
    lng: number;
    address: string;
    onClose: () => void;
}

const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, address, onClose }) => {
    const position: LatLngExpression = [lat, lng];
    const mapRef = useRef<LeafletMap>(null);

    // Cream o iconita personalizata folosind Font Awesome
    // Asigura-te ca Font Awesome este inclus in proiectul tau (printr-un link in index.html sau ca pachet npm)
    const customIcon = L.divIcon({
        html: '<i class="fa-solid fa-location-dot" style="font-size:24px; color: #FF8000"></i>',
        className: "custom-marker-icon", // Poti adauga stiluri suplimentare in CSS, daca doresti
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });

    // Efect pentru a invalida dimensiunea hartii dupa montare
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [lat, lng]);

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <button className="popup-close" onClick={onClose}>
                    X
                </button>
                <p>
                    <strong style={{ color: "#FF8000" }}>Locatia:</strong> {address}
                </p>
                <MapContainer
                    center={position}
                    zoom={16}
                    style={{ height: "600px", width: "700px" }}
                // whenCreated={(mapInstance) => {
                //     if (mapInstance) {
                //         mapRef.current = mapInstance;
                //     }
                // }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={position} icon={customIcon}>
                        <Popup>{address}</Popup>
                    </Marker>
                </MapContainer>
            </div>
        </div>
    );
};

export default MapPop_up;
