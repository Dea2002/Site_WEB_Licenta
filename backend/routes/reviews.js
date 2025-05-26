const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const authenticateToken = require('../middleware/authenticateToken');



function createReviewsRoutes(reviewsCollection, usersCollection, apartmentsCollection) {
    function safeGetObjectId(idString) {
        if (ObjectId.isValid(idString)) {
            return new ObjectId(idString);
        }
        console.warn(`ID invalid furnizat pentru conversie ObjectId: ${idString}`);
        return null;
    }

    async function calculateAndUpdateAverageRating(apartmentIdString) {
        if (!apartmentIdString) {
            console.warn('calculateAndUpdateAverageRatingLocal a fost apelat fara apartmentIdString');
            return;
        }

        const apartmentObjectId = safeGetObjectId(apartmentIdString);
        if (!apartmentObjectId) {
            console.error(`ID apartament invalid "${apartmentIdString}" in calculateAndUpdateAverageRatingLocal.`);
            return;
        }

        try {
            const stats = await reviewsCollection.aggregate([
                {
                    $match: { apartmentId: apartmentObjectId }
                },
                {
                    $group: {
                        _id: '$apartmentId',
                        numberOfReviews: { $sum: 1 },
                        averageRating: { $avg: '$rating' }
                    }
                }
            ]).toArray();

            let updateData;
            if (stats.length > 0) {
                updateData = {
                    averageRating: Math.round(stats[0].averageRating * 10) / 10, // Rotunjit la o zecimala
                    numberOfReviews: stats[0].numberOfReviews,
                };
            } else {
                // Daca nu mai sunt review-uri (ex: ultimul a fost sters sau nu au fost niciodata)
                updateData = {
                    averageRating: 0,
                    numberOfReviews: 0,
                };
            }

            await apartmentsCollection.updateOne(
                { _id: apartmentObjectId },
                {
                    $set: {
                        ...updateData,
                        updatedAt: new Date() // Actualizam si data modificarii apartamentului
                    }
                }
            );
            // console.log(`Rating actualizat pentru apartamentul ${apartmentIdString}:`, updateData);

        } catch (err) {
            console.error(`Eroare la actualizarea rating-ului mediu pentru apartamentul ${apartmentIdString}:`, err);
        }
    }

    // GET / - Preia toate review-urile (ex: pentru admin)
    // Necesita autentificare si, posibil, verificare de rol admin
    router.get('/', authenticateToken, async (req, res) => {
        // TODO: Implementeaza logica pentru admini, cu paginare etc.
        // Considera cine ar trebui sa aiba acces la toate review-urile.
        // Pentru moment, returnam un mesaj placeholder.
        // if (!req.user.isAdmin) { // Exemplu de verificare rol
        //     return res.status(403).json({ message: 'Acces neautorizat.' });
        // }
        try {
            const { page: queryPage, limit: queryLimit, sort } = req.query;
            const page = Number(queryPage) || 1;
            const limit = Number(queryLimit) || 20; // Default 20
            const skip = (page - 1) * limit;

            let mongoSort = { createdAt: -1 };
            if (sort) {
                const [field, order] = sort.split('_');
                const sortOrder = order === 'asc' ? 1 : -1;
                if (['createdAt', 'rating', 'apartmentId', 'userId'].includes(field)) {
                    mongoSort = { [field]: sortOrder };
                }
            }

            const allReviews = await reviewsCollection.find({}).sort(mongoSort).skip(skip).limit(limit).toArray();
            const totalReviews = await reviewsCollection.countDocuments({});

            return res.json({
                reviews: allReviews,
                page,
                pages: Math.ceil(totalReviews / limit),
                totalReviews
            });
        } catch (err) {
            console.error('Eroare la preluarea tuturor review-urilor:', err);
            return res.status(500).json({ message: 'Eroare interna la server.' });
        }
    });

    // GET /apartment/:apartmentId - Preia toate review-urile pentru un apartament
    // Am eliminat authenticateToken de aici, de obicei review-urile sunt publice
    router.get('/apartment/:apartmentId', async (req, res) => {
        const { apartmentId } = req.params;
        const { sort, rating: filterRating, page: queryPage, limit: queryLimit } = req.query;

        const apartmentObjectId = safeGetObjectId(apartmentId);
        if (!apartmentObjectId) {
            return res.status(400).json({ message: 'ID apartament invalid.' });
        }

        try {
            let mongoFilter = { apartmentId: apartmentObjectId };
            if (filterRating && Number(filterRating) >= 1 && Number(filterRating) <= 5) {
                mongoFilter.rating = Number(filterRating);
            }

            let mongoSort = { createdAt: -1 };
            if (sort) {
                const [field, order] = sort.split('_');
                const sortOrder = order === 'asc' ? 1 : -1;
                if (field === 'createdAt' || field === 'rating') {
                    mongoSort = { [field]: sortOrder };
                    if (field === 'rating') {
                        mongoSort.createdAt = -1;
                    }
                }
            }

            const page = Number(queryPage) || 1;
            const limit = Number(queryLimit) || 10;
            const skip = (page - 1) * limit;

            const reviews = await reviewsCollection
                .find(mongoFilter)
                .sort(mongoSort)
                .skip(skip)
                .limit(limit)
                .toArray();

            const totalReviews = await reviewsCollection.countDocuments(mongoFilter);

            return res.json({
                reviews,
                page,
                pages: Math.ceil(totalReviews / limit),
                totalReviews
            });

        } catch (err) {
            console.error('Eroare la preluarea review-urilor:', err);
            return res.status(500).json({ message: 'Eroare interna la server.' });
        }
    });

    // Ruta ta existenta pentru /clear ramane
    router.delete('/clear', async (req, res) => {
        const { confirmation } = req.body;
        if (confirmation !== 'CONFIRM') {
            return res
                .status(400)
                .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
        }
        try {
            // Inainte de a sterge toate, ar trebui sa iteram si sa actualizam rating-urile pentru fiecare apartament afectat.
            // Sau, mai simplu, daca aceasta e o operatiune rara de admin, poti avea un script separat
            // pentru recalcularea tuturor rating-urilor dupa o astfel de operatiune.
            // Pentru moment, doar stergem.
            const allReviews = await reviewsCollection.find({}).project({ apartmentId: 1 }).toArray();

            const result = await reviewsCollection.deleteMany({});

            // Dupa ce ai sters, ar trebui sa actualizezi rating-urile apartamentelor.
            // Acest lucru poate fi costisitor daca sunt multe apartamente.
            if (result.deletedCount > 0) {
                const uniqueApartmentIds = [...new Set(allReviews.map(r => r.apartmentId.toString()))];
                for (const aptId of uniqueApartmentIds) {
                    await calculateAndUpdateAverageRating(aptId);
                }
            }

            return res.json({
                message: `Au fost sterse ${result.deletedCount} documente. Rating-urile au fost actualizate.`,
            });
        } catch (err) {
            console.error('Eroare la stergerea documentelor:', err);
            return res
                .status(500)
                .json({ message: 'Eroare interna la server.' });
        }
    });

    // DELETE /:reviewId - Sterge un review specific
    // Necesita autentificare. Ideal, doar autorul review-ului sau un admin ar trebui sa poata sterge.
    router.delete('/:reviewId', authenticateToken, async (req, res) => {
        const { reviewId } = req.params;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Autentificare necesara' });
        }
        const currentUserId = req.user._id; // ObjectId

        const reviewObjectId = safeGetObjectId(reviewId);
        if (!reviewObjectId) {
            return res.status(400).json({ message: 'ID review invalid.' });
        }

        try {
            const reviewToDelete = await reviewsCollection.findOne({ _id: reviewObjectId });

            if (!reviewToDelete) {
                return res.status(404).json({ message: 'Recenzia nu a fost gasita.' });
            }

            // Verifica daca utilizatorul curent este autorul review-ului SAU este admin
            // Presupunem ca req.user are o proprietate isAdmin: boolean
            const isAuthor = reviewToDelete.userId.equals(currentUserId);
            const isAdmin = req.user.isAdmin === true;

            if (!isAuthor && !isAdmin) {
                return res.status(403).json({ message: 'Nu aveti permisiunea sa stergeti aceasta recenzie.' });
            }

            const result = await reviewsCollection.deleteOne({ _id: reviewObjectId });

            if (result.deletedCount === 1) {
                // Dupa stergere, recalculeaza rating-ul mediu
                await calculateAndUpdateAverageRating(reviewToDelete.apartmentId.toString());
                return res.json({ message: 'Recenzia a fost stearsa cu succes.' });
            } else {
                return res.status(404).json({ message: 'Recenzia nu a fost gasita sau nu a putut fi stearsa.' });
            }
        } catch (err) {
            console.error('Eroare la stergerea review-ului:', err);
            return res.status(500).json({ message: 'Eroare interna la server.' });
        }
    });

    // POST / - Creeaza un nou review
    // Necesita autentificare
    router.post('/', authenticateToken, async (req, res) => {
        const { apartmentId, rating, comment } = req.body;

        if (!req.user || !req.user._id) { // req.user._id ar trebui sa fie setat de authenticateToken
            return res.status(401).json({ message: 'Autentificare necesara' });
        }
        const userId = new ObjectId(req.user._id); // Acesta ar trebui sa fie deja un ObjectId daca middleware-ul face asta

        if (!apartmentId || !rating || !comment) {
            return res.status(400).json({ message: 'Campurile apartmentId, rating si comment sunt obligatorii.' });
        }

        const apartmentObjectId = safeGetObjectId(apartmentId);
        if (!apartmentObjectId) {
            return res.status(400).json({ message: 'ID apartament invalid.' });
        }

        try {
            // 1. Verifica daca apartamentul exista
            const apartmentExists = await apartmentsCollection.findOne({ _id: apartmentObjectId });
            if (!apartmentExists) {
                return res.status(404).json({ message: 'Apartamentul nu a fost gasit' });
            }

            // 2. (Optional dar recomandat) Verifica eligibilitatea utilizatorului
            //    Exemplu simplist - de adaptat la logica ta de rezervari
            //    const bookingsCollection = getDB().collection('bookings'); // Daca ai getDB()
            //    const existingBooking = await bookingsCollection.findOne({ 
            //        userId: userId, 
            //        apartmentId: apartmentObjectId, 
            //        status: 'completed' 
            //    });
            //    if (!existingBooking) {
            //        return res.status(403).json({ message: 'Nu sunteti eligibil sa lasati un review.' });
            //    }

            // 3. Verifica daca utilizatorul a lasat deja un review pentru acest apartament
            const existingReview = await reviewsCollection.findOne({
                apartmentId: apartmentObjectId,
                userId: userId // userId este deja ObjectId
            });
            if (existingReview) {
                return res.status(400).json({ message: 'Ati lasat deja o recenzie pentru acest apartament' });
            }

            const user = await usersCollection.findOne({ _id: userId }, { projection: { fullName: 1 } });
            if (!user) {
                return res.status(404).json({ message: 'Utilizatorul nu a fost gasit' });
            }

            const newReview = {
                apartmentId: apartmentObjectId,
                userId: userId,
                userName: user.fullName || 'Utilizator Anonim', // Fallback
                rating: Number(rating),
                comment: comment.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const insertResult = await reviewsCollection.insertOne(newReview);

            if (insertResult.insertedId) {
                await calculateAndUpdateAverageRating(apartmentId.toString()); // Paseaza string ID

                const createdReview = await reviewsCollection.findOne({ _id: insertResult.insertedId });
                return res.status(201).json(createdReview);
            } else {
                return res.status(500).json({ message: 'Nu s-a putut crea recenzia' });
            }

        } catch (err) {
            console.error('Eroare la crearea review-ului:', err);
            if (err.code === 11000) { // Cod de eroare pentru duplicat (din indexul unic)
                return res.status(400).json({ message: 'Ati lasat deja o recenzie pentru acest apartament (eroare duplicat).' });
            }
            return res.status(500).json({ message: 'Eroare interna la server.' });
        }
    });

    return router;

}

module.exports = createReviewsRoutes;