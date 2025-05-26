const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const authenticateToken = require('../middleware/authenticateToken');

function createReviewsRoutes(reviewsCollection, usersCollection, apartmentsCollection) {
    // get all reviews
    router.get('/', authenticateToken, async (req, res) => { });

    // get reivews for a specific apartment
    router.get('/apartment/:apartmentId', authenticateToken, async (req, res) => { });

    // delete all reviews
    router.delete('/clear', async (req, res) => {
        const { confirmation } = req.body;
        if (confirmation !== 'CONFIRM') {
            return res
                .status(400)
                .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
        }
        try {
            const result = await reviewsCollection.deleteMany({});
            return res.json({
                message: `Au fost sterse ${result.deletedCount} documente.`,
            });
        } catch (err) {
            console.error('Eroare la stergerea documentelor:', err);
            return res
                .status(500)
                .json({ message: 'Eroare interna la server.' });
        }
    });

    // delete a specific review
    router.delete('/:reviewId', authenticateToken, async (req, res) => { });
    return router;
}

module.exports = createReviewsRoutes;