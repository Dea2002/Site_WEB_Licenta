const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');


function createApartmentsRoutes(apartmentsCollection) {

    router.get('/', async (req, res) => {
        const result = await apartmentsCollection.find().toArray();
        res.send(result);
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


    return router;
}

module.exports = createApartmentsRoutes;