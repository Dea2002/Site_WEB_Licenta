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
        } else if (pois.length > 0) {
            // Cand se incarca o lista NOUa de POI-uri (dar niciunul nu e selectat pentru ruta inca),
            // facem fitBounds pentru a le include pe toate.
            const bounds = L.latLngBounds([apartmentPos]);
            pois.forEach(poi => bounds.extend([poi.lat, poi.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView(initialCenter, initialZoom);
        }
    }, [map, apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom]); // Adaugam selectedPoiForRoute si initial props

    return null;
};


const MapPop_up: React.FC<MapPopUpProps> = ({ lat, lng, onClose }) => {

    const [apartmentAddress, setApartmentAddress] = useState<string>("Se incarca adresa...");
    const [cityName, setCityName] = useState<string | null>(null);

    useEffect(() => {
        const fetchAddressFromCoords = async () => {
            if (!lat || !lng) return;
            try {

                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ro`);
                if (!response.ok) throw new Error("Eroare la reverse geocoding");
                const data = await response.json();

                if (data && data.address) {
                    const city = data.address.city || data.address.town || data.address.village || data.address.county;
                    setCityName(city);
                    setApartmentAddress(data.display_name || "Adresa indisponibila");
                } else {
                    throw new Error("Adresa nu a putut fi gasita pentru coordonate.");
                }

            } catch (error) {
                console.error("Eroare la obtinerea adresei:", error);
                setApartmentAddress("Eroare la incarcarea adresei.");
            }
        };

        fetchAddressFromCoords();
    }, [lat, lng]); // se executa doar cand se schimba coordonatele

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
    const calculateDistance = (latA: number, lonA: number, latB: number, lonB: number): number => {
        const razaPamant = 6371000; // in metri
        const radLatA = (latA * Math.PI) / 180;
        const radLatB = (latB * Math.PI) / 180;
        const deltaLat = ((latB - latA) * Math.PI) / 180;
        const deltaLon = ((lonB - lonA) * Math.PI) / 180;

        const formulaHaversine =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(radLatA) * Math.cos(radLatB) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        const unghiCentral = 2 * Math.atan2(Math.sqrt(formulaHaversine), Math.sqrt(1 - formulaHaversine));
        const distanta = razaPamant * unghiCentral;
        return distanta;
    };

    const fetchPOIs = useCallback(async (category: PoiFilterButton) => {
        setLoadingPois(true);
        setPointsOfInterest([]);
        setSelectedPoi(null);
        setRoutePolyline(null);
        setActivePoiType(category.id);

        try {
            let pois: POI[] = [];
            // CAZ SPECIAL: Cautare pentru Universitati (in tot orasul)
            if (category.id === 'universities') {
                if (!cityName) {
                    alert("Orasul nu a putut fi determinat. incercati din nou.");
                    return;
                }
                const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&addressdetails=1&limit=1&accept-language=ro`);
                if (!nominatimResponse.ok) throw new Error(`Eroare Nominatim: ${nominatimResponse.statusText}`);
                const nominatimData = await nominatimResponse.json();

                if (nominatimData.length === 0) throw new Error(`Nu s-a putut geocodifica orasul: ${cityName}`);

                const locationData = nominatimData[0];
                let searchArea;
                if (locationData.boundingbox) {
                    // MODIFICAREA CHEIE ESTE AICI
                    const [s, n, w, e] = locationData.boundingbox.map(parseFloat);
                    // Reconstruim stringul in ordinea corecta pentru Overpass: (Sud, Vest, Nord, Est)
                    searchArea = `(${s},${w},${n},${e})`;
                } else {
                    // Cazul de fallback ramane neschimbat
                    searchArea = `(around:15000,${parseFloat(locationData.lat)},${parseFloat(locationData.lon)})`;
                }

                const overpassQuery = `[out:json][timeout:25];(nwr[amenity=university]${searchArea};);out center;`;

                const overpassResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
                if (!overpassResponse.ok) throw new Error(`Eroare Overpass API: ${overpassResponse.statusText}`);
                const data = await overpassResponse.json();

                // Procesam elementele primite de la Overpass
                const allUniversities = data.elements.map((el: any): POI | null => {
                    const center = el.type === 'node' ? el : el.center;
                    if (!center || typeof center.lat !== 'number' || typeof center.lon !== 'number') return null;
                    return {
                        id: el.id, lat: center.lat, lng: center.lon,
                        name: el.tags?.name || el.tags?.['name:ro'] || `Universitate (ID: ${el.id})`,
                        type: category.poiType, distance: Math.round(calculateDistance(lat, lng, center.lat, center.lon)),
                        osm_type: el.type, osm_id: el.id,
                    };
                }).filter((poi: POI | null): poi is POI => poi !== null);

                // Eliminam duplicatele dupa nume si sortam dupa distanta
                pois = Array.from(new Map<string, POI>(allUniversities.map((p: POI) => [p.name, p])).values())
                    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            }
            // CAZ GENERAL: Cautare pentru celelalte categorii (intr-o raza de 2km)
            else {
                const radius = 2000;
                const queryTag = Object.keys(category.osmQueryTags)[0];
                const queryValue = category.osmQueryTags[queryTag];
                const overpassQuery = `[out:json][timeout:25];(nwr[${queryTag}=${queryValue}](around:${radius},${lat},${lng}););out center;`;
                const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
                if (!response.ok) throw new Error(`Eroare Overpass API: ${response.statusText}`);
                const data = await response.json();

                pois = data.elements.map((el: any): POI | null => {
                    const center = el.type === 'node' ? el : el.center;
                    if (!center || typeof center.lat !== 'number' || typeof center.lon !== 'number') return null;
                    return {
                        id: el.id, lat: center.lat, lng: center.lon,
                        name: el.tags?.name || el.tags?.['name:ro'] || `${category.label} (ID: ${el.id})`,
                        type: category.poiType, distance: Math.round(calculateDistance(lat, lng, center.lat, center.lon)),
                        osm_type: el.type, osm_id: el.id,
                    };
                }).filter((poi: POI | null): poi is POI => poi !== null)
                    .sort((a: POI, b: POI) => (a.distance || Infinity) - (b.distance || Infinity));
            }
            setPointsOfInterest(pois);
        } catch (error) {
            console.error(`Eroare la preluarea POI-urilor (${category.label}):`, error);
        } finally {
            setLoadingPois(false);
        }
    }, [lat, lng, cityName]);

    // Pentru a desena ruta cand un POI este selectat

    const handlePoiClick = async (poi: POI) => {
        setSelectedPoi(poi);
        setRoutePolyline(null); // Reseteaza ruta anterioara

        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${poi.lng},${poi.lat}?overview=full&geometries=geojson`);

            if (!response.ok) throw new Error("Eroare la serviciul de rutare");
            const routeData = await response.json();
            if (routeData.routes && routeData.routes.length > 0) {
                const coordinates = routeData.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as LatLngExpression);
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
                            <strong style={{ color: "#FF4500" }}>Locatia Apartamentului:</strong> {apartmentAddress}
                        </p>
                        <MapContainer
                            center={apartmentPosition}
                            zoom={mapZoom}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <MapEffect initialCenter={apartmentPosition} initialZoom={initialMapZoom} pois={pointsOfInterest} apartmentPos={apartmentPosition} selectedPoiForRoute={selectedPoi} />
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {/* Marker pentru Apartament */}
                            <Marker position={apartmentPosition} icon={apartmentIcon}>
                                <Popup>Apartament: {apartmentAddress}</Popup>
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