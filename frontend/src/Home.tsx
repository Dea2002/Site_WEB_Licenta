import React, { useState, useEffect, useMemo } from "react";
import { api } from './api';
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginModal from "./LoginModal";
import { Apartment } from "./types"; // Make sure Apartment type includes all relevant fields
import "./style.css"; // Your existing CSS for Home
import MapModal from "./MapModal"; // Assuming this is used elsewhere or for future use
import { Faculty } from "./AuthContext";
// --- START: Updated Filters Interface ---

interface TenantFacultyInfo {
    apartmentId: string; // ID-ul apartamentului la care se refera chiriasul
    faculty: string;     // Numele facultatii chiriasului
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
        furniture: boolean;
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
    { id: 'furniture', label: 'Mobilat' },
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

    const [allFaculties, setAllFaculties] = useState<Faculty[]>([]); // Stare pentru a stoca toate facultatile
    const [loadingFaculties, setLoadingFaculties] = useState<boolean>(false);
    const [activeTenantFaculties, setActiveTenantFaculties] = useState<TenantFacultyInfo[]>([]);
    const [loadingTenantData, setLoadingTenantData] = useState<boolean>(true); // Seteaza initial pe true

    const [sortCriteria, setSortCriteria] = useState<string>("date_desc"); // Default: cele mai noi
    const [searchParams, setSearchParams] = useSearchParams(); // Adaugam setSearchParams
    // const locationParam = searchParams.get("location") || "";

    // const { isAuthenticated, token } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- START: Updated Initial Filters State ---
    const initialFilters: Filters = useMemo(() => ({ // Folosim useMemo pentru initialFilters
        location: searchParams.get("location") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        numberOfRooms: searchParams.get("numberOfRooms") || "",
        numberOfBathrooms: searchParams.get("numberOfBathrooms") || "",
        minSurface: searchParams.get("minSurface") || "",
        maxSurface: searchParams.get("maxSurface") || "",
        available: searchParams.get("available") === 'true',
        discounts: {
            discount1: searchParams.get("d1") === 'true',
            discount2: searchParams.get("d2") === 'true',
            discount3: searchParams.get("d3") === 'true',
        },
        facilities: facilityOptions.reduce((acc, opt) => {
            acc[opt.id] = searchParams.get(opt.id) === 'true';
            return acc;
        }, {} as Filters['facilities']),
        minConstructionYear: searchParams.get("minConstructionYear") || "",
        tenantFaculty: searchParams.get("tenantFaculty") || "",
    }), [searchParams]); // Recalculeaza doar daca searchParams se schimba
    // --- END: Updated Initial Filters State ---

    const [filters, setFilters] = useState<Filters>(initialFilters);

    // Sincronizeaza starea filters cu searchParams la schimbarea initialFilters (ex: navigare directa cu URL)
    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    // Functie pentru a actualiza URL-ul cu filtrele curente
    const updateURLWithFilters = (currentFilters: Filters) => {
        const params = new URLSearchParams();
        if (currentFilters.location) params.set("location", currentFilters.location);
        if (currentFilters.minPrice) params.set("minPrice", currentFilters.minPrice);
        if (currentFilters.maxPrice) params.set("maxPrice", currentFilters.maxPrice);
        if (currentFilters.numberOfRooms) params.set("numberOfRooms", currentFilters.numberOfRooms);
        if (currentFilters.numberOfBathrooms) params.set("numberOfBathrooms", currentFilters.numberOfBathrooms);
        if (currentFilters.minSurface) params.set("minSurface", currentFilters.minSurface);
        if (currentFilters.maxSurface) params.set("maxSurface", currentFilters.maxSurface);
        if (currentFilters.minConstructionYear) params.set("minConstructionYear", currentFilters.minConstructionYear);
        if (currentFilters.tenantFaculty) params.set("tenantFaculty", currentFilters.tenantFaculty);
        if (currentFilters.discounts.discount1) params.set("d1", "true");
        if (currentFilters.discounts.discount2) params.set("d2", "true");
        if (currentFilters.discounts.discount3) params.set("d3", "true");

        facilityOptions.forEach(opt => {
            if (currentFilters.facilities[opt.id]) {
                params.set(opt.id, "true");
            }
        });
        // Adauga si alte filtre daca e necesar
        setSearchParams(params, { replace: true }); // replace: true pentru a nu umple istoricul browserului
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
                const [apartmentsResponse, facultiesResponse, tenantFacultiesResponse] = await Promise.all([
                    api.get<Apartment[]>("/apartments"),
                    api.get<Faculty[]>("/faculty/"),
                    api.get<TenantFacultyInfo[]>("/apartments/rentals/active-tenant-faculties-summary")
                ]);

                const fetchedApartments = apartmentsResponse.data;
                setApartments(fetchedApartments);
                setAllFaculties(facultiesResponse.data);
                setActiveTenantFaculties(tenantFacultiesResponse.data);

                console.log("Apartamente:", fetchedApartments);
                console.log("Facultati dropdown:", facultiesResponse.data);
                console.log("Facultati chiriasi:", tenantFacultiesResponse.data);

                // Aplicam filtrele initiale (care pot veni din URL via initialFilters)
                applyFilters(fetchedApartments, filters); // Folosim starea 'filters' care e sincronizata cu URL-ul

            } catch (error) {
                console.error("Eroare la preluarea datelor initiale:", error);
                setApartments([]); setFilteredApartments([]); setAllFaculties([]); setActiveTenantFaculties([]);
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
                const [apartmentsResponse, facultiesResponse, tenantFacultiesResponse] = await Promise.all([
                    api.get<Apartment[]>("/apartments"),
                    api.get<Faculty[]>("/faculty/"),
                    api.get<TenantFacultyInfo[]>("/apartments/rentals/active-tenant-faculties-summary") // Ruta corectata
                ]);

                setApartments(apartmentsResponse.data);
                setAllFaculties(facultiesResponse.data);
                setActiveTenantFaculties(tenantFacultiesResponse.data);

            } catch (error) {
                console.error("Eroare la preluarea datelor initiale:", error);
                // Gestioneaza erorile corespunzator
            } finally {
                setLoadingFaculties(false);
                setLoadingTenantData(false);
            }
        };
        fetchData();
    }, []);

    // Fetch apartments (existing code)
    // useEffect(() => {
    //     api
    //         .get<Apartment[]>("/apartments")
    //         .then((response) => {
    //             setApartments(response.data);
    //             console.log("Apartamente preluate:", response.data);
    //             // Apply initial filter from URL param if present
    //             if (locationParam.trim() !== "") {
    //                 applyFilters(response.data, { ...filters, location: locationParam });
    //             } else {
    //                 setFilteredApartments(response.data);
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Eroare la preluarea datelor:", error);
    //         });

    //     setLoadingFaculties(true);
    //     api.get<Faculty[]>("/faculty/")
    //         .then(response => {
    //             setAllFaculties(response.data);
    //         })
    //         .catch(error => {
    //             console.error("Eroare la preluarea listei de facultati:", error);
    //             setAllFaculties([]);
    //         })
    //         .finally(() => {
    //             setLoadingFaculties(false);
    //         });

    //     // Fetch pentru datele despre facultatile chiriasilor activi
    //     setLoadingTenantData(true);
    //     api.get<TenantFacultyInfo[]>("/apartments/rentals/active-tenant-faculties-summary") // Endpoint ipotetic, vezi mai jos
    //         .then(response => {
    //             setActiveTenantFaculties(response.data);
    //             console.log("Facultati chiriasi activi:", response.data);
    //             // Dupa ce avem si aceste date, am putea re-aplica filtrele daca e necesar
    //             // si daca un filtru de facultate era deja activ (ex: din URL)
    //             // Dar, de obicei, utilizatorul aplica filtrele dupa ce pagina s-a incarcat.
    //         })
    //         .catch(error => {
    //             console.error("Eroare la preluarea facultatilor chiriasilor:", error);
    //             setActiveTenantFaculties([]);
    //         })
    //         .finally(() => {
    //             setLoadingTenantData(false);
    //         });
    // }, [locationParam]); // Run only once on mount

    useEffect(() => {
        if (apartments.length > 0) { // Aplica doar daca datele initiale s-au incarcat
            applyFilters(apartments, filters);
        } else if (apartments.length === 0) {
            setFilteredApartments([]); // Daca nu sunt apartamente, lista filtrata e goala
        }
    }, [apartments, filters, activeTenantFaculties]);

    // useEffect(() => {
    //     api
    //         .get<Apartment[]>("/apartments")
    //         .then((response) => {
    //             setApartments(response.data);
    //             // Apply initial location filter IF locationParam exists
    //             if (locationParam.trim() !== "") {
    //                 applyFilters(response.data, { ...initialFilters, location: locationParam });
    //             } else {
    //                 setFilteredApartments(response.data); // Otherwise, show all initially
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Eroare la preluarea datelor:", error);
    //         });
    // }, []); // Runs once

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
        if (currentFilters.discounts.discount2) { // Adauga si pentru celelalte daca ai checkbox-uri
            filtered = filtered.filter(apt =>
                apt.discounts && typeof apt.discounts.discount2 === 'number' && apt.discounts.discount2 > 0
            );
        }
        if (currentFilters.discounts.discount3) { // Adauga si pentru celelalte
            filtered = filtered.filter(apt =>
                apt.discounts && typeof apt.discounts.discount3 === 'number' && apt.discounts.discount3 > 0
            );
        }

        // 9. Filtru An Constructie
        const minYear = parseInt(currentFilters.minConstructionYear, 10);
        if (!isNaN(minYear) && minYear > 0) { // Verifica si > 0 pentru a evita anii negativi daca min e setat gresit
            filtered = filtered.filter(apt => {
                const constructionYear = Number(apt.constructionYear); // Asigura-te ca apt.constructionYear e numar
                return !isNaN(constructionYear) && constructionYear >= minYear;
            });
        }

        // 10. Filtru Facultate Chiriasi
        if (currentFilters.tenantFaculty.trim() !== "") {
            const searchFacultyLower = currentFilters.tenantFaculty.toLowerCase();

            // Set de ID-uri ale apartamentelor care au cel putin un chirias de la facultatea cautata
            const apartmentsWithMatchingFacultyTenant = new Set<string>();
            activeTenantFaculties.forEach(tf => {
                if (tf.faculty.toLowerCase() === searchFacultyLower) {
                    apartmentsWithMatchingFacultyTenant.add(tf.apartmentId);
                }
            });

            // Set de ID-uri ale apartamentelor care au *orice* chirias activ/viitor
            const apartmentsWithAnyActiveTenant = new Set<string>(
                activeTenantFaculties.map(tf => tf.apartmentId)
            );

            if (loadingTenantData && apartmentsToFilter.length > 0) { // Verifica si apartmentsToFilter pentru a nu filtra prematur
                console.warn("Datele despre facultatile chiriasilor se incarca inca. Filtrul de facultate ar putea fi aplicat pe date incomplete.");
            }

            filtered = filtered.filter(apt => {
                // Conditia 1: Apartamentul are un chirias de la facultatea selectata
                const hasTenantFromSelectedFaculty = apartmentsWithMatchingFacultyTenant.has(apt._id);

                // Conditia 2: Apartamentul este complet liber (nu are niciun chirias activ/viitor)
                const isCompletelyVacant = !apartmentsWithAnyActiveTenant.has(apt._id);

                return hasTenantFromSelectedFaculty || isCompletelyVacant;
            });
        }

        setFilteredApartments(filtered);
    };

    // Handler for explicit button click or Enter key
    const handleApplyFiltersAction = () => {
        updateURLWithFilters(filters);
        // applyFilters(apartments, filters);
    };

    // Function to update a specific filter value, supporting both top-level and facilities keys
    const handleFilterChange = (
        filterName: keyof Omit<Filters, 'facilities' | 'discounts'> | FacilityKey | DiscountKey,
        value: string | boolean
    ) => {
        setFilters((prevFilters) => {
            const isFacilityKey = facilityOptions.some(opt => opt.id === filterName);
            // Verificam daca filterName este o cheie a obiectului discounts
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
                // Pentru cheile de la radacina (location, minPrice, etc.)
                return {
                    ...prevFilters,
                    // Asigura-te ca TypeScript stie ca filterName este o cheie valida aici
                    [filterName as keyof Omit<Filters, 'facilities' | 'discounts'>]: value,
                };
            }
        });
    };

    // Reset Filters Function
    const handleResetFilters = () => {
        // Resetam la starea initiala derivata din searchParams (sau la valori default daca searchParams sunt goale)
        // const params = new URLSearchParams(location.search);
        // const resetState: Filters = {
        //     location: params.get("location") || "",
        //     minPrice: params.get("minPrice") || "",
        //     maxPrice: params.get("maxPrice") || "",
        //     numberOfRooms: params.get("numberOfRooms") || "",
        //     numberOfBathrooms: params.get("numberOfBathrooms") || "",
        //     minSurface: params.get("minSurface") || "",
        //     maxSurface: params.get("maxSurface") || "",
        //     available: params.get("available") === 'true',
        //     discounts: {
        //         discount1: params.get("d1") === 'true',
        //         discount2: params.get("d2") === 'true',
        //         discount3: params.get("d3") === 'true',
        //     },
        //     facilities: facilityOptions.reduce((acc, opt) => {
        //         acc[opt.id] = params.get(opt.id) === 'true';
        //         return acc;
        //     }, {} as Filters['facilities']),
        //     minConstructionYear: params.get("minConstructionYear") || "",
        //     tenantFaculty: params.get("tenantFaculty") || "",
        // };
        // Daca vrem resetare completa la valorile default, ignorand URL-ul:
        // const resetState = { ...initialFilters, location: "" }; // Sau pastram locationParam daca e relevant
        setFilters(initialFilters); // Resetam la valorile default absolute
        setSearchParams({}, { replace: true }); // Curatam URL-ul
    };

    const handleMoreDetails = (id: string) => {
        navigate(`/apartment/${id}`);
    };

    // --- Logica pentru Sortare ---
    const sortedAndFilteredApartments = useMemo(() => {
        let sortableArray = [...filteredApartments];

        const getDiscountedPrice = (apt: Apartment, discountField: keyof Apartment['discounts']): number => {
            if (apt.discounts && typeof apt.discounts[discountField] === 'number' && apt.discounts[discountField] > 0) {
                return apt.price * (1 - (apt.discounts[discountField] / 100));
            }
            return apt.price; // Sau un numar foarte mare daca vrei ca cele fara discount sa fie la sfarsit
        };

        // Functie pentru a determina daca un apartament este disponibil ACUM
        // Aceasta este o simplificare. intr-o aplicatie reala, ai verifica chiriile active.
        const isApartmentAvailableNow = (apt: Apartment): boolean => {
            // Placeholder: Trebuie sa implementezi logica reala aici
            // De ex., verifici `activeTenantFaculties` sau un camp `apt.currentBookings`
            const hasActiveBooking = activeTenantFaculties.some(tf => tf.apartmentId === apt._id); // Simplificare grosolana
            return !hasActiveBooking;
        };


        switch (sortCriteria) {
            case 'price_asc':
                sortableArray.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                sortableArray.sort((a, b) => b.price - a.price);
                break;
            case 'd1_asc': // Pret cu discount categoria 1 (crescator)
                sortableArray.sort((a, b) => getDiscountedPrice(a, 'discount1') - getDiscountedPrice(b, 'discount1'));
                break;
            case 'd1_desc':
                sortableArray.sort((a, b) => getDiscountedPrice(b, 'discount1') - getDiscountedPrice(a, 'discount1'));
                break;
            case 'd2_asc':
                sortableArray.sort((a, b) => getDiscountedPrice(a, 'discount2') - getDiscountedPrice(b, 'discount2'));
                break;
            case 'd2_desc':
                sortableArray.sort((a, b) => getDiscountedPrice(b, 'discount2') - getDiscountedPrice(a, 'discount2'));
                break;
            case 'd3_asc':
                sortableArray.sort((a, b) => getDiscountedPrice(a, 'discount3') - getDiscountedPrice(b, 'discount3'));
                break;
            case 'd3_desc':
                sortableArray.sort((a, b) => getDiscountedPrice(b, 'discount3') - getDiscountedPrice(a, 'discount3'));
                break;
            case 'construction_desc': // Cele mai noi cladiri primele
                sortableArray.sort((a, b) => Number(b.constructionYear) - Number(a.constructionYear));
                break;
            case 'construction_asc': // Cele mai vechi cladiri primele
                sortableArray.sort((a, b) => Number(a.constructionYear) - Number(b.constructionYear));
                break;
            case 'surface_asc':
                sortableArray.sort((a, b) => Number(a.totalSurface) - Number(b.totalSurface));
                break;
            case 'surface_desc':
                sortableArray.sort((a, b) => Number(b.totalSurface) - Number(a.totalSurface));
                break;
            case 'rooms_asc':
                sortableArray.sort((a, b) => Number(a.numberOfRooms) - Number(b.numberOfRooms));
                break;
            case 'rooms_desc':
                sortableArray.sort((a, b) => Number(b.numberOfRooms) - Number(a.numberOfRooms));
                break;
            case 'availability': // Apartamentele disponibile primele
                sortableArray.sort((a, b) => {
                    const availableA = isApartmentAvailableNow(a);
                    const availableB = isApartmentAvailableNow(b);
                    if (availableA && !availableB) return -1; // A vine inaintea lui B
                    if (!availableA && availableB) return 1;  // B vine inaintea lui A
                    return 0; // Ordinea nu se schimba daca ambele sunt la fel
                });
                break;
            case 'date_desc': // Cele mai noi adaugate (presupunand createdAt)
            default:
                // sortableArray.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
        }
        return sortableArray;
    }, [filteredApartments, sortCriteria, activeTenantFaculties]); // Adaugam activeTenantFaculties pentru sortarea dupa disponibilitate




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
                        <div className="sort-options-sidebar"> {/* Adauga o clasa specifica daca vrei stilizare diferita în sidebar */}
                            <h2> {/* Poti adauga un titlu si aici daca doresti */}
                                <i className="fas fa-sort-amount-down"></i> Sorteaza Rezultatele
                            </h2>
                            <div className="filter-group"> {/* Poti refolosi clasa .filter-group pentru consistenta vizuala */}
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
                                    <option value="construction_desc">An constructie (noi-vechi)</option>
                                    <option value="construction_asc">An constructie (vechi-noi)</option>
                                    <option value="surface_desc">Suprafata (mare-mica)</option>
                                    <option value="surface_asc">Suprafata (mica-mare)</option>
                                    <option value="rooms_desc">Nr. Camere (multe-putine)</option>
                                    <option value="rooms_asc">Nr. Camere (putine-multe)</option>
                                    <option value="availability">Disponibilitate (libere primele)</option>
                                </select>
                            </div>
                        </div>
                    </div>
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
                                Ofera discount categoria 1
                            </label>
                            <label style={{ marginTop: '10px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat2"
                                    checked={filters.discounts.discount2}
                                    onChange={(e) => handleFilterChange("discount2", e.target.checked)}
                                />
                                Ofera discount categoria 2
                            </label>
                            <label style={{ marginTop: '10px', display: 'block' }}>
                                <input
                                    type="checkbox"
                                    id="filter-discount-cat3"
                                    checked={filters.discounts.discount3}
                                    onChange={(e) => handleFilterChange("discount3", e.target.checked)}
                                />
                                Ofera discount categoria 3
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
                            <option value="">Toate facultatile</option> {/* Optiune pentru a nu filtra */}
                            {loadingFaculties ? (
                                <option disabled>Se incarca facultatile...</option>
                            ) : (
                                allFaculties.map(faculty => (
                                    // Folosim fullName ca valoare si ca text afisat.
                                    // Daca ai un ID si vrei sa-l folosesti, seteaza value={faculty._id}
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
                            <div className="year-inputs"> {/* Poti folosi o clasa similara cu price-inputs/surface-inputs */}
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
                    {sortedAndFilteredApartments.length > 0 ? (
                        sortedAndFilteredApartments.map((apartment) => {
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
