import React, { useState, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../AuthContext';
import { Review } from '../types'; // Asigura-te ca tipul e corect

interface ReviewFormProps {
    apartmentId: string;
    onReviewSubmitted: (review: Review) => void;
    onCancel: () => void;
}

const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void }> = ({ rating, onRatingChange }) => {
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={star <= rating ? 'star-filled' : 'star-empty'}
                    onClick={() => onRatingChange(star)}
                    style={{ cursor: 'pointer', fontSize: '2em', color: star <= rating ? '#FFD700' : '#ccc' }}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && onRatingChange(star)}
                    aria-label={`${star} stele`}
                >
                    ★
                </span>
            ))}
        </div>
    );
};


const ReviewForm: React.FC<ReviewFormProps> = ({ apartmentId, onReviewSubmitted, onCancel }) => {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const { token } = useContext(AuthContext);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError("Va rugam acordati o nota (1-5 stele).");
            return;
        }
        if (!comment.trim()) {
            setError("Va rugam scrieti un comentariu.");
            return;
        }
        setError("");
        setIsSubmitting(true);

        try {
            const response = await api.post<Review>('/reviews', {
                apartmentId,
                // userId, // Trimite userId daca backend-ul o cere explicit, altfel se bazeaza pe token
                rating,
                comment,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onReviewSubmitted(response.data); // Paseaza review-ul nou creat componentei parinte
            // Reset form
            setRating(0);
            setComment("");
        } catch (err: any) {
            console.error("Eroare la trimiterea review-ului:", err);
            setError(err.response?.data?.message || "Nu s-a putut trimite review-ul.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="review-form">
            <h3>Scrie o Recenzie</h3>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label>Nota ta:</label>
                <StarRating rating={rating} onRatingChange={setRating} />
            </div>
            <div className="form-group">
                <label htmlFor="comment">Comentariul tau:</label>
                <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={5}
                    required
                    placeholder="Spune-ne parerea ta despre sederea la acest apartament..."
                />
            </div>
            <div className="form-actions">
                <button type="submit" disabled={isSubmitting} className="button-primary">
                    {isSubmitting ? "Se trimite..." : "Trimite Recenzia"}
                </button>
                <button type="button" onClick={onCancel} className="button-secondary" disabled={isSubmitting}>
                    Anuleaza
                </button>
            </div>
        </form>
    );
};

export default ReviewForm;