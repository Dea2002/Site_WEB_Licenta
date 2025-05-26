const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');
const jwt = require('jsonwebtoken');

function createUserRoutes(usersCollection, notificationService, markRequestsCollection, facultiesCollection, reservationHistoryCollection, apartmentsCollection, reservationRequestsCollection) {

    router.get('/current-rent/:userId', authenticateToken, async (req, res) => {
        const { userId } = req.params;
        const now = new Date();

        // if (req.user._id !== userId) {
        //     return res.status(403).json({ message: 'Acces interzis' });
        // }

        try {
            // 1) Gaseşte rezervarea activa curenta
            const currentRent = await reservationHistoryCollection.findOne({
                client: new ObjectId(userId),
                isActive: true,
                checkIn: { $lte: now },
                checkOut: { $gte: now }
            });

            if (!currentRent) {
                return res.json(null);
            }

            // 2) (Opţional) Ia şi detalii despre apartament
            const apartment = await apartmentsCollection.findOne({
                _id: currentRent.apartament
            }, {
                projection: {
                    location: 1,
                    price: 1,
                    image: 1,
                    numberOfRooms: 1,
                    ownerId: 1
                }
            });

            // 3) Trimite raspunsul
            return res.json({
                _id: currentRent._id,
                apartment: apartment || null,
                checkIn: currentRent.checkIn,
                checkOut: currentRent.checkOut,
                rooms: currentRent.numberOfRooms,
                createdAt: currentRent.createdAt
            });
        } catch (err) {
            console.error('Error fetching current rent:', err);
            return res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    }
    );

    router.get('/batch', async (req, res) => {
        const ids = String(req.query.ids).split(',').filter(ObjectId.isValid);
        const oids = ids.map(id => new ObjectId(id));
        const users = await usersCollection
            .find({ _id: { $in: oids } })
            .project({ fullName: 1 })
            .toArray();
        res.json(users);
    });

    router.patch('/edit_profile', authenticateToken, async (req, res) => {
        try {
            const userId = req.user._id; // id-ul utilizatorului din token
            const medieEdited = req.body.medieEdited;
            const updates = { ...req.body };
            const allowed = ['phoneNumber', 'numar_matricol', 'anUniversitar', 'medie'];
            const setFields = {};

            // get facultyId from the req.user.faculty name
            const facultyName = req.user.faculty;
            const faculty = await facultiesCollection.findOne({ fullName: facultyName });

            // hash parola daca a fost trimisa
            if (updates.password) {
                const salt = await bcrypt.genSalt(10);
                setFields.password = await bcrypt.hash(updates.password, salt);
            }

            // copiaza campurile permise
            allowed.forEach((field) => {
                if (updates[field] !== undefined) {
                    setFields[field] = updates[field];
                }
            });

            // ruleaza actualizarea
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: setFields }
            );
            // recupereaza documentul actualizat
            const updated = await usersCollection.findOne({ _id: new ObjectId(userId) });
            // creeaza un nou token pe baza datelor relevante
            const newToken = jwt.sign(updated, process.env.ACCESS_SECRET, { expiresIn: '1h' });

            // send notification to faculty about the new grade
            if (medieEdited == true) {
                notificationService.createNotification(message = `Studentul ${req.user.fullName} doreste sa isi actualizeze media la ${updates['medie']}.`, receiver = faculty._id);

                // cererea de actualizare a mediei
                const newMarkRequest = {
                    numeStudent: req.user.fullName,
                    studentId: req.user._id,
                    mark: req.user.medie,
                    faculty: req.user.faculty,
                    facultyId: faculty._id,
                    requestDate: new Date()
                };

                try {
                    await markRequestsCollection.insertOne(newMarkRequest);
                } catch (markError) {
                    console.error("Eroare la crearea cererii de actualizare a mediei: ", markError);
                }
            }

            // trimite tokenul nou
            return res.json({
                message: 'Profil actualizat cu succes',
                token: newToken
            });
        } catch (error) {
            console.error('Eroare la PATCH /users/edit_profile: ', error);
            return res.status(500).json({ message: 'Eroare interna la server' });
        }
    });

    router.delete('/reservation-request/:id', authenticateToken, async (req, res) => {
        const requestId = req.params.id;
        const userId = req.user._id;

        try {
            // Verifica daca cererea apartine utilizatorului
            const request = await reservationRequestsCollection.findOne({
                _id: new ObjectId(requestId),
                client: new ObjectId(userId)
            });

            if (!request) {
                return res.status(404).json({ message: 'Cererea nu a fost gasita sau nu apartine utilizatorului.' });
            }

            // Sterge cererea
            await reservationRequestsCollection.deleteOne({ _id: new ObjectId(requestId) });

            return res.json({ message: 'Cererea a fost stearsa cu succes.' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    });

    router.get('/current_request', authenticateToken, async (req, res) => {
        const userId = req.user._id;
        try {
            // 1) Gasim toate cererile active (presupunem un flag isActive)
            const activeRequests = await reservationRequestsCollection
                .find({
                    client: new ObjectId(userId),
                })
                .sort({ checkIn: 1 })
                .toArray();
            // 2) Pentru fiecare cerere, adaugam datele apartamentului
            const result = await Promise.all(
                activeRequests.map(async r => {
                    const apt = await apartmentsCollection.findOne(
                        { _id: r.apartament },
                        { projection: { location: 1, price: 1, numberOfRooms: 1 } }
                    );
                    return {
                        _id: r._id.toString(),
                        apartment: {
                            _id: apt?._id.toString(),
                            location: apt?.location || '—',
                            price: apt?.price || 0,
                            numberOfRooms: apt?.numberOfRooms || 0,
                        },
                        checkIn: r.checkIn,
                        checkOut: r.checkOut,
                        rooms: r.numberOfRooms,
                        createdAt: r.createdAt,
                    };
                })
            );

            // 3) Returnam array-ul rezultat
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    });

    router.get('/reservations_history/', authenticateToken, async (req, res) => {
        const userId = req.user._id;
        try {
            const past = await reservationHistoryCollection.find({
                client: new ObjectId(userId),
                // isActive: false
            })
                .sort({ checkIn: -1 })
                .toArray();

            // Mapam pentru frontend doar campurile necesare
            const history = await Promise.all(past.map(async r => {
                const apt = await apartmentsCollection.findOne(
                    { _id: r.apartament },
                    { projection: { location: 1 } }
                );
                return {
                    _id: r._id,
                    apartment: apt?.location || '—',
                    checkIn: r.checkIn,
                    checkOut: r.checkOut,
                    rooms: r.numberOfRooms,
                    createdAt: r.createdAt
                };
            }));

            return res.json(history);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Eroare interna a serverului.' });
        }
    }
    );

    router.get('/', async (req, res) => {
        const users = await usersCollection.find({}).toArray();
        res.send(users);
    });

    router.get('/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const user = await usersCollection.findOne(query);
        res.send(user);
    });
    return router;
}

module.exports = createUserRoutes;