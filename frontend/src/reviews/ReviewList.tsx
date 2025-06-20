import React, { useState, useMemo, useContext } from 'react';
import { Review } from '../types';
import { api } from '../api';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { AuthContext } from '../AuthContext';
import "./ReviewList.css"
interface ReviewItemProps {
    review: Review;
    currentUserId: string | null;
    onReviewDeleted: (reviewId: string) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, currentUserId, onReviewDeleted }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const { token } = useContext(AuthContext);

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
    const handleDeleteReview = async () => {
        if (!window.confirm("Esti sigur ca vrei sa stergi aceasta recenzie?")) {
            return;
        }
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/reviews/${review._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onReviewDeleted(review._id);
        } catch (err: any) {
            console.error("Eroare la stergerea review-ului:", err);
            setDeleteError(err.response?.data?.message || "Nu s-a putut sterge recenzia.");
        } finally {
            setIsDeleting(false);
        }
    };

    const canDelete = currentUserId === review.userId;

    return (
        <div className="review-item" style={{ borderBottom: '1px solid #eee', marginBottom: '15px', paddingBottom: '15px' }}>
            <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <strong className="review-user-name">{review.userName || `Utilizator ${review.userId.substring(0, 6)}...`}</strong>
                <div className="review-meta">
                    <span className="review-date" style={{ fontSize: '0.9em', color: '#777', marginRight: canDelete ? '10px' : '0' }}>
                        {review.createdAt ? format(new Date(review.createdAt), 'd MMMM yyyy, HH:mm', { locale: ro }) : 'Data necunoscuta'}
                    </span>
                    {canDelete && (
                        <button
                            onClick={handleDeleteReview}
                            disabled={isDeleting}
                            className="delete-review-button"
                            title="Sterge recenzia"
                        >
                            {isDeleting ? "Se sterge..." : <i className="fas fa-trash-alt"></i>}
                        </button>
                    )}
                </div>
            </div>
            {deleteError && <p className="error-message" style={{ color: 'red', fontSize: '0.9em' }}>{deleteError}</p>}
            <div className="review-rating" style={{ marginBottom: '8px' }}>
                {renderStars(review.rating)} ({review.rating}/5)
            </div>
            <p className="review-comment" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{review.comment}</p>
        </div>
    );
};

interface ReviewListProps {
    reviews: Review[];
    currentUserId: string | null;
    onReviewDeleted: (reviewId: string) => void;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews: initialReviews, currentUserId, onReviewDeleted }) => {
    const [sortBy, setSortBy] = useState<string>('createdAt_desc');
    const [filterRating, setFilterRating] = useState<number>(0);

    const sortedAndFilteredReviews = useMemo(() => {
        let tempReviews = [...initialReviews];

        if (filterRating > 0) {
            tempReviews = tempReviews.filter(r => r.rating === filterRating);
        }

        switch (sortBy) {
            case 'createdAt_asc':
                tempReviews.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                break;
            case 'rating_desc':
                tempReviews.sort((a, b) => {
                    if (b.rating !== a.rating) {
                        return b.rating - a.rating;
                    }
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                });
                break;
            case 'rating_asc':
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

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSortBy(e.target.value);
    };

    const handleRatingFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterRating(parseInt(e.target.value, 10));
    };

    const hasAnyReviewsInitially = initialReviews && initialReviews.length > 0;

    return (
        <div className="review-list-container">
            {hasAnyReviewsInitially ? (
                <div className="review-controls" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div>
                        <label htmlFor="sort-reviews" style={{ marginRight: '5px' }}>Sorteaza dupa:</label>
                        <select id="sort-reviews" value={sortBy} onChange={handleSortChange}>
                            <option value="createdAt_desc">Cele mai noi</option>
                            <option value="createdAt_asc">Cele mai vechi</option>
                            <option value="rating_desc">Rating (Mare {'>'} Mic)</option>
                            <option value="rating_asc">Rating (Mic {'>'} Mare)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-rating" style={{ marginRight: '5px' }}>Filtreaza dupa nota:</label>
                        <select id="filter-rating" value={filterRating} onChange={handleRatingFilterChange}>
                            <option value="0">Toate notele</option>
                            <option value="5">Doar 5 stele</option>
                            <option value="4">Doar 4 stele</option>
                            <option value="3">Doar 3 stele</option>
                            <option value="2">Doar 2 stele</option>
                            <option value="1">Doar 1 stea</option>
                        </select>
                    </div>
                </div>) : (
                <p>Nu exista recenzii pentru acest apartament inca.</p>
            )}
            {hasAnyReviewsInitially && sortedAndFilteredReviews.length === 0 && filterRating > 0 && (
                <p>Nu exista recenzii care sa corespunda notei selectate.</p>
            )}

            {hasAnyReviewsInitially && sortedAndFilteredReviews.length > 0 && (
                sortedAndFilteredReviews.map(review => (
                    <ReviewItem
                        key={review._id}
                        review={review}
                        currentUserId={currentUserId}
                        onReviewDeleted={onReviewDeleted} />
                ))
            )}
        </div>
    );
};

export default ReviewList;