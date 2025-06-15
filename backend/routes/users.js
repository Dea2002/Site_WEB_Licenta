const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');
const jwt = require('jsonwebtoken');

const { getBucket } = require('../config/firebaseAdmin');


function createUserRoutes(usersCollection, notificationService, markRequestsCollection, facultiesCollection, reservationHistoryCollection, apartmentsCollection, reservationRequestsCollection, reviewsCollection, associationsRequestsCollection, messagesCollection, conversationsCollection) {

    router.get('/current-rent/:userId', authenticateToken, async (req, res) => {
        const { userId } = req.params;
        const now = new Date();

        try {
            // gaseste rezervarea activa curenta
            const currentRent = await reservationHistoryCollection.findOne({
                client: new ObjectId(userId),
                isActive: true,
                checkIn: { $lte: now },
                checkOut: { $gte: now }
            });

            console.log(currentRent);


            if (!currentRent) {
                return res.status(404).json({ message: 'Nu exista chirie activa pentru acest utilizator.' });
            }

            const user = await usersCollection.findOne(
                { _id: new ObjectId(userId) });

            if (!user) {
                return res.status(404).json({ message: 'Utilizatorul nu a fost gasit.' });
            }

            // detalii despre apartament
            const apartment = await apartmentsCollection.findOne({
                _id: currentRent.apartament
            }, {
                projection: {
                    location: 1,
                    price: 1,
                    image: 1,
                    numberOfRooms: 1,
                    ownerId: 1,
                    utilities: 1,
                }
            });

            // trimite raspunsul
            return res.json({
                _id: currentRent._id,
                apartment: apartment || null,
                checkIn: currentRent.checkIn,
                checkOut: currentRent.checkOut,
                finalPrice: currentRent.finalPrice,
                numberOfRooms: currentRent.numberOfRooms,
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
            const markEdited = req.body.markEdited;
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
            if (markEdited == true) {
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

    router.patch('/requests/cancel-all-for-student', authenticateToken, async (req, res) => {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "Autentificare necesara." });
        }
        const studentObjectId = new ObjectId(req.user._id); // Presupunem ca e deja ObjectId

        try {

            // Anuleaza (sau sterge) toate cererile pending ale acestui student
            // Aici, le actualizam statusul. Poti alege sa le stergi cu deleteMany.
            const result = await reservationRequestsCollection.deleteMany(
                {
                    client: studentObjectId, // Sau 'userId', depinde de schema ta
                }
            );

            res.status(200).json({
                message: `${result.modifiedCount} cereri active au fost anulate.`,
                modifiedCount: result.modifiedCount
            });
        } catch (err) {
            console.error("Eroare la anularea cererilor studentului:", err);
            res.status(500).json({ message: "Eroare interna la server la anularea cererilor." });
        }
    });

    router.delete('/account/delete', authenticateToken, async (req, res) => {
        if (!req.user || !req.user._id) {
            console.error("Utilizatorul nu este autentificat sau nu are ID valid.");
            return res.status(401).json({ message: "Autentificare necesara." });
        }
        const studentObjectId = new ObjectId(req.user._id);

        try {

            // modificarea campului senderId in mesaje
            await messagesCollection.updateMany(
                { senderId: studentObjectId },
                { $set: { senderId: "utilizator Sters" } })

            // stergerea cererilor de asociere
            await associationsRequestsCollection.deleteMany({ studentId: studentObjectId });

            // stergerea cererilor de actualizare a mediei
            await markRequestsCollection.deleteMany({ studentId: studentObjectId });
            // stergerea notificarilor pentru student
            await notificationService.deleteNotificationsByReceiver(studentObjectId);

            // setarea pe inactiv a chiriilor active
            await reservationHistoryCollection.updateMany(
                { client: studentObjectId, isActive: true },
                { $set: { isActive: false } },
                { $unset: { client: "", clientData: null } }
            );

            // schimbarea numelui studentului in "utilizator Sters" in toate recenziile
            await reviewsCollection.updateMany(
                { userId: studentObjectId },
                { $set: { userId: "utilizator Sters", userName: "Utilizator sters" } } // $unset sterge campul userId
            );

            // Sterge contul studentului
            await usersCollection.deleteOne({ _id: studentObjectId });

            // Clientul va gestiona logout-ul si redirect-ul
            res.status(200).json({ message: "Contul studentului a fost sters cu succes." });
        } catch (err) {
            console.error("Eroare la stergerea contului studentului:", err);
            res.status(500).json({ message: "Eroare interna la server la stergerea contului." });
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

    function getPathFromFirebaseUrl(url) {
        if (!url || typeof url !== 'string') {
            console.warn("URL invalid sau lipsa furnizat la getPathFromFirebaseUrl:", url);
            return null;
        }
        try {
            const urlObject = new URL(url);
            const pathName = urlObject.pathname;

            const startIndex = pathName.indexOf('/o/');
            if (startIndex === -1) {
                console.warn("Format URL Firebase neasteptat (lipseste /o/):", url);
                return null;
            }

            // Extrage partea dupa '/o/'
            let filePathEncoded = pathName.substring(startIndex + 3);

            // Elimina query parameters daca exista (ex: ?alt=media)
            const queryParamIndex = filePathEncoded.indexOf('?');
            if (queryParamIndex !== -1) {
                filePathEncoded = filePathEncoded.substring(0, queryParamIndex);
            }

            // Decodifica URI-ul (ex: %2F devine /)
            return decodeURIComponent(filePathEncoded);
        } catch (e) {
            console.error("Eroare la parsarea URL-ului Firebase:", url, e);
            return null;
        }
    }

    router.patch('/owner_account/prepare-for-deletion', authenticateToken, async (req, res) => {
        if (!req.user || !req.user._id || req.user.role !== 'proprietar') {
            return res.status(401).json({ message: "Autentificare necesara ca proprietar." });
        }
        const ownerObjectId = new ObjectId(req.user._id);

        try {
            const bucket = getBucket();
            const ownerApartments = await apartmentsCollection.find({ ownerId: ownerObjectId }).toArray();

            for (const apt of ownerApartments) {
                const apartmentObjectId = apt._id;

                // 1. Anuleaza/Sterge cererile de rezervare pentru acest apartament si notificare studenti
                const reservations = await reservationRequestsCollection.find({
                    apartmentId: apartmentObjectId
                }).toArray();
                for (const reservation of reservations) {
                    // Notificare student
                    notificationService.createNotification(
                        `Cererea de rezervare pentru apartamentul ${apt.location} a fost anulata deoarece proprietarul a sters apartamentul.`,
                        reservation.client);
                    // Stergere cerere
                    await reservationRequestsCollection.deleteOne({ _id: reservation._id });
                }

                // 2. Gestioneaza chiriile active (LOGICA COMPLEXA - placeholder)
                // 2a) pentru cererile acceptate de chirie, la care ziua de checkout a trecut, deci practic sunt terminate, voi inlocui campul apartment cu "apartament sters" 
                const completedReservations = await reservationHistoryCollection.find({
                    apartment: apartmentObjectId,
                    checkOut: { $lt: new Date() } // Chiriile terminate
                }).toArray();
                if (completedReservations.length > 0) {
                    for (const reservation of completedReservations) {
                        // Actualizare chirie
                        await reservationHistoryCollection.updateOne(
                            { _id: reservation._id },
                            {
                                $set: {
                                    apartment: "apartament sters",
                                }
                            }
                        );
                    }
                }

                // 2b) pentru cererile inca active, voi inlocui campul apartament cu "apartament sters", trec isActive pe false, trimit notificare chiriasilor ca apartamentul a fost sters dar mai pot sta 10 zile pana sa fie dati afara
                const activeReservations = await reservationHistoryCollection.find({
                    apartment: apartmentObjectId,
                    isActive: true,
                    checkIn: { $lte: new Date() }, // Chiriile inca active
                    checkOut: { $gte: new Date() } // Chiriile inca active
                }).toArray();
                if (activeReservations.length > 0) {
                    for (const reservation of activeReservations) {
                        // Actualizare chirie
                        await reservationHistoryCollection.updateOne(
                            { _id: reservation._id },
                            {
                                $set: {
                                    apartment: "apartament sters",
                                    isActive: false, // Marcheaza ca nu mai este activ
                                }
                            }
                        );
                        // Notificare chirias
                        notificationService.createNotification(
                            `Apartamentul ${apt.location} a fost sters de proprietar. Trebuie sa cauti un alt apartament in urmatoarele 10 zile.`,
                            reservation.client
                        );

                    }
                }

                // 2c) pentru cererile acceptate dar care vor urma, deci am checkIn-ul in viitor, voi inlocui campul apartament cu "apartament sters" si trimit notificare chiriasilor ca apartamentul a fost sters si sa caute altul, isActive pe false
                const futureReservations = await reservationHistoryCollection.find({
                    apartment: apartmentObjectId,
                    isActive: true,
                    checkIn: { $gt: new Date() } // Chiriile viitoare
                }).toArray();
                if (futureReservations.length > 0) {
                    for (const reservation of futureReservations) {
                        // Actualizare chirie
                        await reservationHistoryCollection.updateOne(
                            { _id: reservation._id },
                            {
                                $set: {
                                    apartment: "apartament sters",
                                    isActive: false, // Marcheaza ca nu mai este activ
                                }
                            }
                        );
                        // Notificare chirias
                        notificationService.createNotification(
                            `Apartamentul ${apt.location} a fost sters de proprietar. Trebuie sa cauti un alt apartament.`,
                            reservation.client
                        );

                    }
                }

                // 3. Sterge imaginile din Firebase Storage (necesita URL-urile din apt.images)
                if (apt.images && apt.images.length > 0) {
                    for (const imageUrl of apt.images) {
                        const filePath = getPathFromFirebaseUrl(imageUrl);

                        if (filePath) {
                            try {
                                const fileRef = bucket.file(filePath);
                                await fileRef.delete();
                            } catch (fbError) {
                                if (fbError.code === 404 || (fbError.errors && fbError.errors.some(e => e.reason === 'notFound'))) {
                                    console.warn(`Imaginea ${filePath} (din URL ${imageUrl.substring(0, 50)}...) nu a fost gasita in Firebase Storage (posibil deja stearsa).`);
                                } else {
                                    console.error(`Eroare la stergerea imaginii ${filePath} din Firebase:`, fbError.message || fbError);
                                }
                            }
                        } else {
                            console.warn(`Nu s-a putut extrage calea pentru stergere din URL-ul Firebase: ${imageUrl}`);
                        }
                    }
                }

                // 4. Sterge review-urile asociate apartamentului
                await reviewsCollection.deleteMany({ apartmentId: apartmentObjectId });

                // 5. stergerea conversatiilor asociate apartamentului si a tuturor mesajelor
                const conversations = await conversationsCollection.find({ apartmentId: apartmentObjectId }).toArray();
                if (conversations.length > 0) {
                    for (const conversation of conversations) {
                        // Sterge toate mesajele din conversatie
                        await messagesCollection.deleteMany({ conversationId: conversation._id });
                    }
                    // Sterge conversatiile
                    await conversationsCollection.deleteMany({ apartmentId: apartmentObjectId });
                }

                // 6. Sterge apartamentul
                await apartmentsCollection.deleteOne({ _id: apartmentObjectId });
            }

            res.status(200).json({ message: "Actiunile pregatitoare (stergerea apartamentelor si datelor asociate) au fost finalizate." });

        } catch (err) {
            console.error("Eroare majora la actiunile pregatitoare pentru stergerea contului proprietarului:", err);
            res.status(500).json({ message: "Eroare interna la server in timpul pregatirilor." });
        }
    });


    // DELETE /owners/account/delete
    router.delete('/owner_account/delete', authenticateToken, async (req, res) => {
        if (!req.user || !req.user._id /* || req.user.role !== 'owner' */) {
            console.error("Utilizatorul nu este autentificat sau nu are ID valid.");
            return res.status(401).json({ message: "Autentificare necesara ca proprietar." });
        }
        const ownerObjectId = new ObjectId(req.user._id);
        try {

            // Sau: const ownersCollection = getDB().collection('owners');

            // Se presupune ca actiunile pregatitoare (stergerea apartamentelor etc.) au fost deja facute
            const result = await usersCollection.deleteOne({ _id: ownerObjectId });
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Contul proprietarului nu a fost gasit." });
            }

            res.status(200).json({ message: "Contul proprietarului a fost sters cu succes." });
        } catch (err) {
            console.error("Eroare la stergerea contului proprietarului:", err);
            res.status(500).json({ message: "Eroare interna la server la stergerea contului." });
        }
    });

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