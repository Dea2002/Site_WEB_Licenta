

// frontend/src/Home.tsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Importam useSearchParams
import Bara_navigatie from './Bara_navigatie';
import LoginModal from './LoginModal';
import { AuthContext } from './AuthContext';
import { Apartment } from './types';
import './style.css';

// Definim o interfata pentru filtre (poti adauga si alte filtre dupa nevoie)
interface Filters {
    location: string;
    available: boolean;
}

const Home: React.FC = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();

    // Folosim useSearchParams pentru a prelua query-urile din URL
    const [searchParams] = useSearchParams();
    // Daca URL-ul are ?location=Bucuresti, atunci locationParam va fi "Bucuresti"
    const locationParam = searchParams.get('location') || '';

    // Initializam starea filtrelor; folosim locationParam pentru filtrul de locatie
    const [filters, setFilters] = useState<Filters>({
        location: locationParam,
        available: false,
    });

    // Preluam toate apartamentele de pe server
    useEffect(() => {
        axios.get<Apartment[]>('http://localhost:5000/apartments')
            .then(response => {
                setApartments(response.data);
                // Initial afisam toate apartamentele
                setFilteredApartments(response.data);
            })
            .catch(error => {
                console.error('Eroare la preluarea datelor:', error);
            });
    }, []);


    // Variante de aplicare automata a filtrului //! cu aceasta bucata de cod se aplica filtrul automat cand accesezi linkul cu un query in el
    // ca sa fie mai clar: cand in landing page pui o locatie si dai sa cauti dupa acea locatie, se deschide un link cu un query de filtrare dupa locatie si astfel fortez sa se aplice automat acest filtru din query ❤
    useEffect(() => {
        if (apartments.length > 0 && filters.location.trim() !== '') {
            handleRefreshFilters();
        } else {
            setFilteredApartments(apartments);
        }
    }, [apartments]);


    // Functie pentru aplicarea filtrelor
    const handleRefreshFilters = () => {
        let filtered = apartments;


        // Filtram dupa locatie daca nu este sir gol
        if (filters.location.trim() !== '') {
            filtered = filtered.filter(apartment =>
                apartment.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        // Filtru pentru apartamente disponibile
        if (filters.available) {
            filtered = filtered.filter(apartment => apartment.status === 'disponibil');
        }

        setFilteredApartments(filtered);
    };

    // Functie pentru redirectionarea catre pagina de detalii a unui apartament
    const handleMoreDetails = (id: string) => {
        navigate(`/apartment/${id}`);
    };

    return (
        <div>
            <Bara_navigatie />
            {/* <h1>Apartamente pentru inchiriere</h1> */}
            <div className="home-container">
                {/* Sidebar-ul cu filtre */}
                <aside className="filters-sidebar">
                    <h2>Filtreaza oferte</h2>

                    <div className="filter-group">
                        <label htmlFor="filter-location">Locatie:</label>
                        <input
                            type="text"
                            id="filter-location"
                            placeholder="Ex: Bucuresti"
                            value={filters.location}
                            onChange={(e) =>
                                setFilters({ ...filters, location: e.target.value })
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); // Previne comportamentul implicit
                                    handleRefreshFilters(); // Apeleaza functia de filtrare
                                }
                            }}
                        />
                    </div>

                    <div className="filter-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.available}
                                onChange={(e) =>
                                    setFilters({ ...filters, available: e.target.checked })
                                }
                            />
                            Doar apartamente disponibile
                        </label>
                    </div>

                    <button onClick={handleRefreshFilters} className="refresh-button">
                        Actualizeaza filtrele
                    </button>
                </aside>

                {/* Lista cu apartamente filtrate */}
                <section className="apartments-list">
                    {filteredApartments.length > 0 ? (
                        filteredApartments.map((apartment) => (
                            <div
                                key={apartment._id}
                                className={`apartment ${apartment.status === 'indisponibil' ? 'unavailable' : ''}`}
                            >
                                <h2>{apartment.name}</h2>
                                <p><strong>Descriere:</strong> {apartment.description}</p>
                                <p><strong>Numar de camere:</strong> {apartment.numberofrooms}</p>
                                <p><strong>Pret:</strong> {apartment.price} RON</p>
                                <p><strong>Locatie:</strong> {apartment.location}</p>
                                <p><strong>Proprietar:</strong> {apartment.ownername}</p>
                                <p><strong>Email proprietar:</strong> {apartment.owneremail}</p>
                                <p><strong>Status:</strong> {apartment.status === 'disponibil' ? 'Disponibil' : 'Indisponibil'}</p>
                                {apartment.status === 'indisponibil' && apartment.reason && (
                                    <p><strong>Motiv indisponibilitate:</strong> {apartment.reason}</p>
                                )}
                                <p><strong>Total rezervari:</strong> {apartment.totalbooked}</p>
                                {apartment.image && (
                                    <img src={`/Poze_apartamente/${apartment.image}`} alt={`Imagine pentru ${apartment.name}`} width="300" />
                                )}
                                <button
                                    onClick={() => handleMoreDetails(apartment._id)}
                                    className="button"
                                    disabled={apartment.status === 'indisponibil'}
                                >
                                    Mai multe detalii
                                </button>
                            </div>
                        ))
                    ) : (
                        <p>Nu exista apartamente disponibile momentan.</p>
                    )}
                </section>
            </div>
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
    );
};

export default Home;


