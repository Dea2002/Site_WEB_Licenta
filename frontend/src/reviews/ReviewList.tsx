import React, { useState, useEffect, useMemo } from 'react';
// Nu mai avem nevoie de 'api' aici daca facem sortarea client-side
// import { api } from '../api'; 
import { Review } from '../types';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ReviewItemProps {
    review: Review;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
    const renderStars = (rating: number) => {
        let stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} style={{ color: i <= rating ? '#FFD700' : '#e0e0e0', fontSize: '1.2em' }}>
                    ★
                </span>
            );
        }
        return stars;
    };

    return (
        <div className="review-item" style={{ borderBottom: '1px solid #eee', marginBottom: '15px', paddingBottom: '15px' }}>
            <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <strong className="review-user-name">{review.userName || `Utilizator ${review.userId.substring(0, 6)}...`}</strong>
                <span className="review-date" style={{ fontSize: '0.9em', color: '#777' }}>
                    {review.createdAt ? format(new Date(review.createdAt), 'd MMMM yyyy, HH:mm', { locale: ro }) : 'Data necunoscuta'}
                </span>
            </div>
            <div className="review-rating" style={{ marginBottom: '8px' }}>
                {renderStars(review.rating)} ({review.rating}/5)
            </div>
            <p className="review-comment" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{review.comment}</p>
        </div>
    );
};

interface ReviewListProps {
    reviews: Review[]; // Lista initiala si completa de review-uri pentru acest apartament
    // apartmentId nu mai este strict necesar pentru logica de sortare/filtrare client-side,
    // dar il poti pastra daca il folosesti in alta parte sau pentru debug.
    // apartmentId: string; 
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews: initialReviews }) => {
    // Nu mai folosim displayedReviews ca o stare separata care ar fi actualizata de initialReviews,
    // ci direct rezultatul din useMemo.
    // const [displayedReviews, setDisplayedReviews] = useState<Review[]>(initialReviews);

    const [sortBy, setSortBy] = useState<string>('createdAt_desc');
    const [filterRating, setFilterRating] = useState<number>(0);

    // isLoading nu mai este necesar pentru operatiuni client-side.
    // const [isLoading, setIsLoading] = useState(false);

    // IMPORTANT: Presupunem ca `initialReviews` contine TOATE review-urile pentru apartament
    // si nu se schimba decat daca se adauga un review nou (caz in care componenta parinte ar trebui sa paseze noua lista completa).

    // --- Sortare/Filtrare Client-Side ---
    const sortedAndFilteredReviews = useMemo(() => {
        // console.log("Recalculating sortedAndFilteredReviews", { initialReviewsCount: initialReviews.length, sortBy, filterRating });
        let tempReviews = [...initialReviews]; // Lucreaza pe o copie pentru a nu modifica array-ul original din props

        // Filtrare
        if (filterRating > 0) {
            tempReviews = tempReviews.filter(r => r.rating === filterRating);
        }

        // Sortare
        switch (sortBy) {
            case 'createdAt_asc':
                tempReviews.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                break;
            case 'rating_desc':
                // Sorteaza descrescator dupa rating. Daca rating-urile sunt egale, sorteaza descrescator dupa data (cele mai noi primele).
                tempReviews.sort((a, b) => {
                    if (b.rating !== a.rating) {
                        return b.rating - a.rating;
                    }
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                });
                break;
            case 'rating_asc':
                // Sorteaza crescator dupa rating. Daca rating-urile sunt egale, sorteaza descrescator dupa data.
                tempReviews.sort((a, b) => {
                    if (a.rating !== b.rating) {
                        return a.rating - b.rating;
                    }
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                });
                break;
            case 'createdAt_desc':
            default:
                tempReviews.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
        }
        return tempReviews;
    }, [initialReviews, sortBy, filterRating]);

    // Nu mai este nevoie de acest useEffect daca `displayedReviews` este direct `sortedAndFilteredReviews` in map.
    // useEffect(() => { 
    //     setDisplayedReviews(sortedAndFilteredReviews); 
    // }, [sortedAndFilteredReviews]);

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSortBy(e.target.value);
        // Nu mai este nevoie de fetchAndSetReviews
    };

    const handleRatingFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterRating(parseInt(e.target.value, 10));
        // Nu mai este nevoie de fetchAndSetReviews
    };

    const hasAnyReviewsInitially = initialReviews && initialReviews.length > 0;

    // Afiseaza mesajul daca lista (dupa filtrare si sortare) este goala.
    // isLoading a fost eliminat.
    // if (sortedAndFilteredReviews.length === 0) {
    //     if (filterRating > 0) { // Daca exista un filtru de rating activ
    //         return <p>Nu exista recenzii care sa corespunda notei selectate.</p>;
    //     }
    //     return <p>Nu exista recenzii pentru acest apartament inca. Fii primul care lasa una!</p>;
    // }

    return (
        <div className="review-list-container">
            {hasAnyReviewsInitially ? (
                <div className="review-controls" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div>
                        <label htmlFor="sort-reviews" style={{ marginRight: '5px' }}>Sorteaza dupa:</label>
                        <select id="sort-reviews" value={sortBy} onChange={handleSortChange} /* disabled={isLoading} eliminat */ >
                            <option value="createdAt_desc">Cele mai noi</option>
                            <option value="createdAt_asc">Cele mai vechi</option>
                            <option value="rating_desc">Rating (Mare &gt Mic)</option>
                            <option value="rating_asc">Rating (Mic &gt Mare)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-rating" style={{ marginRight: '5px' }}>Filtreaza dupa nota:</label>
                        <select id="filter-rating" value={filterRating} onChange={handleRatingFilterChange} /* disabled={isLoading} eliminat */ >
                            <option value="0">Toate notele</option>
                            <option value="5">Doar 5 stele</option>
                            <option value="4">Doar 4 stele</option>
                            <option value="3">Doar 3 stele</option>
                            <option value="2">Doar 2 stele</option>
                            <option value="1">Doar 1 stea</option>
                        </select>
                    </div>
                    {/* isLoading si mesajul asociat au fost eliminate */}
                </div>) : (
                // Daca initialReviews este gol, afisam direct mesajul ca nu sunt recenzii deloc
                <p>Nu exista recenzii pentru acest apartament inca. Fii primul care lasa una!</p>
            )}
            {/* Randam lista de review-uri sau mesajul corespunzator DUPA controale */}
            {hasAnyReviewsInitially && sortedAndFilteredReviews.length === 0 && filterRating > 0 && (
                <p>Nu exista recenzii care sa corespunda notei selectate.</p>
            )}

            {/* Iteram direct peste sortedAndFilteredReviews */}
            {hasAnyReviewsInitially && sortedAndFilteredReviews.length > 0 && (
                sortedAndFilteredReviews.map(review => (
                    <ReviewItem key={review._id} review={review} />
                ))
            )}
        </div>
    );
};

export default ReviewList;