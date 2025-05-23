// frontend/src/components/MapPop_up.tsx
import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPop_up.css"; // Asigura-te ca ai si CSS-ul actualizat

// Iconite default Leaflet (daca nu vrei sa le suprascrii global)
// import "leaflet/dist/images/marker-icon.png";
// import "leaflet/dist/images/marker-shadow.png";

// Iconite custom pentru apartament si POI-uri
const apartmentIcon = L.divIcon({
    html: '<i class="fa-solid fa-home" style="font-size:28px; color: #FF4500;"></i>', // O culoare distincta pentru apartament
    className: "custom-marker-icon apartment-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

const poiIcon = (type: string) => L.divIcon({ // Functie pentru a genera iconite diferite pe tip
    html: `<i class="fa-solid ${getPoiIconClass(type)}" style="font-size:20px; color: #007BFF;"></i>`, // Albastru pentru POI
    className: "custom-marker-icon poi-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

// Functie ajutatoare pentru a alege clasa FontAwesome pe baza tipului de POI
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
    distance?: number; // Distanta in metri fata de apartament
    osm_type?: string; // 'node', 'way', 'relation' - util pentru Overpass
    osm_id?: number;
}

// Tipuri pentru butoanele de filtrare POI
interface PoiFilterButton {
    id: string; // ex: 'transport', 'shops', 'education'
    label: string; // "Transport Public"
    osmQueryTags: Record<string, string | string[]>; // Tag-uri pentru query-ul Overpass
    poiType: string; // Tipul specific (ex: 'bus_stop', 'tram_stop') - poate fi un array daca un buton acopera mai multe
}

const POI_CATEGORIES: PoiFilterButton[] = [
    { id: 'tram_stops', label: 'Statii Tramvai', osmQueryTags: { "railway": "tram_stop" }, poiType: 'tram_stop' },
    { id: 'bus_stops', label: 'Statii Autobuz', osmQueryTags: { "highway": "bus_stop" }, poiType: 'bus_stop' },
    { id: 'supermarkets', label: 'Supermarketuri', osmQueryTags: { "shop": "supermarket" }, poiType: 'supermarket' },
    { id: 'universities', label: 'Universitati', osmQueryTags: { "amenity": "university" }, poiType: 'university' },
    { id: 'parks', label: 'Parcuri', osmQueryTags: { "leisure": "park" }, poiType: 'park' },
    { id: 'pharmacies', label: 'Farmacii', osmQueryTags: { "amenity": "pharmacy" }, poiType: 'pharmacy' },
];


interface MapPopUpProps {
    lat: number;
    lng: number;
    address: string;
    onClose: () => void;
}

// Componenta mica pentru a accesa instanta hartii si a o re-centra/re-ajusta zoom-ul
const MapEffect: React.FC<{
    apartmentPos: LatLngExpression;
    pois: POI[];
    selectedPoiForRoute: POI | null; // Adaugam POI-ul selectat pentru ruta
    initialCenter: LatLngExpression; // Centrul initial al apartamentului
    initialZoom: number;          // Zoom-ul initial
}> = ({ apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom }) => {
    const map = useMap();

    useEffect(() => {
        // Invalideaza dimensiunea la fiecare schimbare relevanta
        map.invalidateSize();

        if (selectedPoiForRoute) {
            // Daca un POI este selectat pentru ruta, doar ne asiguram ca si POI-ul este vizibil,
            // dar nu facem un fitBounds agresiv care sa includa *toate* POI-urile.
            // Putem centra pe apartament sau pe o medie intre apartament si POI.
            // Sau, pur si simplu, nu schimbam vizualizarea daca utilizatorul a navigat manual.
            // Pentru moment, lasam utilizatorul sa controleze zoom-ul/centrul dupa ce a selectat un POI
            // sau putem centra pe POI-ul selectat daca dorim.
            // map.setView([selectedPoiForRoute.lat, selectedPoiForRoute.lng], map.getZoom()); // Exemplu: centreaza pe POI
        } else if (pois.length > 0) {
            // Cand se incarca o lista NOUa de POI-uri (dar niciunul nu e selectat pentru ruta inca),
            // facem fitBounds pentru a le include pe toate.
            const bounds = L.latLngBounds([apartmentPos]);
            pois.forEach(poi => bounds.extend([poi.lat, poi.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Daca nu sunt POI-uri afisate (ex: la prima incarcare sau dupa reset), centreaza pe apartament.
            map.setView(initialCenter, initialZoom);
        }
    }, [map, apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom]); // Adaugam selectedPoiForRoute si initial props

    return null;
};


const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, address, onClose }) => {

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error("MapPop_up a primit lat/lng invalid:", lat, lng);
        // Poti returna un mesaj de eroare sau null pentru a nu randa harta
        return <div className="popup-overlay" onClick={onClose}><div className="map-popup-content">Eroare: Coordonate invalide pentru harta.</div></div>;
    }


    // initialMapZoom si initialCenter sunt folosite in MapEffect
    const initialMapZoom = 16;

    const apartmentPosition: LatLngExpression = [lat, lng];
    const mapZoom = 16;
    const [activePoiType, setActivePoiType] = useState<string | null>(null);
    const [pointsOfInterest, setPointsOfInterest] = useState<POI[]>([]);
    const [loadingPois, setLoadingPois] = useState<boolean>(false);
    const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
    const [routePolyline, setRoutePolyline] = useState<LatLngExpression[] | null>(null);


    // Functie pentru a calcula distanta (Haversine) - in metri
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Raza Pamantului in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distanta in metri
    };

    const fetchPOIs = useCallback(async (category: PoiFilterButton) => {
        if (!lat || !lng) return;
        setLoadingPois(true);
        setPointsOfInterest([]); // Reseteaza POI-urile anterioare
        setSelectedPoi(null);       // <-- IMPORTANT: Reseteaza POI-ul selectat
        setRoutePolyline(null);
        setActivePoiType(category.id);

        // Determina raza de cautare (ex: 2km = 2000m)
        const radius = 2000; // in metri

        // Construieste query-ul Overpass
        // (node[tag](around:radius,lat,lng);); -> cauta noduri
        // (way[tag](around:radius,lat,lng);); -> cauta cai (ex: cladiri, parcuri)
        // (relation[tag](around:radius,lat,lng);); -> cauta relatii
        // Folosim (nwr ...) pentru a cauta in toate tipurile
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
            // Poti seta o stare de eroare aici pentru a o afisa in UI
        } finally {
            setLoadingPois(false);
        }
    }, [lat, lng]); // `calculateDistance` nu se schimba, deci nu e nevoie in dependente


    // Pentru a desena ruta cand un POI este selectat

    const handlePoiClick = async (poi: POI) => {
        setSelectedPoi(poi);
        setRoutePolyline(null); // Reseteaza ruta anterioara
        // Cauta o ruta folosind un serviciu de rutare (ex: OSRM, GraphHopper, sau chiar Google Directions via backend)
        // Aici un exemplu simplu cu OSRM (Open Source Routing Machine) - necesita un server OSRM sau folosirea demo.project-osrm.org
        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${poi.lng},${poi.lat}?overview=full&geometries=geojson`);
            // Atentie: coordonatele pentru OSRM sunt lon,lat
            if (!response.ok) throw new Error("Eroare la serviciul de rutare");
            const routeData = await response.json();
            if (routeData.routes && routeData.routes.length > 0) {
                const coordinates = routeData.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as LatLngExpression); // OSRM returneaza [lon, lat]
                setRoutePolyline(coordinates);
            }
        } catch (error) {
            console.error("Eroare la calcularea rutei:", error);
            // Ca fallback, deseneaza o linie dreapta
            setRoutePolyline([[lat, lng], [poi.lat, poi.lng]]);
        }
    };


    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="map-popup-content" onClick={(e) => e.stopPropagation()}> {/* Clasa diferita pentru continutul hartii */}
                <button className="popup-close map-popup-close" onClick={onClose}> {/* Clasa diferita pentru butonul de close */}
                    x {/* Simbol X mai elegant */}
                </button>

                <div className="map-layout-container">
                    {/* Partea Stanga: Lista POI-urilor */}
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
                                    {loadingPois && activePoiType === category.id ? 'Se incarca...' : category.label}
                                </button>
                            ))}
                        </div>
                        {loadingPois && activePoiType && <p className="loading-text">Se cauta {POI_CATEGORIES.find(c => c.id === activePoiType)?.label.toLowerCase()}...</p>}

                        <ul className="poi-list">
                            {!loadingPois && pointsOfInterest.length === 0 && activePoiType && (
                                <li className="no-results">Niciun rezultat pentru {POI_CATEGORIES.find(c => c.id === activePoiType)?.label.toLowerCase()} in apropiere (2km).</li>
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

                    {/* Partea Dreapta: Harta */}
                    <div className="map-container-wrapper">
                        <p className="map-address-display">
                            <strong style={{ color: "#FF4500" }}>Locatia Apartamentului:</strong> {address}
                        </p>
                        <MapContainer
                            center={apartmentPosition}
                            zoom={mapZoom}
                            style={{ height: "100%", width: "100%" }} // Ajustat pentru a umple wrapper-ul
                        // ref={mapRef} // `whenCreated` este depreciat, folosim `useMap` in componenta `MapEffect`
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

                            {/* Ruta catre POI-ul selectat */}
                            {routePolyline && <Polyline positions={routePolyline} color="red" />}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPop_up;