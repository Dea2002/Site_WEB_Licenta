import React, { useState, useEffect, useMemo } from "react";
import { api } from "./api";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginModal from "./LoginModal";
import { Apartment } from "./types"; // Make sure Apartment type includes all relevant fields
import "./style.css"; // Your existing CSS for Home
import MapModal from "./MapModal"; // Assuming this is used elsewhere or for future use
import { Faculty } from "./AuthContext";
import { University } from "./types";

interface ProximityPoiFilter {
    enabled: boolean;
    maxDistance: string; // "0.5", "1", "2", ""
    // Optional: Stare pentru a stoca daca verificarea e in curs sau rezultatul
    isChecking?: boolean;
    found?: boolean | null; // null = not checked, true = found, false = not found
}

type ProximityPoiType =
    | "supermarket"
    | "pharmacy"
    | "busStop"
    | "tramStop"
    | "subwayStation"
    | "park";

interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: [string, string, string, string];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
}

interface TenantFacultyInfo {
    apartmentId: string; // ID-ul apartamentului la care se refera chiriasul
    faculty: string; // Numele facultatii chiriasului
    // Poti adauga si clientId daca e relevant pentru alte scopuri, dar nu e strict necesar doar pentru acest filtru
}
interface Filters {
    location: string;
    minPrice: string;
    maxPrice: string;
    numberOfRooms: string; // "" (any), "1", "2", "3", "4+"
    numberOfBathrooms: string; // "" (any), "1", "2+"
    minSurface: string;
    maxSurface: string;
    available: boolean;
    discounts: {
        discount1: boolean;
        discount2: boolean;
        discount3: boolean;
    };
    facilities: {
        wifi: boolean;
        parking: boolean;
        airConditioning: boolean;
        tvCable: boolean;
        laundryMachine: boolean;
        fullKitchen: boolean;
        balcony: boolean;
        petFriendly: boolean;
        pool: boolean;
        gym: boolean;
        elevator: boolean;
        terrace: boolean;
        bikeStorage: boolean;
        storageRoom: boolean;
        rooftop: boolean;
        fireAlarm: boolean;
        smokeDetector: boolean;
        intercom: boolean;
        videoSurveillance: boolean;
        soundproofing: boolean;
        underfloorHeating: boolean;
        furniture: boolean;
    };
    minConstructionYear: string;
    tenantFaculty: string;
    selectedUniversityId: string; // ID-ul universitatii selectate
    maxDistanceToUniversity: string; // Distanta in km (ex: "1", "3", "5", "" pentru oricare)
    proximityPois: Record<ProximityPoiType, ProximityPoiFilter>;

    // acceptsColleagues: boolean;
}

interface PoiOption {
    id: ProximityPoiType;
    label: string;
    overpassQueryTags: string[]; // Poate fi un array de tag-uri, ex: ["amenity=pharmacy", "dispensing=yes"]
    // Sau un singur tag: ["shop=supermarket"]
}

const poiOptions: PoiOption[] = [
    { id: "supermarket", label: "Supermarket", overpassQueryTags: ["shop=supermarket"] },
    { id: "pharmacy", label: "Farmacie", overpassQueryTags: ["amenity=pharmacy"] },
    { id: "busStop", label: "Statie Autobuz", overpassQueryTags: ["highway=bus_stop"] },
    { id: "tramStop", label: "Statie Tramvai", overpassQueryTags: ["railway=tram_stop"] },
    {
        id: "subwayStation",
        label: "Statie Metrou",
        overpassQueryTags: ["railway=station", "station=subway"],
    }, // Uneori necesita combinatii
    { id: "park", label: "Parc", overpassQueryTags: ["leisure=park"] },
];

type FacilityKey = keyof Filters["facilities"];
type DiscountKey = keyof Filters["discounts"];
const facilityOptions: { id: FacilityKey; label: string }[] = [
    { id: "parking", label: "Parcare inclusa" },
    { id: "videoSurveillance", label: "Supraveghere video" },
    { id: "wifi", label: "Wi-Fi" },
    { id: "airConditioning", label: "Aer Conditionat" },
    { id: "tvCable", label: "TV Cablu" },
    { id: "laundryMachine", label: "Masina de spalat rufe" },
    { id: "furniture", label: "Mobilat" },
    { id: "fullKitchen", label: "Bucatarie complet utilata" },
    { id: "fireAlarm", label: "Alarma de incendiu" },
    { id: "smokeDetector", label: "Detector de fum" },
    { id: "balcony", label: "Balcon" },
    { id: "terrace", label: "Terasa" },
    { id: "soundproofing", label: "Izolat fonic" },
    { id: "underfloorHeating", label: "Incalzire in pardoseala" },
    { id: "petFriendly", label: "Permite animale" },
    { id: "elevator", label: "Lift" },
    { id: "pool", label: "Piscina" },
    { id: "gym", label: "Sala de fitness" },
    { id: "bikeStorage", label: "Parcare biciclete" },
    { id: "storageRoom", label: "Camera depozitare" },
    { id: "rooftop", label: "Acces acoperis" },
    { id: "intercom", label: "Interfon" },
];
// --- END: Updated Filters Interface ---

const Home: React.FC = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const [allFaculties, setAllFaculties] = useState<Faculty[]>([]); // Stare pentru a stoca toate facultatile
    const [loadingFaculties, setLoadingFaculties] = useState<boolean>(false);
    const [activeTenantFaculties, setActiveTenantFaculties] = useState<TenantFacultyInfo[]>([]);
    const [loadingTenantData, setLoadingTenantData] = useState<boolean>(false); // Seteaza initial pe true

    const [sortCriteria, setSortCriteria] = useState<string>("date_desc"); // Default: cele mai noi
    const [searchParams, setSearchParams] = useSearchParams(); // Adaugam setSearchParams

    const [universitySearchCity, setUniversitySearchCity] = useState<string>("");
    const [foundUniversities, setFoundUniversities] = useState<University[]>([]); // University ar avea {id, name, lat, lng}
    const [loadingFoundUniversities, setLoadingFoundUniversities] = useState<boolean>(false);
    const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);

    const [isCheckingPois, setIsCheckingPois] = useState(false);
    // const locationParam = searchParams.get("location") || "";

    // const { isAuthenticated, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- START: Updated Initial Filters State ---
    const initialFilters: Filters = useMemo(() => {
        const baseFilters = {
            location: searchParams.get("location") || "",
            minPrice: searchParams.get("minPrice") || "",
            maxPrice: searchParams.get("maxPrice") || "",
            numberOfRooms: searchParams.get("numberOfRooms") || "",
            numberOfBathrooms: searchParams.get("numberOfBathrooms") || "",
            minSurface: searchParams.get("minSurface") || "",
            maxSurface: searchParams.get("maxSurface") || "",
            available: searchParams.get("available") === "true",
            discounts: {
                discount1: searchParams.get("d1") === "true",
                discount2: searchParams.get("d2") === "true",
                discount3: searchParams.get("d3") === "true",
            },
            facilities: facilityOptions.reduce((acc, opt) => {
                acc[opt.id] = searchParams.get(opt.id) === "true";
                return acc;
            }, {} as Filters["facilities"]),
            minConstructionYear: searchParams.get("minConstructionYear") || "",
            tenantFaculty: searchParams.get("tenantFaculty") || "",
            selectedUniversityId: searchParams.get("universityId") || "", // NOU
            maxDistanceToUniversity: searchParams.get("maxDistance") || "", // NOU
            proximityPois: {} as Record<ProximityPoiType, ProximityPoiFilter>,
        };
        // Initializam proximityPois
        poiOptions.forEach((poiOpt) => {
            baseFilters.proximityPois[poiOpt.id] = {
                enabled: searchParams.get(`${poiOpt.id}_enabled`) === "true",
                maxDistance: searchParams.get(`${poiOpt.id}_dist`) || "",
            };
        });
        return baseFilters;
    }, [searchParams]); // Recalculeaza doar daca searchParams se schimba
    // --- END: Updated Initial Filters State ---

    const [filters, setFilters] = useState<Filters>(initialFilters);

    // Sincronizeaza starea filters cu searchParams la schimbarea initialFilters (ex: navigare directa cu URL)
    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    // Functie pentru a actualiza URL-ul cu filtrele curente
    const updateURLWithFilters = (currentFilters: Filters, currentSortCriteria: string) => {
        const params = new URLSearchParams();
        if (currentFilters.location) params.set("location", currentFilters.location);
        if (currentFilters.minPrice) params.set("minPrice", currentFilters.minPrice);
        if (currentFilters.maxPrice) params.set("maxPrice", currentFilters.maxPrice);
        if (currentFilters.numberOfRooms) params.set("numberOfRooms", currentFilters.numberOfRooms);
        if (currentFilters.numberOfBathrooms)
            params.set("numberOfBathrooms", currentFilters.numberOfBathrooms);
        if (currentFilters.minSurface) params.set("minSurface", currentFilters.minSurface);
        if (currentFilters.maxSurface) params.set("maxSurface", currentFilters.maxSurface);
        if (currentFilters.minConstructionYear)
            params.set("minConstructionYear", currentFilters.minConstructionYear);
        if (currentFilters.tenantFaculty) params.set("tenantFaculty", currentFilters.tenantFaculty);
        if (currentFilters.discounts.discount1) params.set("d1", "true");
        if (currentFilters.discounts.discount2) params.set("d2", "true");
        if (currentFilters.discounts.discount3) params.set("d3", "true");

        facilityOptions.forEach((opt) => {
            if (currentFilters.facilities[opt.id]) {
                params.set(opt.id, "true");
            }
        });

        // Adaugam filtrele POI la URL
        poiOptions.forEach((poiOpt) => {
            const poiFilter = currentFilters.proximityPois[poiOpt.id];
            if (poiFilter.enabled) {
                params.set(`${poiOpt.id}_enabled`, "true");
                if (poiFilter.maxDistance) {
                    params.set(`${poiOpt.id}_dist`, poiFilter.maxDistance);
                }
            }
        });

        if (currentSortCriteria) params.set("sort", currentSortCriteria); // Adauga sortarea la URL
        // Adauga si alte filtre daca e necesar
        setSearchParams(params, { replace: true }); // replace: true pentru a nu umple istoricul browserului
    };

    // Stocare cache pentru rezultatele Overpass per apartament-POI-distanta
    // Cheia ar fi ceva de genul: `${apartmentId}-${poiType}-${distanceKm}`
    const poiCheckCache = useMemo(() => new Map<string, boolean>(), []);

    const checkPoiProximity = async (
        apartmentCoord: { lat: number; lng: number },
        poiType: ProximityPoiType,
        maxDistKm: number,
        apartmentId: string, // Pentru caching
    ): Promise<boolean> => {
        const cacheKey = `${apartmentId}-${poiType}-${maxDistKm}`;
        if (poiCheckCache.has(cacheKey)) {
            return poiCheckCache.get(cacheKey)!;
        }

        const poiOpt = poiOptions.find((p) => p.id === poiType);
        if (!poiOpt) return false;

        const radiusMeters = maxDistKm * 1000;
        let overpassQuery = `[out:json][timeout:10];(`;
        poiOpt.overpassQueryTags.forEach((tag) => {
            const [key, value] = tag.split("=");
            overpassQuery += `nwr["${key}"="${value}"](around:${radiusMeters},${apartmentCoord.lat},${apartmentCoord.lng});`;
        });
        overpassQuery += `);out count;`;

        try {
            const response = await fetch(
                `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
            );
            if (!response.ok) {
                console.error(`Overpass API error for ${poiType}: ${response.statusText}`);
                poiCheckCache.set(cacheKey, false); // Cache a failure as false to avoid retrying too quickly
                return false;
            }
            const data = await response.json();
            const count = parseInt(data.elements[0]?.tags?.total) || 0;
            const found = count > 0;
            poiCheckCache.set(cacheKey, found);
            return found;
        } catch (error) {
            console.error(`Error checking ${poiType} proximity:`, error);
            poiCheckCache.set(cacheKey, false);
            return false;
        }
    };

    const [selectedMapData, setSelectedMapData] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingFaculties(true);
            setLoadingTenantData(true);
            try {
                const [apartmentsResponse, facultiesResponse, tenantFacultiesResponse] =
                    await Promise.all([
                        api.get<Apartment[]>("/apartments"),
                        api.get<Faculty[]>("/faculty/"),
                        api.get<TenantFacultyInfo[]>(
                            "/apartments/rentals/active-tenant-faculties-summary",
                        ),
                    ]);

                const fetchedApartments = apartmentsResponse.data;
                setApartments(fetchedApartments);
                setAllFaculties(facultiesResponse.data);
                setActiveTenantFaculties(tenantFacultiesResponse.data);

                // Aplicam filtrele initiale (care pot veni din URL via initialFilters)
                applyFilters(fetchedApartments, filters); // Folosim starea 'filters' care e sincronizata cu URL-ul
            } catch (error) {
                console.error("Eroare la preluarea datelor initiale:", error);
                setApartments([]);
                setFilteredApartments([]);
                setAllFaculties([]);
                setActiveTenantFaculties([]);
            } finally {
                setLoadingFaculties(false);
                setLoadingTenantData(false);
            }
        };
        fetchData();
    }, [filters]);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingFaculties(true);
            setLoadingTenantData(true);
            try {
                const [apartmentsResponse, facultiesResponse, tenantFacultiesResponse] =
                    await Promise.all([
                        api.get<Apartment[]>("/apartments"),
                        api.get<Faculty[]>("/faculty/"),
                        api.get<TenantFacultyInfo[]>(
                            "/apartments/rentals/active-tenant-faculties-summary",
                        ), // Ruta corectata
                    ]);

                setApartments(apartmentsResponse.data);
                setAllFaculties(facultiesResponse.data);
                setActiveTenantFaculties(tenantFacultiesResponse.data);

                if (filters.selectedUniversityId && universitySearchCity) {
                    await handleSearchUniversitiesInCity(true); // true ca sa nu reseteze filtrele de universitate
                }
            } catch (error) {
                console.error("Eroare la preluarea datelor initiale:", error);
                // Gestioneaza erorile corespunzator
            } finally {
                setLoadingFaculties(false);
                setLoadingTenantData(false);
                setLoadingInitialData(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (apartments.length > 0) {
            // Aplica doar daca datele initiale s-au incarcat
            applyFilters(apartments, filters);
        } else if (apartments.length === 0) {
            setFilteredApartments([]); // Daca nu sunt apartamente, lista filtrata e goala
        }
    }, [apartments, filters, activeTenantFaculties]);

    // --- START: Updated Filter Application Logic ---
    // Renamed to applyFilters to be clearer
    const applyFilters = async (apartmentsToFilter: Apartment[], currentFilters: Filters) => {
        setIsCheckingPois(true);
        let filtered = [...apartmentsToFilter]; // Lucreaza pe o copie pentru a nu modifica originalul direct aici

        // 1. Filtru Locatie
        if (currentFilters.location.trim() !== "") {
            const searchTerm = currentFilters.location.toLowerCase();
            filtered = filtered.filter((apt) => apt.location.toLowerCase().includes(searchTerm));
        }

        // 2. Filtru Interval Pret
        const minPrice = parseFloat(currentFilters.minPrice);
        const maxPrice = parseFloat(currentFilters.maxPrice);
        if (!isNaN(minPrice) && minPrice >= 0) {
            filtered = filtered.filter((apt) => apt.price >= minPrice);
        }
        if (!isNaN(maxPrice) && maxPrice >= 0) {
            if (!isNaN(minPrice) && maxPrice < minPrice && currentFilters.minPrice.trim() !== "") {
                // Afiseaza o avertizare sau gestioneaza cazul in UI, dar nu aplica filtrul maxPrice gresit
                console.warn(
                    "Pretul maxim este mai mic decat pretul minim. Filtrul pentru pret maxim nu va fi aplicat.",
                );
            } else {
                filtered = filtered.filter((apt) => apt.price <= maxPrice);
            }
        }

        // 3. Filtru Numar Camere
        if (currentFilters.numberOfRooms && currentFilters.numberOfRooms !== "") {
            const aptRooms = (apt: Apartment) => Number(apt.numberOfRooms); // Functie helper pentru a converti la numar

            if (currentFilters.numberOfRooms.endsWith("+")) {
                const minRooms = parseInt(currentFilters.numberOfRooms.replace("+", ""), 10);
                if (!isNaN(minRooms)) {
                    filtered = filtered.filter((apt) => aptRooms(apt) >= minRooms);
                }
            } else {
                const exactRooms = parseInt(currentFilters.numberOfRooms, 10);
                if (!isNaN(exactRooms)) {
                    filtered = filtered.filter((apt) => aptRooms(apt) === exactRooms);
                }
            }
        }

        // 4. Filtru Numar Bai
        if (currentFilters.numberOfBathrooms && currentFilters.numberOfBathrooms !== "") {
            const aptBaths = (apt: Apartment) => Number(apt.numberOfBathrooms);

            if (currentFilters.numberOfBathrooms.endsWith("+")) {
                const minBaths = parseInt(currentFilters.numberOfBathrooms.replace("+", ""), 10);
                if (!isNaN(minBaths)) {
                    filtered = filtered.filter((apt) => aptBaths(apt) >= minBaths);
                }
            } else {
                const exactBaths = parseInt(currentFilters.numberOfBathrooms, 10);
                if (!isNaN(exactBaths)) {
                    filtered = filtered.filter((apt) => aptBaths(apt) === exactBaths);
                }
            }
        }

        // 5. Filtru Interval Suprafata
        const minSurface = parseFloat(currentFilters.minSurface);
        const maxSurface = parseFloat(currentFilters.maxSurface);
        if (!isNaN(minSurface) && minSurface >= 0) {
            filtered = filtered.filter((apt) => Number(apt.totalSurface) >= minSurface);
        }
        if (!isNaN(maxSurface) && maxSurface >= 0) {
            if (
                !isNaN(minSurface) &&
                maxSurface < minSurface &&
                currentFilters.minSurface.trim() !== ""
            ) {
                console.warn(
                    "Suprafata maxima este mai mica decat suprafata minima. Filtrul pentru suprafata maxima nu va fi aplicat.",
                );
            } else {
                filtered = filtered.filter((apt) => Number(apt.totalSurface) <= maxSurface);
            }
        }

        // 6. Filtru Disponibilitate (daca il vei folosi)
        // Momentan, currentFilters.available este un boolean, dar nu ai logica de filtrare pentru el.
        // Va trebui sa adaugi un camp `isAvailable` sau similar in `Apartment`
        // si sa filtrezi pe baza lui daca `currentFilters.available` este true.
        // Exemplu (necesita campul `isAvailable` in `Apartment`):
        // if (currentFilters.available) {
        //     filtered = filtered.filter((apt) => apt.isAvailable === true);
        // }

        // 7. Filtru Facilitati (dinamic)
        // Iteram peste toate optiunile de facilitati definite
        facilityOptions.forEach((facilityOption) => {
            if (currentFilters.facilities[facilityOption.id]) {
                filtered = filtered.filter(
                    (apt) => apt.facilities && apt.facilities[facilityOption.id] === true,
                );
            }
        });

        // 8. Filtru Discounturi
        if (currentFilters.discounts.discount1) {
            filtered = filtered.filter(
                (apt) =>
                    apt.discounts &&
                    typeof apt.discounts.discount1 === "number" &&
                    apt.discounts.discount1 > 0,
            );
        }
        if (currentFilters.discounts.discount2) {
            // Adauga si pentru celelalte daca ai checkbox-uri
            filtered = filtered.filter(
                (apt) =>
                    apt.discounts &&
                    typeof apt.discounts.discount2 === "number" &&
                    apt.discounts.discount2 > 0,
            );
        }
        if (currentFilters.discounts.discount3) {
            // Adauga si pentru celelalte
            filtered = filtered.filter(
                (apt) =>
                    apt.discounts &&
                    typeof apt.discounts.discount3 === "number" &&
                    apt.discounts.discount3 > 0,
            );
        }

        // 9. Filtru An Constructie
        const minYear = parseInt(currentFilters.minConstructionYear, 10);
        if (!isNaN(minYear) && minYear > 0) {
            // Verifica si > 0 pentru a evita anii negativi daca min e setat gresit
            filtered = filtered.filter((apt) => {
                const constructionYear = Number(apt.constructionYear); // Asigura-te ca apt.constructionYear e numar
                return !isNaN(constructionYear) && constructionYear >= minYear;
            });
        }

        // 10. Filtru Facultate Chiriasi
        if (currentFilters.tenantFaculty.trim() !== "") {
            const searchFacultyLower = currentFilters.tenantFaculty.toLowerCase();

            // Set de ID-uri ale apartamentelor care au cel putin un chirias de la facultatea cautata
            const apartmentsWithMatchingFacultyTenant = new Set<string>();
            activeTenantFaculties.forEach((tf) => {
                if (tf.faculty.toLowerCase() === searchFacultyLower) {
                    apartmentsWithMatchingFacultyTenant.add(tf.apartmentId);
                }
            });

            // Set de ID-uri ale apartamentelor care au *orice* chirias activ/viitor
            const apartmentsWithAnyActiveTenant = new Set<string>(
                activeTenantFaculties.map((tf) => tf.apartmentId),
            );

            if (loadingTenantData && apartmentsToFilter.length > 0) {
                // Verifica si apartmentsToFilter pentru a nu filtra prematur
                console.warn(
                    "Datele despre facultatile chiriasilor se incarca inca. Filtrul de facultate ar putea fi aplicat pe date incomplete.",
                );
            }

            filtered = filtered.filter((apt) => {
                // Conditia 1: Apartamentul are un chirias de la facultatea selectata
                const hasTenantFromSelectedFaculty = apartmentsWithMatchingFacultyTenant.has(
                    apt._id,
                );

                // Conditia 2: Apartamentul este complet liber (nu are niciun chirias activ/viitor)
                const isCompletelyVacant = !apartmentsWithAnyActiveTenant.has(apt._id);

                return hasTenantFromSelectedFaculty || isCompletelyVacant;
            });
        }

        // 11. FILTRU DISTANta FAta DE UNIVERSITATE (cu universitati dinamice)
        if (currentFilters.selectedUniversityId && currentFilters.maxDistanceToUniversity) {
            const selectedUni = foundUniversities.find(
                (uni) => uni._id === currentFilters.selectedUniversityId,
            );
            const maxDistM = parseFloat(currentFilters.maxDistanceToUniversity) * 1000; // distanta in metri

            if (
                selectedUni &&
                typeof selectedUni.latitude === "number" &&
                typeof selectedUni.longitude === "number" &&
                !isNaN(maxDistM) &&
                maxDistM > 0
            ) {
                filtered = filtered.filter((apt) => {
                    if (typeof apt.latitude === "number" && typeof apt.longitude === "number") {
                        const distance = calculateHaversineDistance(
                            selectedUni.latitude,
                            selectedUni.longitude,
                            apt.latitude,
                            apt.longitude,
                        );
                        return distance <= maxDistM;
                    }
                    return false;
                });
            }
        }

        // Filtre de proximitate POI
        const activePoiFilters = poiOptions.filter(
            (poiOpt) =>
                currentFilters.proximityPois[poiOpt.id]?.enabled &&
                currentFilters.proximityPois[poiOpt.id]?.maxDistance,
        );

        if (activePoiFilters.length > 0) {
            const promises = filtered.map(async (apt) => {
                if (typeof apt.latitude !== "number" || typeof apt.longitude !== "number") {
                    return false; // Exclude apartamente fara coordonate
                }

                const aptCoords = { lat: apt.latitude, lng: apt.longitude };
                let matchesAllPoi = true;

                for (const poiOpt of activePoiFilters) {
                    const poiFilterData = currentFilters.proximityPois[poiOpt.id];
                    const maxDistKm = parseFloat(poiFilterData.maxDistance);

                    if (isNaN(maxDistKm) || maxDistKm <= 0) continue; // Skip if distance is invalid

                    const found = await checkPoiProximity(aptCoords, poiOpt.id, maxDistKm, apt._id);
                    if (!found) {
                        matchesAllPoi = false;
                        break; // Daca un POI nu e gasit, apartamentul nu trece filtrul
                    }
                }
                return matchesAllPoi;
            });

            const results = await Promise.all(promises);
            filtered = filtered.filter((_, index) => results[index]);
        }
        setIsCheckingPois(false);

        setFilteredApartments(filtered);
    };

    const calculateHaversineDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ): number => {
        const R = 6371e3; // Raza Pamantului in metri
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distanta in metri
    };
    // Handler for explicit button click or Enter key
    const handleApplyFiltersAction = () => {
        updateURLWithFilters(filters, sortCriteria); // Actualizeaza URL-ul cu filtrele curente
        // applyFilters(apartments, filters);
    };

    // Function to update a specific filter value, supporting both top-level and facilities keys
    const handleFilterChange = (
        filterName:
            | keyof Omit<Filters, "facilities" | "discounts" | "proximityPois">
            | FacilityKey
            | DiscountKey
            | ProximityPoiType,
        value: string | boolean,
        subKey?: "enabled" | "maxDistance", // Pentru proximityPois
    ) => {
        setFilters((prevFilters) => {
            let newFilters = { ...prevFilters };

            const isFacilityKey = facilityOptions.some((opt) => opt.id === filterName);
            const isDiscountKey = ["discount1", "discount2", "discount3"].includes(
                filterName as string,
            );
            const isPoiKey = poiOptions.some((opt) => opt.id === filterName);

            // let newFilters;
            if (isFacilityKey) {
                newFilters = {
                    ...prevFilters,
                    facilities: {
                        ...prevFilters.facilities,
                        [filterName as FacilityKey]: value as boolean,
                    },
                };
            } else if (isDiscountKey) {
                newFilters = {
                    ...prevFilters,
                    discounts: {
                        ...prevFilters.discounts,
                        [filterName as DiscountKey]: value as boolean,
                    },
                };
            } else if (isPoiKey && subKey) {
                const poiType = filterName as ProximityPoiType;
                newFilters.proximityPois = {
                    ...prevFilters.proximityPois,
                    [poiType]: {
                        ...prevFilters.proximityPois[poiType],
                        [subKey]: value,
                        // Daca debifezi checkbox-ul, reseteaza si distanta
                        ...(subKey === "enabled" && value === false && { maxDistance: "" }),
                    },
                };
            } else {
                newFilters = {
                    ...prevFilters,
                    [filterName as keyof Omit<Filters, "facilities" | "discounts">]: value,
                };
            }

            // Daca se schimba selectedUniversityId, reseteaza maxDistanceToUniversity
            if (filterName === "selectedUniversityId" && value === "") {
                // Daca se deselecteaza universitatea
                newFilters.maxDistanceToUniversity = "";
            }
            // Daca se schimba orasul de cautare pentru universitati (universitySearchCity),
            // reseteaza universitatile gasite si filtrele asociate.
            if (filterName === "location" && prevFilters.location !== value) {
                // Presupunand ca 'location' e si orasul de cautare pt uni
                // setUniversitySearchCity(value as string); // Daca vrei sa legi direct
                setFoundUniversities([]);
                newFilters.selectedUniversityId = "";
                newFilters.maxDistanceToUniversity = "";
            }

            return newFilters;
        });
    };

    // Reset Filters Function
    // const handleResetFilters = () => {

    //     setFilters(initialFilters); // Resetam la valorile default absolute
    //     setSearchParams({}, { replace: true }); // Curatam URL-ul
    // };
    const handleResetFilters = () => {
        const defaultInitialFilters: Filters = {
            // Filtrele default absolute
            location: "",
            minPrice: "",
            maxPrice: "",
            numberOfRooms: "",
            numberOfBathrooms: "",
            minSurface: "",
            maxSurface: "",
            available: false,
            discounts: { discount1: false, discount2: false, discount3: false },
            facilities: facilityOptions.reduce((acc, opt) => {
                acc[opt.id] = false;
                return acc;
            }, {} as Filters["facilities"]),
            minConstructionYear: "",
            tenantFaculty: "",
            selectedUniversityId: "",
            maxDistanceToUniversity: "",
            proximityPois: poiOptions.reduce((acc, poiOpt) => {
                acc[poiOpt.id] = { enabled: false, maxDistance: "" };
                return acc;
            }, {} as Record<ProximityPoiType, ProximityPoiFilter>),
        };
        setFilters(defaultInitialFilters);
        setUniversitySearchCity(""); // Reseteaza si orasul de cautare
        setFoundUniversities([]); // Reseteaza universitatile gasite
        setSortCriteria("date_desc"); // Reseteaza si sortarea
        setSearchParams({}, { replace: true });
        poiCheckCache.clear();
    };

    const handleMoreDetails = (id: string) => {
        navigate(`/apartment/${id}`);
    };

    // --- Logica pentru Sortare ---
    const sortedAndFilteredApartments = useMemo(() => {
        let sortableArray = [...filteredApartments];

        const getDiscountedPrice = (
            apt: Apartment,
            discountField: keyof Apartment["discounts"],
        ): number => {
            if (
                apt.discounts &&
                typeof apt.discounts[discountField] === "number" &&
                apt.discounts[discountField] > 0
            ) {
                return apt.price * (1 - apt.discounts[discountField] / 100);
            }
            return apt.price; // Sau un numar foarte mare daca vrei ca cele fara discount sa fie la sfarsit
        };

        // Functie pentru a determina daca un apartament este disponibil ACUM
        // Aceasta este o simplificare. intr-o aplicatie reala, ai verifica chiriile active.
        const isApartmentAvailableNow = (apt: Apartment): boolean => {
            // Placeholder: Trebuie sa implementezi logica reala aici
            // De ex., verifici `activeTenantFaculties` sau un camp `apt.currentBookings`
            const hasActiveBooking = activeTenantFaculties.some((tf) => tf.apartmentId === apt._id); // Simplificare grosolana
            return !hasActiveBooking;
        };

        switch (sortCriteria) {
            case "price_asc":
                sortableArray.sort((a, b) => a.price - b.price);
                break;
            case "price_desc":
                sortableArray.sort((a, b) => b.price - a.price);
                break;
            case "d1_asc": // Pret cu discount categoria 1 (crescator)
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(a, "discount1") - getDiscountedPrice(b, "discount1"),
                );
                break;
            case "d1_desc":
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(b, "discount1") - getDiscountedPrice(a, "discount1"),
                );
                break;
            case "d2_asc":
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(a, "discount2") - getDiscountedPrice(b, "discount2"),
                );
                break;
            case "d2_desc":
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(b, "discount2") - getDiscountedPrice(a, "discount2"),
                );
                break;
            case "d3_asc":
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(a, "discount3") - getDiscountedPrice(b, "discount3"),
                );
                break;
            case "d3_desc":
                sortableArray.sort(
                    (a, b) =>
                        getDiscountedPrice(b, "discount3") - getDiscountedPrice(a, "discount3"),
                );
                break;
            case "construction_desc": // Cele mai noi cladiri primele
                sortableArray.sort(
                    (a, b) => Number(b.constructionYear) - Number(a.constructionYear),
                );
                break;
            case "construction_asc": // Cele mai vechi cladiri primele
                sortableArray.sort(
                    (a, b) => Number(a.constructionYear) - Number(b.constructionYear),
                );
                break;
            case "surface_asc":
                sortableArray.sort((a, b) => Number(a.totalSurface) - Number(b.totalSurface));
                break;
            case "surface_desc":
                sortableArray.sort((a, b) => Number(b.totalSurface) - Number(a.totalSurface));
                break;
            case "rooms_asc":
                sortableArray.sort((a, b) => Number(a.numberOfRooms) - Number(b.numberOfRooms));
                break;
            case "rooms_desc":
                sortableArray.sort((a, b) => Number(b.numberOfRooms) - Number(a.numberOfRooms));
                break;
            case "availability": // Apartamentele disponibile primele
                sortableArray.sort((a, b) => {
                    const availableA = isApartmentAvailableNow(a);
                    const availableB = isApartmentAvailableNow(b);
                    if (availableA && !availableB) return -1; // A vine inaintea lui B
                    if (!availableA && availableB) return 1; // B vine inaintea lui A
                    return 0; // Ordinea nu se schimba daca ambele sunt la fel
                });
                break;
            case "date_desc": // Cele mai noi adaugate (presupunand createdAt)
            default:
                sortableArray.sort(
                    (a, b) =>
                        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
                );
                break;
        }
        return sortableArray;
    }, [filteredApartments, sortCriteria, activeTenantFaculties]); // Adaugam activeTenantFaculties pentru sortarea dupa disponibilitate

    const handleSearchUniversitiesInCity = async (calledFromInitialLoad = false) => {
        const cityToSearch =
            universitySearchCity || (calledFromInitialLoad ? filters.location : "");
        if (!cityToSearch.trim() && !calledFromInitialLoad) {
            alert("Va rugam introduceti un oras sau o zona pentru cautarea universitatilor.");
            return;
        }
        if (!cityToSearch.trim() && calledFromInitialLoad && !filters.location) {
            return;
        }

        setLoadingFoundUniversities(true);
        if (!calledFromInitialLoad) {
            // Nu reseta daca e apelat la incarcarea initiala cu un ID deja in URL
            setFoundUniversities([]);
            setFilters((prev) => ({
                ...prev,
                selectedUniversityId: "",
                maxDistanceToUniversity: "",
            }));
        }

        try {
            const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityToSearch)}&format=json&addressdetails=1&limit=1&accept-language=ro`,
            );
            if (!nominatimResponse.ok)
                throw new Error(`Eroare Nominatim: ${nominatimResponse.statusText}`);
            const nominatimData: NominatimResult[] = await nominatimResponse.json();

            if (nominatimData.length === 0) {
                if (!calledFromInitialLoad) alert(`Nu s-a putut gasi locatia: ${cityToSearch}`);
                else
                    console.warn(`Nu s-a putut geocodifica locatia initiala pentru universitati: ${cityToSearch}`);
                setLoadingFoundUniversities(false);
                return;
            }
            const locationData = nominatimData[0];
            let searchAreaQueryPart: string;
            if (locationData.boundingbox) { // in cazul in care datele despre oras contin limitele acestuia
                const [s, n, w, e] = locationData.boundingbox.map(parseFloat);
                searchAreaQueryPart = `(${s},${w},${n},${e})`;
            } else {
                // in caz contrar, cautam pe o raza de 15km fata de centrul orasului
                const cityLat = parseFloat(locationData.lat);
                const cityLng = parseFloat(locationData.lon);
                const searchRadiusForCity = 15000; // 15km
                searchAreaQueryPart = `(around:${searchRadiusForCity},${cityLat},${cityLng})`;
            }
            const overpassQuery = `[out:json][timeout:25];(nwr[amenity=university]${searchAreaQueryPart};);out center;`;
            const overpassResponse = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
            if (!overpassResponse.ok)
                throw new Error(`Eroare Overpass API: ${overpassResponse.statusText}`);
            const overpassData = await overpassResponse.json();
            const universities = overpassData.elements.map((el: any) => {
                const name = el.tags?.name || el.tags?.["name:ro"] || el.tags?.official_name || `Universitate (ID OSM: ${el.id})`;
                let latVal, lngVal;
                if (el.type === "node") {
                    latVal = el.lat;
                    lngVal = el.lon;
                } else if (el.center) {
                    latVal = el.center.lat;
                    lngVal = el.center.lon;
                } else {
                    return null;
                }
                if (typeof latVal !== "number" || typeof lngVal !== "number") return null;
                return { _id: String(el.id), name, latitude: latVal, longitude: lngVal };
            }).filter(Boolean) as University[];
            const uniqueUniversities = Array.from(
                new Map(universities.map((uni) => [uni.name, uni])).values(),
            );
            setFoundUniversities(uniqueUniversities.sort((a, b) => a.name.localeCompare(b.name)));
            if (!calledFromInitialLoad && uniqueUniversities.length === 0) {
                alert(`Nicio universitate gasita pentru "${cityToSearch}".`);
            }
        } catch (error) {
            console.error("Eroare la cautarea universitatilor:", error);
            if (!calledFromInitialLoad)
                alert(`A aparut o eroare: ${error instanceof Error ? error.message : "Eroare"}`);
            setFoundUniversities([]);
        } finally {
            setLoadingFoundUniversities(false);
        }
    };

    if (loadingInitialData && apartments.length === 0) {
        // Arata loading doar la incarcarea initiala majora
        return (
            <div className="loading-error-container">
                <p>Se incarca datele...</p>
            </div>
        );
    }

    // Render component (existing code structure)
    return (
        <div>
            {/* Keep h1 commented out if desired */}
            <div className="home-container">
                {" "}
                {/* Keep your container */}
                {/* === START: Enhanced Filters Sidebar JSX === */}
                <aside className="filters-sidebar">
                    {" "}
                    <div className="filters-header">
                        <div className="sort-options-sidebar">
                            {" "}
                            {/* Adauga o clasa specifica daca vrei stilizare diferita in sidebar */}
                            <h2>
                                {" "}
                                {/* Poti adauga un titlu si aici daca doresti */}
                                <i className="fas fa-sort-amount-down"></i> Sorteaza Rezultatele
                            </h2>
                            <div className="filter-group">
                                {" "}
                                {/* Poti refolosi clasa .filter-group pentru consistenta vizuala */}
                                <hr />
                                {/* <hr className="line-divider short" /> */}
                                <label htmlFor="sort-criteria-sidebar">Dupa: </label>
                                <select
                                    id="sort-criteria-sidebar"
                                    value={sortCriteria}
                                    onChange={(e) => setSortCriteria(e.target.value)}
                                >
                                    <option value="date_desc">Cele mai noi</option>
                                    <option value="price_asc">Pret (crescator)</option>
                                    <option value="price_desc">Pret (descrescator)</option>
                                    <option value="d1_asc">Pret Discount Cat. 1 (cresc.)</option>
                                    <option value="d1_desc">Pret Discount Cat. 1 (desc.)</option>
                                    <option value="d2_asc">Pret Discount Cat. 2 (cresc.)</option>
                                    <option value="d2_desc">Pret Discount Cat. 2 (desc.)</option>
                                    <option value="d3_asc">Pret Discount Cat. 3 (cresc.)</option>
                                    <option value="d3_desc">Pret Discount Cat. 3 (desc.)</option>
                                    <option value="construction_desc">
                                        An constructie (noi-vechi)
                                    </option>
                                    <option value="construction_asc">
                                        An constructie (vechi-noi)
                                    </option>
                                    <option value="surface_desc">Suprafata (mare-mica)</option>
                                    <option value="surface_asc">Suprafata (mica-mare)</option>
                                    <option value="rooms_desc">Nr. Camere (multe-putine)</option>
                                    <option value="rooms_asc">Nr. Camere (putine-multe)</option>
                                    <option value="availability">
                                        Disponibilitate (libere primele)
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="filters-header">
                        {" "}
                        <h2>
                            <i className="fas fa-filter"></i> Filtreaza Oferte
                        </h2>
                        <button
                            onClick={handleResetFilters}
                            className="reset-button"
                            title="Reseteaza filtrele"
                        >
                            <i className="fas fa-undo"></i> Reset
                        </button>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="uni-search-city">Cauta Universitati in Oras:</label>
                        <input
                            type="text"
                            id="uni-search-city"
                            value={universitySearchCity}
                            onChange={(e) => setUniversitySearchCity(e.target.value)}
                            placeholder="ex: Timisoara"
                        />
                        <button
                            onClick={() => handleSearchUniversitiesInCity()}
                            disabled={loadingFoundUniversities || !universitySearchCity}
                            style={{ marginTop: "5px" }}
                        >
                            {loadingFoundUniversities ? "Se cauta..." : "Cauta Univ."}
                        </button>
                    </div>

                    {(foundUniversities.length > 0 || filters.selectedUniversityId) && (
                        <div className="filter-group">
                            <label htmlFor="filter-university">
                                <i className="fas fa-school"></i> Proximitate Universitate:
                            </label>
                            <select
                                id="filter-university"
                                value={filters.selectedUniversityId}
                                onChange={(e) =>
                                    handleFilterChange("selectedUniversityId", e.target.value)
                                }
                                disabled={loadingFoundUniversities && foundUniversities.length === 0}
                            >
                                <option value="">Selecteaza o universitate</option>
                                {loadingFoundUniversities && foundUniversities.length === 0 ? (
                                    <option disabled>Se incarca...</option>
                                ) : (
                                    foundUniversities.map((uni) => (
                                        <option key={uni._id} value={uni._id}>
                                            {uni.name}
                                        </option>
                                    ))
                                )}
                            </select>

                            {filters.selectedUniversityId && (
                                <div className="sub-filter" style={{ marginTop: "10px" }}>
                                    <label htmlFor="filter-max-distance">
                                        Distanta maxima (km):
                                    </label>
                                    <select
                                        id="filter-max-distance"
                                        value={filters.maxDistanceToUniversity}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                "maxDistanceToUniversity",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Oricat</option>
                                        <option value="0.5">Sub 0.5 km</option>
                                        <option value="1">Sub 1 km</option>
                                        <option value="2">Sub 2 km</option>
                                        <option value="5">Sub 5 km</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="filters-header">
                        <h2>
                            <i className="fas fa-map-signs"></i> Puncte de Interes in Proximitate
                        </h2>
                    </div>
                    {poiOptions.map((poiOpt) => (
                        <div className="filter-group poi-filter-group" key={poiOpt.id}>
                            <label className="poi-checkbox-label">
                                <input
                                    type="checkbox"
                                    id={`filter-poi-${poiOpt.id}-enabled`}
                                    checked={filters.proximityPois[poiOpt.id]?.enabled || false}
                                    onChange={(e) =>
                                        handleFilterChange(poiOpt.id, e.target.checked, "enabled")
                                    }
                                />{" "}
                                {poiOpt.label}
                            </label>
                            {filters.proximityPois[poiOpt.id]?.enabled && (
                                <div
                                    className="sub-filter"
                                    style={{ marginTop: "5px", marginLeft: "20px" }}
                                >
                                    <label
                                        htmlFor={`filter-poi-${poiOpt.id}-distance`}
                                        style={{ marginRight: "5px" }}
                                    >
                                        Distanta max.:
                                    </label>
                                    <select
                                        id={`filter-poi-${poiOpt.id}-distance`}
                                        value={filters.proximityPois[poiOpt.id]?.maxDistance || ""}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                poiOpt.id,
                                                e.target.value,
                                                "maxDistance",
                                            )
                                        }
                                    >
                                        <option value="">Oricat</option>
                                        <option value="0.5">Sub 0.5 km</option>
                                        <option value="1">Sub 1 km</option>
                                        <option value="2">Sub 2 km</option>
                                        {/* Poti adauga si alte optiuni */}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={handleApplyFiltersAction}
                        className="refresh-button"
                        disabled={isCheckingPois}
                    >
                        {isCheckingPois
                            ? "Se verifica POI..."
                            : "Aplica Filtrele pentru punctele de interes"}
                    </button>
                    {/* Location Filter */}
                    <div className="filter-group">
                        <label htmlFor="filter-location">
                            <i className="fas fa-map-marker-alt"></i> Locatie:
                        </label>
                        <input
                            type="text"
                            id="filter-location"
                            placeholder="Oras, zona..."
                            value={filters.location}
                            onChange={(e) => handleFilterChange("location", e.target.value)}
                            onKeyDown={(e) => {
                                // Keep your Enter key functionality
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleApplyFiltersAction(); // Call the apply function
                                }
                            }}
                        />
                    </div>
                    {/* Price Range Filter */}
                    <div className="filter-group">
                        <label>
                            <i className="fas fa-dollar-sign"></i> Pret (RON/camera/noapte):
                        </label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                id="filter-min-price"
                                placeholder="Min RON"
                                min="0"
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                id="filter-max-price"
                                placeholder="Max RON"
                                min="0"
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                            />
                        </div>
                        <div className="filter-group check-group">
                            <label style={{ marginTop: "10px", display: "block" }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat1"
                                    checked={filters.discounts.discount1}
                                    onChange={(e) =>
                                        handleFilterChange("discount1", e.target.checked)
                                    }
                                />
                                Ofera discount pentru medie categoria 1
                            </label>
                            <label style={{ marginTop: "10px", display: "block" }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat2"
                                    checked={filters.discounts.discount2}
                                    onChange={(e) =>
                                        handleFilterChange("discount2", e.target.checked)
                                    }
                                />
                                Ofera discount pentru medie categoria 2
                            </label>
                            <label style={{ marginTop: "10px", display: "block" }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat3"
                                    checked={filters.discounts.discount3}
                                    onChange={(e) =>
                                        handleFilterChange("discount3", e.target.checked)
                                    }
                                />
                                Ofera discount pentru medie categoria 3
                            </label>
                        </div>
                    </div>
                    {/* Faculty Filter */}
                    <div className="filter-group">
                        <label htmlFor="filter-tenant-faculty">
                            <i className="fas fa-graduation-cap"></i> Facultate Chiriasi Act.:
                        </label>
                        <select
                            id="filter-tenant-faculty"
                            value={filters.tenantFaculty} // Valoarea selectata
                            onChange={(e) => handleFilterChange("tenantFaculty", e.target.value)}
                            disabled={loadingFaculties} // Dezactiveaza cat timp se incarca facultatile
                        >
                            <option value="">Toate facultatile</option>{" "}
                            {/* Optiune pentru a nu filtra */}
                            {loadingFaculties ? (
                                <option disabled>Se incarca facultatile...</option>
                            ) : (
                                allFaculties.map((faculty) => (
                                    // Folosim fullName ca valoare si ca text afisat.
                                    // Daca ai un ID si vrei sa-l folosesti, seteaza value={faculty._id}
                                    <option
                                        key={faculty._id || faculty.fullName}
                                        value={faculty.fullName}
                                    >
                                        {faculty.fullName}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    {/* Apartment Specs Group */}
                    <div className="filter-group spec-group">
                        <h4>
                            <i className="fas fa-ruler-combined"></i> Specificatii Apartament
                        </h4>
                        <div className="sub-filter">
                            <label htmlFor="filter-rooms">Camere:</label>
                            <select
                                id="filter-rooms"
                                value={filters.numberOfRooms}
                                onChange={(e) =>
                                    handleFilterChange("numberOfRooms", e.target.value)
                                }
                            >
                                <option value="">Oricate</option>
                                <option value="1">1 (Garsoniera)</option>
                                <option value="2">2 Camere</option>
                                <option value="3">3 Camere</option>
                                <option value="4">4 Camere</option>
                                <option value="5+">5+ Camere</option>
                            </select>
                        </div>
                        <div className="sub-filter">
                            <label htmlFor="filter-bathrooms">Bai:</label>
                            <select
                                id="filter-bathrooms"
                                value={filters.numberOfBathrooms}
                                onChange={(e) =>
                                    handleFilterChange("numberOfBathrooms", e.target.value)
                                }
                            >
                                <option value="">Oricate</option>
                                <option value="1">1 Baie</option>
                                <option value="2">2 Bai</option>
                                <option value="3+">3+ Bai</option>
                            </select>
                        </div>
                        <div className="sub-filter surface-range">
                            <label>Suprafata (mp):</label>
                            <div className="surface-inputs">
                                <input
                                    type="number"
                                    id="filter-min-surface"
                                    placeholder="Min"
                                    min="0"
                                    value={filters.minSurface}
                                    onChange={(e) =>
                                        handleFilterChange("minSurface", e.target.value)
                                    }
                                />
                                <span>-</span>
                                <input
                                    type="number"
                                    id="filter-max-surface"
                                    placeholder="Max"
                                    min="0"
                                    value={filters.maxSurface}
                                    onChange={(e) =>
                                        handleFilterChange("maxSurface", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="sub-filter construction-year-range">
                            <label>An Constructie:</label>
                            <div className="year-inputs">
                                {" "}
                                {/* Poti folosi o clasa similara cu price-inputs/surface-inputs */}
                                <input
                                    type="number"
                                    id="filter-min-construction-year"
                                    placeholder="Min An"
                                    min="1800" // Un an minim rezonabil
                                    max={new Date().getFullYear()} // Anul curent ca maxim
                                    value={filters.minConstructionYear}
                                    onChange={(e) =>
                                        handleFilterChange("minConstructionYear", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    {/* Facilities Group - generat dinamic */}
                    <div className="filter-group check-group">
                        <h4>
                            <i className="fas fa-check"></i> Facilitati
                        </h4>
                        {facilityOptions.map((facility) => (
                            <label key={facility.id}>
                                <input
                                    type="checkbox"
                                    // Acceseaza valoarea checked din filters.facilities folosind id-ul facilitatii
                                    checked={filters.facilities[facility.id]}
                                    // La schimbare, paseaza id-ul facilitatii si noua valoare booleana
                                    onChange={(e) =>
                                        handleFilterChange(facility.id, e.target.checked)
                                    }
                                />
                                {facility.label} {/* Afiseaza eticheta prietenoasa */}
                            </label>
                        ))}
                    </div>
                    {/* Keep your original button, but have it call the apply function */}
                    <button onClick={handleApplyFiltersAction} className="refresh-button">
                        Aplica Filtrele {/* Changed text slightly */}
                    </button>
                </aside>
                {/* Apartments List Section (existing structure) */}
                <section className="apartments-list">
                    {isCheckingPois && (
                        <div className="loading-inline">
                            <p>Se verifica proximitatea punctelor de interes...</p>
                        </div>
                    )}
                    {sortedAndFilteredApartments.length > 0 ? (
                        sortedAndFilteredApartments.map((apartment) => {
                            const imageUrl =
                                apartment.images?.[0] ?? "/Poze_apartamente/placeholder.png";
                            return (
                                <div key={apartment._id} className="apartment">
                                    <img
                                        src={imageUrl}
                                        alt={`Apartament in ${apartment.location}`}
                                        width="300"
                                    />
                                    <p style={{ marginTop: "15px" }}>
                                        <i
                                            className="fa-solid fa-location-dot"
                                            style={{ marginRight: "9px" }}
                                        ></i>
                                        <strong>: </strong>
                                        {apartment.location}
                                    </p>
                                    <p>
                                        <i
                                            className="fa-solid fa-house-user"
                                            style={{ marginRight: "4px" }}
                                        ></i>
                                        <strong>: </strong>
                                        {apartment.numberOfRooms}
                                        {apartment.numberOfRooms === 1 ? " camera" : " camere"}
                                    </p>
                                    <p>
                                        <strong>Pret :</strong> {apartment.price} RON / noapte
                                    </p>
                                    <button
                                        className="button-details-apartment"
                                        onClick={() => handleMoreDetails(apartment._id)}
                                    >
                                        <span className="details-btn-text">Mai multe detalii</span>
                                        <span className="details-btn-icon">
                                            <img
                                                src="/Poze_apartamente/search.png"
                                                alt="Detalii Icon"
                                            />
                                        </span>
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p>Nu s-au gasit apartamente care sa corespunda filtrelor selectate.</p>
                    )}
                </section>
            </div>

            {/* Modals (existing code) */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            {selectedMapData && (
                <MapModal
                    lat={selectedMapData.lat}
                    lng={selectedMapData.lng}
                    address={selectedMapData.address}
                    onClose={() => setSelectedMapData(null)}
                />
            )}
        </div>
    );
};

export default Home;
