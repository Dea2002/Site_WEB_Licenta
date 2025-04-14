// // MapPop_up.tsx
// // import React from "react";
// // import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// // import "leaflet/dist/leaflet.css";
// // import "./MapPop_up.css";
// // import { LatLngExpression } from "leaflet";

// import React, { useEffect, useRef } from "react";
// import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// import L, { LatLngExpression, Map as LeafletMap } from "leaflet"; // Import 'Map' as LeafletMap to avoid name conflict
// import "leaflet/dist/leaflet.css";
// import "./MapPop_up.css";

// import iconRetinaUrl from "/leaflet-images/marker-icon-2x.png";
// import iconUrl from "/leaflet-images/marker-icon.png";
// import shadowUrl from "/leaflet-images/marker-shadow.png";

// L.Icon.Default.mergeOptions({
//     iconRetinaUrl: iconRetinaUrl,
//     iconUrl: iconUrl,
//     shadowUrl: shadowUrl,
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     tooltipAnchor: [16, -28],
//     shadowSize: [41, 41],
// });
// // const center: LatLngExpression = [lat, lng];
// interface MapPopUpProps {
//     lat: number;
//     lng: number;
//     address: string;
//     onClose: () => void;
// }

// // Componenta separata pentru a accesa instanta hartii si a o invalida
// const MapInvalidator = ({ mapRef }: { mapRef: React.RefObject<LeafletMap | null> }) => {
//     // Nu folosim useMap direct aici, ci ne bazam pe ref-ul trimis
//     // pentru a rula invalidateSize din useEffect-ul parintelui

//     // Alternativ, am putea folosi useMap aici si un useEffect,
//     // dar controlul din parinte cu ref poate fi mai clar in acest caz.
//     // const map = useMap();
//     // useEffect(() => {
//     //   const timer = setTimeout(() => {
//     //     map.invalidateSize();
//     //     console.log("Map invalidated from MapInvalidator");
//     //   }, 100); // Delay mic
//     //   return () => clearTimeout(timer);
//     // }, [map]);

//     return null; // Aceasta componenta nu reda nimic vizibil
// };

// const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, address, onClose }) => {
//     const position: LatLngExpression = [lat, lng]; // Tipare corecta
//     const mapRef = useRef<LeafletMap>(null);

//     // Efect pentru a invalida dimensiunea hartii dupa montare/afisare
//     useEffect(() => {
//         // Folosim un setTimeout pentru a ne asigura ca DOM-ul este stabil
//         // si container-ul hartii are dimensiunile finale.
//         const timer = setTimeout(() => {
//             if (mapRef.current) {
//                 mapRef.current.invalidateSize();
//                 // console.log("Map invalidated from parent useEffect");
//                 // Optional: Zboara la centru dupa invalidare, daca e nevoie
//                 // mapRef.current.flyTo(position, mapRef.current.getZoom());
//             }
//         }, 100); // Un delay mic, ajusteaza daca e necesar

//         // Functie de curatare pentru a anula timeout-ul daca componenta se demonteaza
//         return () => {
//             clearTimeout(timer);
//         };
//     }, [lat, lng]); // Ruleaza cand lat/lng se schimba, desi ar putea fi suficient [] daca popup-ul se remonteaza complet la deschidere

//     return (
//         <div className="popup-overlay" onClick={onClose}>
//             {/* Asigura-te ca popup-content are dimensiuni definite in CSS! */}
//             <div className="popup-content" onClick={(e) => e.stopPropagation()}>
//                 <button className="popup-close" onClick={onClose}>
//                     X
//                 </button>
//                 <p>Locatia pentru: {address}</p>

//                 {/*
//                     Nota: Eliminam cast-ul `as any`. Folosim direct `position`.
//                     Adaugam prop-ul `whenCreated` pentru a obtine ref-ul la mapa.
//                     Daca `whenCreated` nu e disponibil in versiunea ta (mai veche),
//                     poti folosi un wrapper component cu `useMap` ca in exemplul comentat `MapInvalidator`.
//                  */}
//                 <MapContainer
//                     center={position}
//                     zoom={13}
//                     style={{ height: "400px", width: "100%" }}
//                     whenCreated={(mapInstance) => {
//                         // Stocheaza instanta hartii in ref
//                         // Verifica tipul inainte de a asigna pentru siguranta
//                         if (mapInstance) {
//                             mapRef.current = mapInstance as LeafletMap;
//                         }
//                     }}
//                 >
//                     {/*
//                         Daca eroarea TS persista aici, verifica compatibilitatea versiunilor
//                         @types/react-leaflet, react-leaflet, @types/leaflet, leaflet.
//                         Ca ultima solutie temporara: // @ts-ignore
//                     */}
//                     <TileLayer
//                         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                         attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//                     />
//                     {/* <TileLayer
//                         url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
//                         attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//                     /> */}
//                     <Marker position={position}>
//                         <Popup>{address}</Popup>
//                     </Marker>
//                     {/* Componenta MapInvalidator nu mai e necesara daca folosim whenCreated */}
//                     {/* <MapInvalidator mapRef={mapRef} /> */}
//                 </MapContainer>
//             </div>
//         </div>
//     );
// };

// export default MapPop_up;

// MapPop_up.tsx
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
