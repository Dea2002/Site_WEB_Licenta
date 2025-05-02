const express = require('express');
const router = express.Router();

module.exports = (usersCollection, apartmentsCollection) => {
    const authenticateToken = require('../middleware/authenticateToken');
    const verifyAdmin = require('../middleware/verifyAdmin');

    // Obtine statisticile adminului
    router.get('/stats', authenticateToken, verifyAdmin, async (req, res) => {
        try {
            const totalApartments = await apartmentsCollection.countDocuments();
            const totalUsers = await usersCollection.countDocuments();
            const totalOwners = await usersCollection.countDocuments({ role: 'proprietar' });

            res.status(200).json({
                totalApartments,
                totalUsers,
                totalOwners,
            });
        } catch (error) {
            console.error('Eroare la obtinerea statisticilor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Obtine toti utilizatorii
    router.get('/users', authenticateToken, verifyAdmin, async (req, res) => {
        try {
            const users = await usersCollection.find().toArray();
            res.status(200).json(users);
        } catch (error) {
            console.error('Eroare la obtinerea utilizatorilor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Obtine toate apartamentele
    router.get('/apartments', authenticateToken, verifyAdmin, async (req, res) => {
        try {
            const apartments = await apartmentsCollection.aggregate([
                {
                    $lookup: {
                        from: 'users',           // Numele colectiei de utilizatori
                        localField: 'ownerId',    // Campul din apartament
                        foreignField: '_id',      // Campul din colectia de utilizatori
                        as: 'ownerInformation'           // Numele array-ului rezultant
                    }
                }, { $unwind: "$ownerInformation" }
            ]).toArray();

            res.status(200).json(apartments);
        } catch (error) {
            console.error('Eroare la obtinerea apartamentelor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Obtine toti proprietarii
    router.get('/owners', authenticateToken, verifyAdmin, async (req, res) => {
        try {
            const owners = await usersCollection.find({ role: 'proprietar' }).toArray();
            res.status(200).json(owners);
        } catch (error) {
            console.error('Eroare la obtinerea proprietarilor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    return router;
};