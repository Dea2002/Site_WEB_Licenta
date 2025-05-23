import React, { useState, useEffect } from "react";
import { api } from './api';
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginModal from "./LoginModal";
import { Apartment } from "./types"; // Make sure Apartment type includes all relevant fields
import "./style.css"; // Your existing CSS for Home
import MapModal from "./MapModal"; // Assuming this is used elsewhere or for future use
import { Faculty } from "./AuthContext";
// --- START: Updated Filters Interface ---

interface TenantFacultyInfo {
    apartmentId: string; // ID-ul apartamentului la care se referă chiriașul
    faculty: string;     // Numele facultății chiriașului
    // Poți adăuga și clientId dacă e relevant pentru alte scopuri, dar nu e strict necesar doar pentru acest filtru
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
    },
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
    };
    minConstructionYear: string;
    tenantFaculty: string;
    // acceptsColleagues: boolean;
}
type FacilityKey = keyof Filters['facilities'];
type DiscountKey = keyof Filters['discounts'];
const facilityOptions: { id: FacilityKey; label: string }[] = [
    { id: 'parking', label: 'Parcare inclusa' },
    { id: 'videoSurveillance', label: 'Supraveghere video' },
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'airConditioning', label: 'Aer Conditionat' },
    { id: 'tvCable', label: 'TV Cablu' },
    { id: 'laundryMachine', label: 'Masina de spalat rufe' },
    { id: 'fullKitchen', label: 'Bucatarie complet utilata' },
    { id: 'fireAlarm', label: 'Alarma de incendiu' },
    { id: 'smokeDetector', label: 'Detector de fum' },
    { id: 'balcony', label: 'Balcon' },
    { id: 'terrace', label: 'Terasa' },
    { id: 'soundproofing', label: 'Izolat fonic' },
    { id: 'underfloorHeating', label: 'Incalzire in pardoseala' },
    { id: 'petFriendly', label: 'Permite animale' },
    { id: 'elevator', label: 'Lift' },
    { id: 'pool', label: 'Piscina' },
    { id: 'gym', label: 'Sala de fitness' },
    { id: 'bikeStorage', label: 'Parcare biciclete' },
    { id: 'storageRoom', label: 'Camera depozitare' },
    { id: 'rooftop', label: 'Acces acoperis' },
    { id: 'intercom', label: 'Interfon' }
];
// --- END: Updated Filters Interface ---

const Home: React.FC = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const [allFaculties, setAllFaculties] = useState<Faculty[]>([]); // Stare pentru a stoca toate facultățile
    const [loadingFaculties, setLoadingFaculties] = useState<boolean>(false);
    const [activeTenantFaculties, setActiveTenantFaculties] = useState<TenantFacultyInfo[]>([]);
    const [loadingTenantData, setLoadingTenantData] = useState<boolean>(true); // Setează inițial pe true

    // const { isAuthenticated, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const locationParam = searchParams.get("location") || "";

    // --- START: Updated Initial Filters State ---
    const initialFilters: Filters = {
        // Define initial state separately for resetting
        location: locationParam,
        minPrice: "",
        maxPrice: "",
        numberOfRooms: "",
        numberOfBathrooms: "",
        minSurface: "",
        maxSurface: "",
        available: false, // Default to showing all initially
        discounts: {
            discount1: false,
            discount2: false,
            discount3: false,
        },
        facilities: {
            wifi: false,
            parking: false,
            airConditioning: false,
            tvCable: false,
            laundryMachine: false,
            fullKitchen: false,
            balcony: false,
            petFriendly: false,
            pool: false,
            gym: false,
            elevator: false,
            terrace: false,
            bikeStorage: false,
            storageRoom: false,
            rooftop: false,
            fireAlarm: false,
            smokeDetector: false,
            intercom: false,
            videoSurveillance: false,
            soundproofing: false,
            underfloorHeating: false,
        },
        minConstructionYear: "",
        tenantFaculty: "",
        // acceptsColleagues: false,
    };
    // --- END: Updated Initial Filters State ---

    const [filters, setFilters] = useState<Filters>(initialFilters);

    const [selectedMapData, setSelectedMapData] = useState<{
        lat: number;
        lng: number;
        address: string;
    } | null>(null);

    // Fetch apartments (existing code)
    useEffect(() => {
        api
            .get<Apartment[]>("/apartments")
            .then((response) => {
                setApartments(response.data);
                console.log("Apartamente preluate:", response.data);
                // Apply initial filter from URL param if present
                if (locationParam.trim() !== "") {
                    applyFilters(response.data, { ...filters, location: locationParam });
                } else {
                    setFilteredApartments(response.data);
                }
            })
            .catch((error) => {
                console.error("Eroare la preluarea datelor:", error);
            });

        setLoadingFaculties(true);
        api.get<Faculty[]>("/faculty/")
            .then(response => {
                setAllFaculties(response.data);
            })
            .catch(error => {
                console.error("Eroare la preluarea listei de facultăți:", error);
                setAllFaculties([]);
            })
            .finally(() => {
                setLoadingFaculties(false);
            });

        // Fetch pentru datele despre facultățile chiriașilor activi
        setLoadingTenantData(true);
        api.get<TenantFacultyInfo[]>("/apartments/rentals/active-tenant-faculties-summary") // Endpoint ipotetic, vezi mai jos
            .then(response => {
                setActiveTenantFaculties(response.data);
                console.log("Facultăți chiriași activi:", response.data);
                // După ce avem și aceste date, am putea re-aplica filtrele dacă e necesar
                // și dacă un filtru de facultate era deja activ (ex: din URL)
                // Dar, de obicei, utilizatorul aplică filtrele după ce pagina s-a încărcat.
            })
            .catch(error => {
                console.error("Eroare la preluarea facultăților chiriașilor:", error);
                setActiveTenantFaculties([]);
            })
            .finally(() => {
                setLoadingTenantData(false);
            });
    }, [locationParam]); // Run only once on mount

    useEffect(() => {
        api
            .get<Apartment[]>("/apartments")
            .then((response) => {
                setApartments(response.data);
                // Apply initial location filter IF locationParam exists
                if (locationParam.trim() !== "") {
                    applyFilters(response.data, { ...initialFilters, location: locationParam });
                } else {
                    setFilteredApartments(response.data); // Otherwise, show all initially
                }
            })
            .catch((error) => {
                console.error("Eroare la preluarea datelor:", error);
            });
    }, []); // Runs once

    // --- START: Updated Filter Application Logic ---
    // Renamed to applyFilters to be clearer
    const applyFilters = (apartmentsToFilter: Apartment[], currentFilters: Filters) => {
        let filtered = [...apartmentsToFilter]; // Lucreaza pe o copie pentru a nu modifica originalul direct aici

        // 1. Filtru Locatie
        if (currentFilters.location.trim() !== "") {
            const searchTerm = currentFilters.location.toLowerCase();
            filtered = filtered.filter((apt) =>
                apt.location.toLowerCase().includes(searchTerm)
            );
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
                console.warn("Pretul maxim este mai mic decat pretul minim. Filtrul pentru pret maxim nu va fi aplicat.");
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
            if (!isNaN(minSurface) && maxSurface < minSurface && currentFilters.minSurface.trim() !== "") {
                console.warn("Suprafata maxima este mai mica decat suprafata minima. Filtrul pentru suprafata maxima nu va fi aplicat.");
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
        facilityOptions.forEach(facilityOption => {
            // Verificam daca aceasta facilitate este selectata in filtrele curente
            if (currentFilters.facilities[facilityOption.id]) {
                // Filtram apartamentele care au aceasta facilitate setata pe true
                // Asigura-te ca apt.facilities exista inainte de a accesa proprietatile
                filtered = filtered.filter(apt => apt.facilities && apt.facilities[facilityOption.id] === true);
            }
        });

        // 8. Filtru Discounturi
        if (currentFilters.discounts.discount1) {
            filtered = filtered.filter(apt =>
                apt.discounts && typeof apt.discounts.discount1 === 'number' && apt.discounts.discount1 > 0
            );
        }
        if (currentFilters.discounts.discount2) { // Adaugă și pentru celelalte dacă ai checkbox-uri
            filtered = filtered.filter(apt =>
                apt.discounts && typeof apt.discounts.discount2 === 'number' && apt.discounts.discount2 > 0
            );
        }
        if (currentFilters.discounts.discount3) { // Adaugă și pentru celelalte
            filtered = filtered.filter(apt =>
                apt.discounts && typeof apt.discounts.discount3 === 'number' && apt.discounts.discount3 > 0
            );
        }

        // 9. Filtru An Constructie
        const minYear = parseInt(currentFilters.minConstructionYear, 10);
        if (!isNaN(minYear) && minYear > 0) { // Verifică și > 0 pentru a evita anii negativi dacă min e setat greșit
            filtered = filtered.filter(apt => {
                const constructionYear = Number(apt.constructionYear); // Asigură-te că apt.constructionYear e număr
                return !isNaN(constructionYear) && constructionYear >= minYear;
            });
        }

        // 10. Filtru Facultate Chiriași
        if (currentFilters.tenantFaculty.trim() !== "") {
            const searchFaculty = currentFilters.tenantFaculty.toLowerCase();

            // Obține ID-urile apartamentelor care au cel puțin un chiriaș cu facultatea dorită
            const apartmentIdsWithMatchingTenants = new Set(
                activeTenantFaculties // <-- AICI ESTE FOLOSITĂ STAREA
                    .filter(tf => tf.faculty.toLowerCase() === searchFaculty)
                    .map(tf => tf.apartmentId)
            );

            if (loadingTenantData && apartments.length > 0) {
                console.warn("Datele despre facultățile chiriașilor se încarcă încă. Filtrul de facultate ar putea fi aplicat pe date incomplete.");
                // Aici ai putea alege să NU aplici filtrul de facultate dacă datele încă se încarcă,
                // sau să informezi utilizatorul. Momentan, va filtra pe ce e disponibil în activeTenantFaculties.
            }

            filtered = filtered.filter(apt => apartmentIdsWithMatchingTenants.has(apt._id));
        }

        setFilteredApartments(filtered);
    };

    // Handler for explicit button click or Enter key
    const handleApplyFiltersAction = () => {
        applyFilters(apartments, filters);
    };

    // Function to update a specific filter value, supporting both top-level and facilities keys
    const handleFilterChange = (
        filterName: keyof Omit<Filters, 'facilities' | 'discounts'> | FacilityKey | DiscountKey,
        value: string | boolean
    ) => {
        setFilters((prevFilters) => {
            const isFacilityKey = facilityOptions.some(opt => opt.id === filterName);
            // Verificăm dacă filterName este o cheie a obiectului discounts
            const isDiscountKey = filterName === 'discount1' || filterName === 'discount2' || filterName === 'discount3';

            if (isFacilityKey) {
                return {
                    ...prevFilters,
                    facilities: {
                        ...prevFilters.facilities,
                        [filterName as FacilityKey]: value as boolean,
                    },
                };
            } else if (isDiscountKey) { // <-- BLOC NOU PENTRU DISCOUNTURI
                return {
                    ...prevFilters,
                    discounts: {
                        ...prevFilters.discounts,
                        [filterName as DiscountKey]: value as boolean,
                    },
                };
            } else {
                // Pentru cheile de la rădăcină (location, minPrice, etc.)
                return {
                    ...prevFilters,
                    // Asigură-te că TypeScript știe că filterName este o cheie validă aici
                    [filterName as keyof Omit<Filters, 'facilities' | 'discounts'>]: value,
                };
            }
        });
    };
    // Reset Filters Function
    const handleResetFilters = () => {
        const resetState = { ...initialFilters, location: locationParam };
        setFilters(resetState);
        // Apply the reset filters immediately to update the list
        applyFilters(apartments, resetState);
    };

    const handleMoreDetails = (id: string) => {
        navigate(`/apartment/${id}`);
    };

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
                    {/* Keep your class */}
                    <div className="filters-header">
                        {" "}
                        {/* New header section */}
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
                            <label style={{ marginTop: '10px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat1"
                                    checked={filters.discounts.discount1}
                                    onChange={(e) => handleFilterChange("discount1", e.target.checked)}
                                />
                                Oferă discount categoria 1
                            </label>
                            <label style={{ marginTop: '10px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat2"
                                    checked={filters.discounts.discount2}
                                    onChange={(e) => handleFilterChange("discount2", e.target.checked)}
                                />
                                Oferă discount categoria 2
                            </label>
                            <label style={{ marginTop: '10px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat3"
                                    checked={filters.discounts.discount3}
                                    onChange={(e) => handleFilterChange("discount3", e.target.checked)}
                                />
                                Oferă discount categoria 3
                            </label>
                        </div>
                    </div>

                    {/* Faculty Filter */}
                    <div className="filter-group">
                        <label htmlFor="filter-tenant-faculty">
                            <i className="fas fa-graduation-cap"></i> Facultate Chiriași Act.:
                        </label>
                        <select
                            id="filter-tenant-faculty"
                            value={filters.tenantFaculty} // Valoarea selectată
                            onChange={(e) => handleFilterChange("tenantFaculty", e.target.value)}
                            disabled={loadingFaculties} // Dezactivează cât timp se încarcă facultățile
                        >
                            <option value="">Toate facultățile</option> {/* Opțiune pentru a nu filtra */}
                            {loadingFaculties ? (
                                <option disabled>Se încarcă facultățile...</option>
                            ) : (
                                allFaculties.map(faculty => (
                                    // Folosim fullName ca valoare și ca text afișat.
                                    // Dacă ai un ID și vrei să-l folosești, setează value={faculty._id}
                                    <option key={faculty._id || faculty.fullName} value={faculty.fullName}>
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
                            <div className="year-inputs"> {/* Poți folosi o clasă similară cu price-inputs/surface-inputs */}
                                <input
                                    type="number"
                                    id="filter-min-construction-year"
                                    placeholder="Min An"
                                    min="1800" // Un an minim rezonabil
                                    max={new Date().getFullYear()} // Anul curent ca maxim
                                    value={filters.minConstructionYear}
                                    onChange={(e) => handleFilterChange("minConstructionYear", e.target.value)}
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
                                    onChange={(e) => handleFilterChange(facility.id, e.target.checked)}
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
                    {filteredApartments.length > 0 ? (
                        filteredApartments.map((apartment) => {
                            const imageUrl = apartment.images?.[0] ?? "/Poze_apartamente/placeholder.jpeg";
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
