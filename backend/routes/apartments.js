const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const authenticateToken = require('../middleware/authenticateToken');
const { bucket, getBucket } = require('../config/firebaseAdmin');
const { check } = require('express-validator');

function createApartmentsRoutes(apartmentsCollection, reservationHistoryCollection, usersCollection, notificationService) {

    router.get('/', async (req, res) => {
        const result = await apartmentsCollection.find().toArray();
        res.send(result);
    });

    router.get('/rentals/:apartmentId/history', authenticateToken, async (req, res) => {
        try {
            const { apartmentId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!apartment) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }
            if (apartment.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Neautorizat sa accesati istoricul." });
            }

            const currentDate = new Date();

            const query = {
                apartament: new ObjectId(apartmentId),
                $or: [
                    { isActive: false },
                    { checkOut: { $lt: currentDate } }
                ]
            };

            const totalRentals = await reservationHistoryCollection.countDocuments(query);

            if (totalRentals === 0) {
                return res.json({
                    rentals: [],
                    currentPage: 1,
                    totalPages: 0,
                    totalRentals: 0
                });
            }

            const rentals = await reservationHistoryCollection.find(query)
                .sort({ checkOut: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            const totalPages = Math.ceil(totalRentals / limit);

            const processedRentals = rentals.map(rental => {
                let derivedStatus = "Necunoscut";

                if (!rental.isActive) {
                    derivedStatus = "Anulat";
                } else {
                    derivedStatus = "Finalizat";
                }
                return { ...rental, derivedStatus };
            });

            res.json({
                rentals: processedRentals,
                currentPage: page,
                totalPages,
                totalRentals
            });

        } catch (error) {
            console.error('Eroare la preluarea istoricului chiriei:', error);
            res.status(500).json({ message: 'Eroare interna a serverului la preluarea istoricului.' });
        }
    });


    router.get('/rentals/active-tenant-faculties-summary', async (req, res) => {
        try {
            const currentDate = new Date();
            const query = {
                isActive: true,
                checkIn: { $lte: currentDate },
                checkOut: { $gte: currentDate },
                "clientData.faculty": { $exists: true, $ne: null, $ne: "" }
            };
            const activeRentals = await reservationHistoryCollection.find(query)
                .project({
                    apartament: 1,
                    "clientData.faculty": 1,
                    _id: 0
                })
                .toArray();
            const facultySummaryMap = new Map();

            activeRentals.forEach(rental => {
                const apartmentIdStr = rental.apartament.toString();
                const facultyName = rental.clientData.faculty;

                if (facultyName) {
                    if (!facultySummaryMap.has(apartmentIdStr)) {
                        facultySummaryMap.set(apartmentIdStr, new Set());
                    }
                    facultySummaryMap.get(apartmentIdStr).add(facultyName);
                }
            });
            const result = [];
            facultySummaryMap.forEach((faculties, aptId) => {
                faculties.forEach(faculty => {
                    result.push({ apartmentId: aptId, faculty: faculty });
                });
            });

            res.json(result);

        } catch (error) {
            console.error("Eroare la preluarea sumarului facultatilor chiriasilor activi:", error);
            res.status(500).json({ message: "Eroare server." });
        }
    });

    router.get('/rentals/:apartmentId/current-and-upcoming', authenticateToken, async (req, res) => {
        try {
            const { apartmentId } = req.params;

            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!apartment) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }
            if (apartment.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Neautorizat." });
            }

            const currentDate = new Date();

            const query = {
                apartament: new ObjectId(apartmentId),
                isActive: true,
                checkOut: { $gte: currentDate }
            };

            const rentals = await reservationHistoryCollection.find(query)
                .sort({ checkIn: 1 })
                .toArray();

            const processedRentals = rentals.map(rental => {
                let derivedStatus = "Necunoscut";
                if (new Date(rental.checkIn) <= currentDate && new Date(rental.checkOut) >= currentDate) {
                    derivedStatus = "Activ";
                } else if (new Date(rental.checkIn) > currentDate) {
                    derivedStatus = "Viitor";
                }
                return { ...rental, derivedStatus };
            });


            res.json(processedRentals);

        } catch (error) {
            console.error('Eroare la preluarea chiriilor curente si viitoare:', error);
            res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    });

    router.patch('/rentals/:rentalId/cancel-by-owner', authenticateToken, async (req, res) => {
        const { rentalId } = req.params;
        const userId = req.user._id;

        try {
            const rental = await reservationHistoryCollection.findOne({ _id: new ObjectId(rentalId) });
            if (!rental) {
                return res.status(404).json({ message: "Chiria nu a fost gasita." });
            }
            if (rental.apartament.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Neautorizat. Nu sunteti proprietarul acestui apartament." });
            }

            const result = await reservationHistoryCollection.updateOne(
                { _id: new ObjectId(rentalId) },
                { $set: { isActive: false } }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({ message: "Chiria nu a putut fi anulata." });
            }

            await conversationsCollection.updateMany(
                {
                    apartment: new ObjectId(rental.apartament._id),
                    type: 'group',
                    participants: rental.client.toString(),
                },
                { $pull: { participants: rental.client.toString() } }
            );

            res.json({ message: "Chiria a fost anulata cu succes." });

        } catch (error) {
            console.error('Eroare la anularea chiriei:', error);
            res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    });

    router.get('/by-id/:id', async (req, res) => {
        const id = req.params.id;
        const query = { ownerId: new ObjectId(id) };
        const result = await apartmentsCollection.find(query).toArray();
        res.send(result);

    });

    router.put('/:apartmentId/add-images', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const { newImageUrlsToAdd } = req.body;
        const userId = req.user._id;

        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: "ID apartament invalid." });
        }
        if (!newImageUrlsToAdd || !Array.isArray(newImageUrlsToAdd) || newImageUrlsToAdd.some(url => typeof url !== 'string')) {
            return res.status(400).json({ message: "Lista de URL-uri noi este invalida sau lipseste. Trebuie sa fie un array de string-uri." });
        }
        if (newImageUrlsToAdd.length === 0) {
            const existingApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!existingApartment) return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            return res.status(200).json(existingApartment); // Returneaza apartamentul neschimbat
        }

        try {

            // 2. Verifica existenta apartamentului si proprietarul
            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });

            if (!apartment) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }

            if (apartment.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Neautorizat. Nu sunteti proprietarul acestui apartament." });
            }

            // 3. Actualizeaza documentul in MongoDB
            const updateResult = await apartmentsCollection.updateOne(
                { _id: new ObjectId(apartmentId) },
                { $addToSet: { images: { $each: newImageUrlsToAdd } } }
            );

            if (updateResult.matchedCount === 0) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit pentru actualizare (match count)." });
            }

            // 4. Preluam si returnam documentul actualizat pentru a fi consistent cu frontend-ul
            const updatedApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!updatedApartment) {
                return res.status(404).json({ message: "Apartamentul actualizat nu a putut fi regasit." });
            }

            res.status(200).json(updatedApartment);

        } catch (error) {
            console.error("Eroare la adaugarea imaginilor in MongoDB pentru apartamentul", apartmentId, ":", error);
            res.status(500).json({ message: "Eroare server la adaugarea imaginilor." });
        }
    });

    router.put('/:apartmentId/remove-image-reference', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const { imageUrlToDelete } = req.body;
        const userId = req.user._id;

        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: "ID apartament invalid." });
        }
        if (!imageUrlToDelete) {
            return res.status(400).json({ message: "URL-ul imaginii este necesar." });
        }

        try {
            const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            if (!apartment) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }
            if (apartment.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Neautorizat." });
            }

            const result = await apartmentsCollection.updateOne(
                { _id: new ObjectId(apartmentId) },
                { $pull: { images: imageUrlToDelete } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit pentru actualizare (MongoDB)." });
            }

            const updatedApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            res.status(200).json({ message: "Referinta imaginii a fost stearsa.", apartment: updatedApartment });

        } catch (error) {
            console.error("Eroare la stergerea referintei imaginii din MongoDB:", error);
            res.status(500).json({ message: "Eroare server la actualizarea listei de imagini." });
        }
    });

    router.put('/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const updates = req.body;
        const userId = req.user._id;

        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: "ID apartament invalid." });
        }

        try {
            const apartmentToUpdate = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });

            if (!apartmentToUpdate) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }

            if (apartmentToUpdate.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Neautorizat. Nu sunteti proprietarul acestui apartament." });
            }

            const updatePayload = {};
            const allowedRootFields = [
                'price', 'renovationYear', 'images',
            ];
            const allowedNestedObjects = ['discounts', 'utilities', 'facilities'];

            for (const key in updates) {
                if (allowedRootFields.includes(key)) {
                    if (['price', 'renovationYear'].includes(key)) {
                        updatePayload[key] = (updates[key] === null || updates[key] === undefined) ? null : Number(updates[key]);
                    } else {
                        updatePayload[key] = updates[key];
                    }
                } else if (allowedNestedObjects.includes(key) && typeof updates[key] === 'object' && updates[key] !== null) {
                    updatePayload[key] = {};

                    if (key === 'discounts') {
                        const d = updates.discounts;
                        updatePayload.discounts = {
                            discount1: (d.discount1 === null || d.discount1 === undefined) ? null : Number(d.discount1),
                            discount2: (d.discount2 === null || d.discount2 === undefined) ? null : Number(d.discount2),
                            discount3: (d.discount3 === null || d.discount3 === undefined) ? null : Number(d.discount3),
                        };
                    } else if (key === 'utilities') {
                        const u = updates.utilities;
                        updatePayload.utilities = {
                            internetPrice: (u.internetPrice === null || u.internetPrice === undefined) ? null : Number(u.internetPrice),
                            TVPrice: (u.TVPrice === null || u.TVPrice === undefined) ? null : Number(u.TVPrice),
                            waterPrice: (u.waterPrice === null || u.waterPrice === undefined) ? null : Number(u.waterPrice),
                            gasPrice: (u.gasPrice === null || u.gasPrice === undefined) ? null : Number(u.gasPrice),
                            electricityPrice: (u.electricityPrice === null || u.electricityPrice === undefined) ? null : Number(u.electricityPrice),
                        };
                    } else if (key === 'facilities') {
                        const f = updates.facilities;
                        const validFacilitiesPayload = {};
                        const allowedFacilityKeys = [
                            'wifi', 'parking', 'airConditioning', 'tvCable', 'laundryMachine',
                            'fullKitchen', 'balcony', 'petFriendly', 'pool', 'gym', 'elevator',
                            'terrace', 'bikeStorage', 'storageRoom', 'rooftop', 'fireAlarm',
                            'smokeDetector', 'intercom', 'videoSurveillance', 'soundproofing',
                            'underfloorHeating'
                        ];
                        for (const facilityKey in f) {
                            if (allowedFacilityKeys.includes(facilityKey) && typeof f[facilityKey] === 'boolean') {
                                validFacilitiesPayload[facilityKey] = f[facilityKey];
                            }
                        }
                        updatePayload.facilities = validFacilitiesPayload;
                    }
                }
            }

            if (Object.keys(updatePayload).length === 0) {
                return res.status(400).json({ message: "Niciun camp valid de actualizat furnizat." });
            }

            const result = await apartmentsCollection.updateOne(
                { _id: new ObjectId(apartmentId) },
                { $set: updatePayload }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit pentru actualizare (match)." });
            }

            if (result.modifiedCount === 0 && result.matchedCount === 1) {
                const notModifiedApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
                return res.status(200).json(notModifiedApartment);
            }

            const updatedApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            res.status(200).json(updatedApartment);

        } catch (error) {
            console.error("Eroare la actualizarea apartamentului:", error);
            res.status(500).json({ message: "Eroare server la actualizarea apartamentului." });
        }
    });

    router.get('/:id', async (req, res) => {
        const id = req.params.id; // id-ul ownerului
        try {
            const apartmentOwner = await apartmentsCollection.aggregate([
                { $match: { _id: new ObjectId(id) } },
                {
                    $lookup: {
                        from: "users",
                        localField: "ownerId",
                        foreignField: "_id",
                        as: "ownerInformation"
                    }
                },
                { $unwind: "$ownerInformation" }
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
            const rents = await reservationHistoryCollection
                .find({
                    apartament: new ObjectId(apartmentId),
                    isActive: true,
                    checkOut: { $exists: true }
                })
                .sort({ checkOut: 1 })
                .limit(n)
                .toArray();

            // 2) Extrage toti client IDs (cu duplicate), in ordine
            const clientIds = rents.map(r => r.client.toString());

            // 3) Gaseste user-ii unici ca sa nu faci prea multe query-uri
            const uniqueIds = [...new Set(clientIds)].map(id => new ObjectId(id));
            const usersArray = await usersCollection
                .find({ _id: { $in: uniqueIds } })
                .project({ fullName: 1, faculty: 1 })
                .toArray();

            // 4) Construieste un map de lookup { userId => userDoc }
            const userMap = new Map(
                usersArray.map(u => [u._id.toString(), u])
            );

            // 5) Reconstruieste raspunsul in ordinea din rents, pastrand duplicatele
            const result = rents.map(r => {
                const user = userMap.get(r.client.toString()) || {};
                return {
                    _id: r._id.toString(),
                    fullName: user.fullName || 'Unknown',
                    numberOfRooms: r.numberOfRooms,
                    checkIn: r.checkIn,
                    checkOut: r.checkOut,
                    faculty: user.faculty
                };
            });

            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    router.get('/active-renters/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const now = new Date();

        try {
            const rents = await reservationHistoryCollection
                .find({
                    apartament: new ObjectId(apartmentId),
                    isActive: true,
                    checkIn: { $lte: now },
                    checkOut: { $gte: now }
                })
                .toArray();

            const uniqueIds = [...new Set(rents.map(r => r.client.toString()))]
                .map(id => new ObjectId(id));

            const users = await usersCollection
                .find({ _id: { $in: uniqueIds } })
                .project({ fullName: 1 })
                .toArray();

            const mapUser = new Map(users.map(u => [u._id.toString(), u.fullName]));

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

            const rent = await reservationHistoryCollection.findOne({ _id: new ObjectId(rentId) });

            if (rent) {
                await conversationsCollection.updateMany(
                    {
                        apartment: rent.apartament.toString(),
                        type: 'group',
                        participants: rent.client.toString(),
                    },
                    { $pull: { participants: rent.client.toString() } }
                );
            }

            return res.json({ message: 'Chiria a fost anulata cu succes.' });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare la anulare.' });
        }
    }
    );

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


    router.delete('/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const userId = req.user._id;

        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: "ID apartament invalid." });
        }

        try {
            const bucket = getBucket();

            // 1. Gaseste apartamentul pentru a verifica proprietarul sI pentru a obtine lista de imagini
            const apartmentToDelete = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });

            if (!apartmentToDelete) {
                return res.status(404).json({ message: "Apartamentul nu a fost gasit." });
            }

            if (apartmentToDelete.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Neautorizat. Nu sunteti proprietarul acestui apartament." });
            }

            // 2. sterge imaginile asociate din Firebase Storage
            if (apartmentToDelete.images && apartmentToDelete.images.length > 0) {
                const deletePromises = apartmentToDelete.images.map(async (imageUrl) => {
                    try {
                        // Extrage calea fisierului din URL (aceeasi logica ca la stergerea individuala)
                        let filePathInFirebase;
                        const url = new URL(imageUrl);
                        const pathName = url.pathname;
                        const parts = pathName.split('/o/');
                        if (parts.length > 1) {
                            filePathInFirebase = decodeURIComponent(parts[1]);
                        } else {
                            const potentialPath = imageUrl.split(`${bucket.name}/`)[1]?.split('?')[0];
                            if (potentialPath) {
                                filePathInFirebase = decodeURIComponent(potentialPath);
                            } else {
                                console.warn(`Nu s-a putut extrage calea din URL-ul: ${imageUrl} pentru apartamentul ${apartmentId}. Imaginea nu va fi stearsa din Firebase.`);
                                return; // Treci la urmatoarea imagine daca nu se poate extrage calea
                            }
                        }

                        if (filePathInFirebase) {
                            await bucket.file(filePathInFirebase).delete();
                        }
                    } catch (storageError) {
                        if (storageError.code === 404) {
                            console.warn(`Imaginea la URL ${imageUrl} (cale: ${filePathInFirebase || 'necunoscuta'}) nu a fost gasita in Firebase Storage pentru apartamentul ${apartmentId}.`);
                        } else {
                            console.error(`Eroare la stergerea imaginii ${imageUrl} (cale: ${filePathInFirebase || 'necunoscuta'}) din Firebase pentru apartamentul ${apartmentId}:`, storageError);
                        }
                    }
                });

                const results = await Promise.allSettled(deletePromises);
                results.forEach(result => {
                    if (result.status === 'rejected') {
                        console.error("O operatiune de stergere a imaginii din Firebase a esuat:", result.reason);
                    }
                });
            } else {
                console.error(`Apartamentul ${apartmentId} nu are imagini asociate in Firebase de sters.`);
            }

            // 3. sterge documentul apartamentului din MongoDB
            const deleteResult = await apartmentsCollection.deleteOne({ _id: new ObjectId(apartmentId) });

            if (deleteResult.deletedCount === 0) {
                console.warn(`Apartamentul ${apartmentId} a fost gasit dar nu a putut fi sters din MongoDB.`);
                return res.status(500).json({ message: "Apartamentul a fost gasit dar nu a putut fi sters din baza de date." });
            }

            res.status(200).json({ message: "Apartamentul si imaginile asociate au fost sterse cu succes." });

        } catch (error) {
            console.error(`Eroare generala la stergerea apartamentului ${apartmentId}:`, error);
            res.status(500).json({ message: "Eroare server la stergerea apartamentului." });
        }
    });

    return router;
}

module.exports = createApartmentsRoutes;