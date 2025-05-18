import React, { useState, useEffect } from "react";
import { api } from './api';
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginModal from "./LoginModal";
import { Apartment } from "./types"; // Make sure Apartment type includes all relevant fields
import "./style.css"; // Your existing CSS for Home
import MapModal from "./MapModal"; // Assuming this is used elsewhere or for future use

// --- START: Updated Filters Interface ---
interface Filters {
    location: string;
    minPrice: string;
    maxPrice: string;
    numberOfRooms: string; // "" (any), "1", "2", "3", "4+"
    numberOfBathrooms: string; // "" (any), "1", "2+"
    minSurface: string;
    maxSurface: string;
    available: boolean;
    petFriendly: boolean;
    parking: boolean;
    elevator: boolean;
    airConditioning: boolean;
    balcony: boolean;
    // acceptsColleagues: boolean;
}
// --- END: Updated Filters Interface ---

const Home: React.FC = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
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
        petFriendly: false,
        parking: false,
        elevator: false,
        airConditioning: false,
        balcony: false,
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
    }, []); // Run only once on mount

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
        let filtered = apartmentsToFilter;

        // Location
        if (currentFilters.location.trim() !== "") {
            filtered = filtered.filter((apt) =>
                apt.location.toLowerCase().includes(currentFilters.location.toLowerCase()),
            );
        }

        // Price Range
        const minPrice = parseFloat(currentFilters.minPrice);
        const maxPrice = parseFloat(currentFilters.maxPrice);
        if (!isNaN(minPrice) && minPrice >= 0) {
            filtered = filtered.filter((apt) => apt.price >= minPrice);
        }
        if (!isNaN(maxPrice) && maxPrice >= 0) {
            if (!isNaN(minPrice) && maxPrice < minPrice) {
                console.warn("Max price is less than min price, ignoring max price.");
            } else {
                filtered = filtered.filter((apt) => apt.price <= maxPrice);
            }
        }

        // Number of Rooms
        if (currentFilters.numberOfRooms && currentFilters.numberOfRooms !== "") {
            if (currentFilters.numberOfRooms.endsWith("+")) {
                const minRooms = parseInt(currentFilters.numberOfRooms.replace("+", ""), 10);
                if (!isNaN(minRooms)) {
                    filtered = filtered.filter((apt) => apt.numberOfRooms >= minRooms);
                }
            } else {
                const exactRooms = parseInt(currentFilters.numberOfRooms, 10);
                filtered = filtered.filter((apt) => Number(apt.numberOfRooms) === exactRooms);
            }
        }

        // Number of Bathrooms
        if (currentFilters.numberOfBathrooms && currentFilters.numberOfBathrooms !== "") {
            if (currentFilters.numberOfBathrooms.endsWith("+")) {
                const minBaths = parseInt(currentFilters.numberOfBathrooms.replace("+", ""), 10);
                if (!isNaN(minBaths)) {
                    filtered = filtered.filter((apt) => apt.numberOfBathrooms >= minBaths);
                }
            } else {
                const exactBaths = parseInt(currentFilters.numberOfBathrooms, 10);
                if (!isNaN(exactBaths)) {
                    filtered = filtered.filter(
                        (apt) => Number(apt.numberOfBathrooms) === exactBaths,
                    );
                }
            }
        }

        // Surface Area Range
        const minSurface = parseFloat(currentFilters.minSurface);
        const maxSurface = parseFloat(currentFilters.maxSurface);
        if (!isNaN(minSurface) && minSurface >= 0) {
            filtered = filtered.filter((apt) => apt.totalSurface >= minSurface);
        }
        if (!isNaN(maxSurface) && maxSurface >= 0) {
            if (!isNaN(minSurface) && maxSurface < minSurface) {
                console.warn("Max surface is less than min surface, ignoring max surface.");
            } else {
                filtered = filtered.filter((apt) => apt.totalSurface <= maxSurface);
            }
        }

        // Boolean Flags
        // if (currentFilters.available) {
        //     filtered = filtered.filter((apt) => apt.status === "disponibil");
        // }
        if (currentFilters.petFriendly) {
            filtered = filtered.filter((apt) => apt.petFriendly === true);
        }
        if (currentFilters.parking) {
            filtered = filtered.filter((apt) => apt.parking === true);
        }
        if (currentFilters.elevator) {
            filtered = filtered.filter((apt) => apt.elevator === true);
        }
        if (currentFilters.airConditioning) {
            filtered = filtered.filter((apt) => apt.airConditioning === true);
        }
        if (currentFilters.balcony) {
            filtered = filtered.filter((apt) => apt.balcony === true);
        }
        // if (currentFilters.acceptsColleagues) {
        //     filtered = filtered.filter((apt) => apt.colleagues === true);
        // }

        setFilteredApartments(filtered);
    };

    // Handler for explicit button click or Enter key
    const handleApplyFiltersAction = () => {
        applyFilters(apartments, filters);
    };

    // Function to update a specific filter value
    const handleFilterChange = (filterName: keyof Filters, value: string | boolean) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [filterName]: value,
        }));
        // Note: Filtering does NOT happen automatically here anymore
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
                            <i className="fas fa-dollar-sign"></i> Pret (RON/noapte):
                        </label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                id="filter-min-price"
                                placeholder="Min"
                                min="0"
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                id="filter-max-price"
                                placeholder="Max"
                                min="0"
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                            />
                        </div>
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
                    </div>
                    {/* Amenities/Policies Group */}
                    <div className="filter-group check-group">
                        <h4>
                            <i className="fas fa-check"></i> Facilitati
                        </h4>
                        {/* Keep original available checkbox structure if preferred, or use new one */}
                        {/* <label>
                            <input
                                type="checkbox"
                                checked={filters.available}
                                onChange={(e) => handleFilterChange("available", e.target.checked)}
                            />
                            Disponibile Acum
                        </label> */}
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.parking}
                                onChange={(e) => handleFilterChange("parking", e.target.checked)}
                            />
                            Parcare
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.elevator}
                                onChange={(e) => handleFilterChange("elevator", e.target.checked)}
                            />
                            Lift
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.balcony}
                                onChange={(e) => handleFilterChange("balcony", e.target.checked)}
                            />
                            Balcon
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.airConditioning}
                                onChange={(e) =>
                                    handleFilterChange("airConditioning", e.target.checked)
                                }
                            />
                            Aer Conditionat
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.petFriendly}
                                onChange={(e) =>
                                    handleFilterChange("petFriendly", e.target.checked)
                                }
                            />
                            Accepta Animale
                        </label>
                        {/* <label>
                            <input
                                type="checkbox"
                                checked={filters.acceptsColleagues}
                                onChange={(e) =>
                                    handleFilterChange("acceptsColleagues", e.target.checked)
                                }
                            />
                            Accepta Colegi
                        </label> */}
                    </div>
                    {/* Keep your original button, but have it call the apply function */}
                    <button onClick={handleApplyFiltersAction} className="refresh-button">
                        Aplica Filtrele {/* Changed text slightly */}
                    </button>
                </aside>
                {/* Apartments List Section (existing structure) */}
                <section className="apartments-list">
                    {filteredApartments.length > 0 ? (
                        filteredApartments.map((apartment) => (
                            <div key={apartment._id} className="apartment">
                                {apartment.images && (
                                    <img
                                        src={`/Poze_apartamente/${apartment.images}`}
                                        alt={`Apartament in ${apartment.location}`}
                                        width="300"
                                    />
                                )}
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
                        ))
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
