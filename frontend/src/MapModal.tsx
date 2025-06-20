import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MapModalProps {
    lat: number;
    lng: number;
    address: string;
    onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ lat, lng, address, onClose }) => {
    return (
        <div className="map-modal">
            <button onClick={onClose}>inchide</button>
            <MapContainer center={[lat, lng]} zoom={13} style={{ height: "400px", width: "100%" }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={[lat, lng]}>
                    <Popup>{address}</Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

export default MapModal;
