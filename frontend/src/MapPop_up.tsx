
import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPop_up.css";

const apartmentIcon = L.divIcon({
    html: '<i class="fa-solid fa-home" style="font-size:28px; color: #FF4500;"></i>',
    className: "custom-marker-icon apartment-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
});

const poiIcon = (type: string) => L.divIcon({
    html: `<i class="fa-solid ${getPoiIconClass(type)}" style="font-size:20px; color: #007BFF;"></i>`,
    className: "custom-marker-icon poi-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

function getPoiIconClass(type: string): string {
    switch (type) {
        case 'bus_stop': return 'fa-bus';
        case 'tram_stop': return 'fa-tram';
        case 'subway_station': return 'fa-subway';
        case 'supermarket': return 'fa-shopping-cart';
        case 'university': return 'fa-university';
        case 'park': return 'fa-tree';
        case 'restaurant': return 'fa-utensils';
        case 'pharmacy': return 'fa-pills';
        default: return 'fa-map-marker-alt';
    }
}

interface POI {
    id: string | number;
    lat: number;
    lng: number;
    name: string;
    type: string;
    distance?: number;
    osm_type?: string;
    osm_id?: number;
}

interface PoiFilterButton {
    id: string;
    label: string;
    osmQueryTags: Record<string, string | string[]>;
    poiType: string;
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

const MapEffect: React.FC<{
    apartmentPos: LatLngExpression;
    pois: POI[];
    selectedPoiForRoute: POI | null;
    initialCenter: LatLngExpression;
    initialZoom: number;
}> = ({ apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom }) => {
    const map = useMap();

    useEffect(() => {
        map.invalidateSize();

        if (selectedPoiForRoute) {
        } else if (pois.length > 0) {
            const bounds = L.latLngBounds([apartmentPos]);
            pois.forEach(poi => bounds.extend([poi.lat, poi.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView(initialCenter, initialZoom);
        }
    }, [map, apartmentPos, pois, selectedPoiForRoute, initialCenter, initialZoom]);

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
    }, [lat, lng]);

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.error("MapPop_up a primit lat/lng invalid:", lat, lng);
        return <div className="popup-overlay" onClick={onClose}><div className="map-popup-content">Eroare: Coordonate invalide pentru harta.</div></div>;
    }

    const initialMapZoom = 16;
    const apartmentPosition: LatLngExpression = [lat, lng];
    const mapZoom = 16;
    const [activePoiType, setActivePoiType] = useState<string | null>(null);
    const [pointsOfInterest, setPointsOfInterest] = useState<POI[]>([]);
    const [loadingPois, setLoadingPois] = useState<boolean>(false);
    const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
    const [routePolyline, setRoutePolyline] = useState<LatLngExpression[] | null>(null);


    //  distanta Haversine in metri
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
                    const [s, n, w, e] = locationData.boundingbox.map(parseFloat);
                    searchArea = `(${s},${w},${n},${e})`;
                } else {
                    searchArea = `(around:15000,${parseFloat(locationData.lat)},${parseFloat(locationData.lon)})`;
                }

                const overpassQuery = `[out:json][timeout:25];(nwr[amenity=university]${searchArea};);out center;`;

                const overpassResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
                if (!overpassResponse.ok) throw new Error(`Eroare Overpass API: ${overpassResponse.statusText}`);
                const data = await overpassResponse.json();

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

                pois = Array.from(new Map<string, POI>(allUniversities.map((p: POI) => [p.name, p])).values())
                    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            }
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

    const handlePoiClick = async (poi: POI) => {
        setSelectedPoi(poi);
        setRoutePolyline(null);

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
            setRoutePolyline([[lat, lng], [poi.lat, poi.lng]]);
        }
    };


    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="map-popup-content" onClick={(e) => e.stopPropagation()}>
                <button className="popup-close map-popup-close" onClick={onClose}>
                    x
                </button>

                <div className="map-layout-container">
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

                            {pointsOfInterest.map(poi => (
                                <Marker key={`${poi.osm_type}-${poi.osm_id}`} position={[poi.lat, poi.lng]} icon={poiIcon(poi.type)} eventHandlers={{ click: () => handlePoiClick(poi) }}>
                                    <Popup>{poi.name}<br />Aprox. {poi.distance} m</Popup>
                                </Marker>
                            ))}

                            {routePolyline && <Polyline positions={routePolyline} color="red" />}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPop_up;