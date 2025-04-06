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

// // Componentă separată pentru a accesa instanța hărții și a o invalida
// const MapInvalidator = ({ mapRef }: { mapRef: React.RefObject<LeafletMap | null> }) => {
//     // Nu folosim useMap direct aici, ci ne bazăm pe ref-ul trimis
//     // pentru a rula invalidateSize din useEffect-ul părintelui

//     // Alternativ, am putea folosi useMap aici și un useEffect,
//     // dar controlul din părinte cu ref poate fi mai clar în acest caz.
//     // const map = useMap();
//     // useEffect(() => {
//     //   const timer = setTimeout(() => {
//     //     map.invalidateSize();
//     //     console.log("Map invalidated from MapInvalidator");
//     //   }, 100); // Delay mic
//     //   return () => clearTimeout(timer);
//     // }, [map]);

//     return null; // Această componentă nu redă nimic vizibil
// };

// const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, address, onClose }) => {
//     const position: LatLngExpression = [lat, lng]; // Tipare corectă
//     const mapRef = useRef<LeafletMap>(null);

//     // Efect pentru a invalida dimensiunea hărții după montare/afișare
//     useEffect(() => {
//         // Folosim un setTimeout pentru a ne asigura că DOM-ul este stabil
//         // și container-ul hărții are dimensiunile finale.
//         const timer = setTimeout(() => {
//             if (mapRef.current) {
//                 mapRef.current.invalidateSize();
//                 // console.log("Map invalidated from parent useEffect");
//                 // Opțional: Zboară la centru după invalidare, dacă e nevoie
//                 // mapRef.current.flyTo(position, mapRef.current.getZoom());
//             }
//         }, 100); // Un delay mic, ajustează dacă e necesar

//         // Funcție de curățare pentru a anula timeout-ul dacă componenta se demontează
//         return () => {
//             clearTimeout(timer);
//         };
//     }, [lat, lng]); // Rulează când lat/lng se schimbă, deși ar putea fi suficient [] dacă popup-ul se remontează complet la deschidere

//     return (
//         <div className="popup-overlay" onClick={onClose}>
//             {/* Asigură-te că popup-content are dimensiuni definite în CSS! */}
//             <div className="popup-content" onClick={(e) => e.stopPropagation()}>
//                 <button className="popup-close" onClick={onClose}>
//                     X
//                 </button>
//                 <p>Locația pentru: {address}</p>

//                 {/*
//                     Notă: Eliminăm cast-ul `as any`. Folosim direct `position`.
//                     Adăugăm prop-ul `whenCreated` pentru a obține ref-ul la mapă.
//                     Dacă `whenCreated` nu e disponibil în versiunea ta (mai veche),
//                     poți folosi un wrapper component cu `useMap` ca în exemplul comentat `MapInvalidator`.
//                  */}
//                 <MapContainer
//                     center={position}
//                     zoom={13}
//                     style={{ height: "400px", width: "100%" }}
//                     whenCreated={(mapInstance) => {
//                         // Stochează instanța hărții în ref
//                         // Verifică tipul înainte de a asigna pentru siguranță
//                         if (mapInstance) {
//                             mapRef.current = mapInstance as LeafletMap;
//                         }
//                     }}
//                 >
//                     {/*
//                         Dacă eroarea TS persistă aici, verifică compatibilitatea versiunilor
//                         @types/react-leaflet, react-leaflet, @types/leaflet, leaflet.
//                         Ca ultimă soluție temporară: // @ts-ignore
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
//                     {/* Componenta MapInvalidator nu mai e necesară dacă folosim whenCreated */}
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

// Aceste importuri sunt opționale, dacă nu dorești să folosești iconițele implicite
import iconRetinaUrl from "/leaflet-images/marker-icon-2x.png";
import iconUrl from "/leaflet-images/marker-icon.png";
import shadowUrl from "/leaflet-images/marker-shadow.png";

// Setăm opțiunile implicite pentru iconițele Leaflet
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

    // Creăm o iconiță personalizată folosind Font Awesome
    // Asigură-te că Font Awesome este inclus în proiectul tău (printr-un link în index.html sau ca pachet npm)
    const customIcon = L.divIcon({
        html: '<i class="fa-solid fa-location-dot" style="font-size:24px; color: #FF8000"></i>',
        className: "custom-marker-icon", // Poți adăuga stiluri suplimentare în CSS, dacă dorești
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });

    // Efect pentru a invalida dimensiunea hărții după montare
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
