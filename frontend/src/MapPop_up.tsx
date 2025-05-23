// frontend/src/components/MapPop_up.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap, LatLng } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPop_up.css"; // Asigură-te că ai și CSS-ul actualizat

// Iconițe default Leaflet (dacă nu vrei să le suprascrii global)
// import "leaflet/dist/images/marker-icon.png";
// import "leaflet/dist/images/marker-shadow.png";

// Iconițe custom pentru apartament și POI-uri
const apartmentIcon = L.divIcon({
    html: '<i class="fa-solid fa-home" style="font-size:28px; color: #FF4500;"></i>', // O culoare distinctă pentru apartament
    className: "custom-marker-icon apartment-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

const poiIcon = (type: string) => L.divIcon({ // Funcție pentru a genera iconițe diferite pe tip
    html: `<i class="fa-solid ${getPoiIconClass(type)}" style="font-size:20px; color: #007BFF;"></i>`, // Albastru pentru POI
    className: "custom-marker-icon poi-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

// Funcție ajutătoare pentru a alege clasa FontAwesome pe baza tipului de POI
function getPoiIconClass(type: string): string {
    switch (type) {
        case 'bus_stop': return 'fa-bus';
        case 'tram_stop': return 'fa-tram';
        case 'subway_station': return 'fa-subway'; // Sau fa-train-subway
        case 'supermarket': return 'fa-shopping-cart';
        case 'university': return 'fa-university'; // Sau fa-graduation-cap
        case 'park': return 'fa-tree';
        case 'restaurant': return 'fa-utensils';
        case 'pharmacy': return 'fa-pills';
        default: return 'fa-map-marker-alt';
    }
}

// Tipuri pentru POI
interface POI {
    id: string | number;
    lat: number;
    lng: number;
    name: string;
    type: string; // 'bus_stop', 'supermarket', etc.
    distance?: number; // Distanța în metri față de apartament
    osm_type?: string; // 'node', 'way', 'relation' - util pentru Overpass
    osm_id?: number;
}

// Tipuri pentru butoanele de filtrare POI
interface PoiFilterButton {
    id: string; // ex: 'transport', 'shops', 'education'
    label: string; // "Transport Public"
    osmQueryTags: Record<string, string | string[]>; // Tag-uri pentru query-ul Overpass
    poiType: string; // Tipul specific (ex: 'bus_stop', 'tram_stop') - poate fi un array dacă un buton acoperă mai multe
}

const POI_CATEGORIES: PoiFilterButton[] = [
    { id: 'tram_stops', label: 'Stații Tramvai', osmQueryTags: { "railway": "tram_stop" }, poiType: 'tram_stop' },
    { id: 'bus_stops', label: 'Stații Autobuz', osmQueryTags: { "highway": "bus_stop" }, poiType: 'bus_stop' },
    { id: 'supermarkets', label: 'Supermarketuri', osmQueryTags: { "shop": "supermarket" }, poiType: 'supermarket' },
    { id: 'universities', label: 'Universități', osmQueryTags: { "amenity": "university" }, poiType: 'university' },
    { id: 'parks', label: 'Parcuri', osmQueryTags: { "leisure": "park" }, poiType: 'park' },
    { id: 'pharmacies', label: 'Farmacii', osmQueryTags: { "amenity": "pharmacy" }, poiType: 'pharmacy' },
];


interface MapPopUpProps {
    lat: number;
    lng: number;
    address: string;
    onClose: () => void;
}

// Componentă mică pentru a accesa instanța hărții și a o re-centra/re-ajusta zoom-ul
const MapEffect: React.FC<{
    apartmentPos: LatLngExpression;
    pois: POI[];
    selectedPoiForRoute: POI | null; // Adăugăm POI-ul selectat pentru rută
    initialCenter: LatLngExpression; // Centrul inițial al apartamentului
    initialZoom: number;          // Zoom-ul inițial
}> = ({ apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom }) => {
    const map = useMap();

    useEffect(() => {
        // Invalidează dimensiunea la fiecare schimbare relevantă
        map.invalidateSize();

        if (selectedPoiForRoute) {
            // Dacă un POI este selectat pentru rută, doar ne asigurăm că și POI-ul este vizibil,
            // dar nu facem un fitBounds agresiv care să includă *toate* POI-urile.
            // Putem centra pe apartament sau pe o medie între apartament și POI.
            // Sau, pur și simplu, nu schimbăm vizualizarea dacă utilizatorul a navigat manual.
            // Pentru moment, lăsăm utilizatorul să controleze zoom-ul/centrul după ce a selectat un POI
            // sau putem centra pe POI-ul selectat dacă dorim.
            // map.setView([selectedPoiForRoute.lat, selectedPoiForRoute.lng], map.getZoom()); // Exemplu: centrează pe POI
        } else if (pois.length > 0) {
            // Când se încarcă o listă NOUĂ de POI-uri (dar niciunul nu e selectat pentru rută încă),
            // facem fitBounds pentru a le include pe toate.
            const bounds = L.latLngBounds([apartmentPos]);
            pois.forEach(poi => bounds.extend([poi.lat, poi.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Dacă nu sunt POI-uri afișate (ex: la prima încărcare sau după reset), centrează pe apartament.
            map.setView(initialCenter, initialZoom);
        }
    }, [map, apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom]); // Adăugăm selectedPoiForRoute și initial props

    return null;
};


const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, address, onClose }) => {

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error("MapPop_up a primit lat/lng invalid:", lat, lng);
        // Poți returna un mesaj de eroare sau null pentru a nu randa harta
        return <div className="popup-overlay" onClick={onClose}><div className="map-popup-content">Eroare: Coordonate invalide pentru hartă.</div></div>;
    }


    // initialMapZoom și initialCenter sunt folosite în MapEffect
    const initialMapZoom = 16;

    const apartmentPosition: LatLngExpression = [lat, lng];
    const [mapZoom, setMapZoom] = useState(16); // Stare pentru zoom-ul inițial
    const [activePoiType, setActivePoiType] = useState<string | null>(null);
    const [pointsOfInterest, setPointsOfInterest] = useState<POI[]>([]);
    const [loadingPois, setLoadingPois] = useState<boolean>(false);
    const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
    const [routePolyline, setRoutePolyline] = useState<LatLngExpression[] | null>(null);


    // Funcție pentru a calcula distanța (Haversine) - în metri
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Raza Pământului în metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distanța în metri
    };

    const fetchPOIs = useCallback(async (category: PoiFilterButton) => {
        if (!lat || !lng) return;
        setLoadingPois(true);
        setPointsOfInterest([]); // Resetează POI-urile anterioare
        setSelectedPoi(null);       // <-- IMPORTANT: Resetează POI-ul selectat
        setRoutePolyline(null);
        setActivePoiType(category.id);

        // Determină raza de căutare (ex: 2km = 2000m)
        const radius = 2000; // în metri

        // Construiește query-ul Overpass
        // (node[tag](around:radius,lat,lng);); -> caută noduri
        // (way[tag](around:radius,lat,lng);); -> caută căi (ex: clădiri, parcuri)
        // (relation[tag](around:radius,lat,lng);); -> caută relații
        // Folosim (nwr ...) pentru a căuta în toate tipurile
        let queryParts: string[] = [];
        for (const tagKey in category.osmQueryTags) {
            const tagValue = category.osmQueryTags[tagKey];
            if (Array.isArray(tagValue)) {
                tagValue.forEach(val => {
                    queryParts.push(`(nwr[${tagKey}=${val}](around:${radius},${lat},${lng}););`);
                });
            } else {
                queryParts.push(`(nwr[${tagKey}=${tagValue}](around:${radius},${lat},${lng}););`);
            }
        }
        const overpassQuery = `[out:json][timeout:25];(${queryParts.join('')});out center;`;
        // console.log("Overpass Query:", overpassQuery);

        try {
            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
            if (!response.ok) {
                throw new Error(`Eroare Overpass API: ${response.statusText}`);
            }
            const data = await response.json();
            // console.log("Overpass Data:", data);

            const pois: POI[] = data.elements.map((element: any): POI | null => {
                let poiLat, poiLng;
                if (element.type === "node") {
                    poiLat = element.lat;
                    poiLng = element.lon;
                } else if (element.center) { // Pentru way/relation, Overpass poate returna .center
                    poiLat = element.center.lat;
                    poiLng = element.center.lon;
                } else {
                    return null; // Nu avem coordonate valide
                }

                if (poiLat === undefined || poiLng === undefined) return null;

                const distance = calculateDistance(lat, lng, poiLat, poiLng);
                return {
                    id: element.id,
                    lat: poiLat,
                    lng: poiLng,
                    name: element.tags?.name || element.tags?.['name:ro'] || `${category.label} (ID: ${element.id})`, // Numele POI-ului
                    type: category.poiType, // Tipul setat de buton
                    distance: Math.round(distance),
                    osm_type: element.type,
                    osm_id: element.id,
                };
            }).filter((poi: POI) => poi !== null).sort((a: POI, b: POI) => (a.distance || Infinity) - (b.distance || Infinity));

            setPointsOfInterest(pois);
        } catch (error) {
            console.error(`Eroare la preluarea POI-urilor (${category.label}):`, error);
            // Poți seta o stare de eroare aici pentru a o afișa în UI
        } finally {
            setLoadingPois(false);
        }
    }, [lat, lng]); // `calculateDistance` nu se schimbă, deci nu e nevoie în dependențe


    // Pentru a desena ruta când un POI este selectat

    const handlePoiClick = async (poi: POI) => {
        setSelectedPoi(poi);
        setRoutePolyline(null); // Resetează ruta anterioară
        // Caută o rută folosind un serviciu de rutare (ex: OSRM, GraphHopper, sau chiar Google Directions via backend)
        // Aici un exemplu simplu cu OSRM (Open Source Routing Machine) - necesită un server OSRM sau folosirea demo.project-osrm.org
        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${poi.lng},${poi.lat}?overview=full&geometries=geojson`);
            // Atenție: coordonatele pentru OSRM sunt lon,lat
            if (!response.ok) throw new Error("Eroare la serviciul de rutare");
            const routeData = await response.json();
            if (routeData.routes && routeData.routes.length > 0) {
                const coordinates = routeData.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as LatLngExpression); // OSRM returnează [lon, lat]
                setRoutePolyline(coordinates);
            }
        } catch (error) {
            console.error("Eroare la calcularea rutei:", error);
            // Ca fallback, desenează o linie dreaptă
            setRoutePolyline([[lat, lng], [poi.lat, poi.lng]]);
        }
    };


    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="map-popup-content" onClick={(e) => e.stopPropagation()}> {/* Clasă diferită pentru conținutul hărții */}
                <button className="popup-close map-popup-close" onClick={onClose}> {/* Clasă diferită pentru butonul de close */}
                    x {/* Simbol X mai elegant */}
                </button>

                <div className="map-layout-container">
                    {/* Partea Stângă: Lista POI-urilor */}
                    <div className="poi-list-container">
                        <h3>Puncte de Interes</h3>
                        <div className="poi-filter-buttons">
                            {POI_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => fetchPOIs(category)}
                                    className={activePoiType === category.id ? 'active' : ''}
                                    disabled={loadingPois}
                                >
                                    {loadingPois && activePoiType === category.id ? 'Se încarcă...' : category.label}
                                </button>
                            ))}
                        </div>
                        {loadingPois && activePoiType && <p className="loading-text">Se caută {POI_CATEGORIES.find(c => c.id === activePoiType)?.label.toLowerCase()}...</p>}

                        <ul className="poi-list">
                            {!loadingPois && pointsOfInterest.length === 0 && activePoiType && (
                                <li className="no-results">Niciun rezultat pentru {POI_CATEGORIES.find(c => c.id === activePoiType)?.label.toLowerCase()} în apropiere (2km).</li>
                            )}
                            {!loadingPois && pointsOfInterest.map(poi => (
                                <li key={`${poi.osm_type}-${poi.osm_id}`} onClick={() => handlePoiClick(poi)} className={selectedPoi?.id === poi.id ? 'selected' : ''}>
                                    <i className={`fa-solid ${getPoiIconClass(poi.type)} poi-list-icon`}></i>
                                    <span className="poi-name">{poi.name}</span>
                                    {poi.distance !== undefined && <span className="poi-distance">aprox. {poi.distance} m</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Partea Dreaptă: Harta */}
                    <div className="map-container-wrapper">
                        <p className="map-address-display">
                            <strong style={{ color: "#FF4500" }}>Locația Apartamentului:</strong> {address}
                        </p>
                        <MapContainer
                            center={apartmentPosition}
                            zoom={mapZoom}
                            style={{ height: "100%", width: "100%" }} // Ajustat pentru a umple wrapper-ul
                        // ref={mapRef} // `whenCreated` este depreciat, folosim `useMap` în componenta `MapEffect`
                        >
                            <MapEffect initialCenter={apartmentPosition} initialZoom={initialMapZoom} pois={pointsOfInterest} apartmentPos={apartmentPosition} selectedPoiForRoute={selectedPoi} />
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {/* Marker pentru Apartament */}
                            <Marker position={apartmentPosition} icon={apartmentIcon}>
                                <Popup>Apartament: {address}</Popup>
                            </Marker>

                            {/* Markere pentru POI-uri */}
                            {pointsOfInterest.map(poi => (
                                <Marker key={`${poi.osm_type}-${poi.osm_id}`} position={[poi.lat, poi.lng]} icon={poiIcon(poi.type)} eventHandlers={{ click: () => handlePoiClick(poi) }}>
                                    <Popup>{poi.name}<br />Aprox. {poi.distance} m</Popup>
                                </Marker>
                            ))}

                            {/* Ruta către POI-ul selectat */}
                            {routePolyline && <Polyline positions={routePolyline} color="red" />}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPop_up;