const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const authenticateToken = require('../middleware/authenticateToken');


function createApartmentsRoutes(apartmentsCollection, reservationHistoryCollection, usersCollection, notificationService) {

    router.get('/', async (req, res) => {
        const result = await apartmentsCollection.find().toArray();
        res.send(result);
    });

    router.get('/rentals/:apartmentId/history', authenticateToken, async (req, res) => {

        try {
            console.log("Request to get rental history for apartment:", req.params.apartmentId);

            const { apartmentId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Pas Optional, dar Recomandat: Verifica daca utilizatorul curent este proprietarul apartamentului
            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            console.log("Apartment found:", apartment);
            if (!apartment) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }

            // req.user._id ar trebui sa fie setat de authMiddleware
            if (apartment.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Neautorizat sa accesati istoricul chiriilor pentru acest apartament." });
            }

            const query = { apartament: new ObjectId(apartmentId) };

            const totalRentals = await reservationHistoryCollection.countDocuments(query);
            console.log("Total rentals found:", totalRentals);
            if (totalRentals === 0) {
                return res.json({
                    rentals: [],
                    currentPage: 1,
                    totalPages: 0,
                    totalRentals: 0
                });
            }

            const rentals = await reservationHistoryCollection.find(query)
                .sort({ startDate: -1 }) // Sorteaza descrescator dupa data de inceput
                .skip(skip)
                .limit(limit)
                // .populate('tenant._id', 'name email') // Daca tenant._id este ObjectId ref la User
                // Sau doar .select() daca tenant este subdocument
                .toArray(); // Foloseste .lean() pentru performanta cand nu modifici documentele

            const totalPages = Math.ceil(totalRentals / limit);

            res.json({
                rentals,
                currentPage: page,
                totalPages,
                totalRentals
            });

        } catch (error) {
            console.error('Eroare la preluarea istoricului chiriei:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    router.get('/by-id/:id', async (req, res) => {
        const id = req.params.id;
        const query = { ownerId: new ObjectId(id) };
        const result = await apartmentsCollection.find(query).toArray();
        res.send(result);

    });

    router.get('/:id', async (req, res) => {
        // folosim o agregare de tio lookup pentru a extrage informatii despre proprietarul unui apartament
        const id = req.params.id; // id-ul ownerului
        try {
            const apartmentOwner = await apartmentsCollection.aggregate([
                { $match: { _id: new ObjectId(id) } },
                {
                    $lookup: {
                        from: "users", // asigura-te ca numele colectiei de utilizatori este corect
                        localField: "ownerId", // presupunem ca ai stocat id-ul proprietarului aici
                        foreignField: "_id",
                        as: "ownerInformation"
                    }
                },
                { $unwind: "$ownerInformation" } // presupunand ca fiecare apartament are un singur proprietar
            ]).toArray();

            if (!apartmentOwner || apartmentOwner.length === 0) {
                return res.status(404).json({ message: 'Apartamentul nu a fost gasit' });
            }
            res.status(200).json(apartmentOwner[0]);
        } catch (error) {
            console.error('Eroare la preluarea apartamentului:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    router.get('/number-of-rooms/:id', async (req, res) => {
        const apartmentId = req.params.id;
        const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
        if (!apartment) {
            return res.status(404).send('Apartamentul nu a fost gasit');
        }
        const numberOfRooms = apartment.numberOfRooms;
        const numberOfRooms_busy = apartment.numberOfRooms_busy;
        res.send({ numberOfRooms, numberOfRooms_busy });
    });

    router.get('/nearest_checkout/:apartment_id', async (req, res) => {
        const apartmentId = req.params.apartment_id;
        const n = Math.max(1, parseInt(req.query.n, 10) || 10);

        try {
            // 1) Ia primele n rezervari active pentru apartament, sortate dupa checkOut
            const rents = await reservationHistoryCollection
                .find({
                    apartament: new ObjectId(apartmentId),
                    isActive: true,
                    checkOut: { $exists: true }
                })
                .sort({ checkOut: 1 })
                .limit(n)
                .toArray();

            // 2) Extrage TOtI client IDs (cu duplicate), in ordine
            const clientIds = rents.map(r => r.client.toString());

            // 3) Gaseste user-ii unici ca sa nu faci prea multe query-uri
            const uniqueIds = [...new Set(clientIds)].map(id => new ObjectId(id));
            const usersArray = await usersCollection
                .find({ _id: { $in: uniqueIds } })
                .project({ fullName: 1 })   // luam doar ce ne trebuie
                .toArray();

            // 4) Construieste un map de lookup { userId => userDoc }
            const userMap = new Map(
                usersArray.map(u => [u._id.toString(), u])
            );

            // 5) Reconstruieste raspunsul in ordinea din rents, pastrand duplicatele
            const result = rents.map(r => {
                const user = userMap.get(r.client.toString()) || {};
                return {
                    _id: r.client.toString(),
                    fullName: user.fullName || 'Unknown',
                    numberOfRooms: r.numberOfRooms,
                    checkIn: r.checkIn,
                    checkOut: r.checkOut
                };
            });

            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Lista chiriasilor activi in apartament
    router.get('/active-renters/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const now = new Date();

        try {
            // gasim toate rezervarile active care includ ziua de azi
            const rents = await reservationHistoryCollection
                .find({
                    apartament: new ObjectId(apartmentId),
                    isActive: true,
                    checkIn: { $lte: now },
                    checkOut: { $gte: now }
                })
                .toArray();

            // ids unici
            const uniqueIds = [...new Set(rents.map(r => r.client.toString()))]
                .map(id => new ObjectId(id));

            // aducem numele
            const users = await usersCollection
                .find({ _id: { $in: uniqueIds } })
                .project({ fullName: 1 })
                .toArray();

            const mapUser = new Map(users.map(u => [u._id.toString(), u.fullName]));

            // reconstruim raspunsul in ordinea in care apar users (dupa id unic)
            const result = Array.from(mapUser.entries()).map(([id, fullName]) => ({
                _id: id,
                fullName
            }));

            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    }
    );

    // Anuleaza o rezervare (firma user-ului)
    router.post('/cancel-rent/:rentId', authenticateToken, async (req, res) => {
        const { rentId } = req.params;
        const userId = req.user._id;

        try {
            const result = await reservationHistoryCollection.updateOne(
                { _id: new ObjectId(rentId), client: new ObjectId(userId) },
                { $set: { isActive: false } }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ message: 'Rezervare negasita sau nu aveti permisiunea.' });
            }
            return res.json({ message: 'Chiria a fost anulata cu succes.' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare la anulare.' });
        }
    }
    );

    // Cerere firma curatenie
    router.post('/cleaning-request', authenticateToken, async (req, res) => {
        const userId = req.user._id;
        const { apartmentId } = req.body;
        try {
            const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            if (!user) {
                return res.status(404).json({ message: 'Utilizatorul nu a fost gasit.' });
            }

            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!apartment) {
                return res.status(404).json({ message: 'Apartamentul nu a fost gasit.' });
            }

            notificationService.createNotification(message = `Studentul ${user.fullName} a cerut curatenie pentru apartamentul ${apartment.location}`, receiver = apartment.ownerId);

            return res.json({ message: 'Cerere de curatatorie trimisa catre owner cu succes.' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare la trimiterea cererii.' });
        }
    }
    );


    return router;
}

module.exports = createApartmentsRoutes;