const express = require('express');
const bcrypt = require('bcryptjs'); // pentru criptarea parolelor
const cors = require('cors');
const jwt = require('jsonwebtoken'); // pentru creare si verificare token-uri JWT
const rateLimit = require('express-rate-limit');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const authenticateToken = require('./middleware/authenticateToken');
const verifyAdmin = require('./middleware/verifyAdmin');

const app = express();
const port = process.env.PORT || 5000;

require('dotenv').config();

app.use(cors());
app.use(express.json());


// Rate limiter pentru rutele de autentificare
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 100, // Limiteaza la 100 de cereri per IP
    message: 'Prea multe cereri de la aceasta adresa IP, incearca mai tarziu.',
});

// Aplica rate limiter la rutele de autentificare
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);


// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@inchiriere-apartamente.2qkb7.mongodb.net/?retryWrites=true&w=majority&appName=inchiriere-apartamente`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        console.log("Conectat la MongoDB!");

        // database and collections
        const database = client.db("inchiriere-apartamente");
        const usersCollection = database.collection("users");
        const facultiesCollection = database.collection("faculties");
        const apartmentsCollection = database.collection("apartments");
        const reservationHistoryCollection = database.collection("reservation_history");
        const reservationRequestsCollection = database.collection("reservation_requests");
        const notificationsCollection = database.collection("notifications");
        const markRequestsCollection = database.collection("mark_requests");
        const associationsRequestsCollection = database.collection("association_requests");

        const initNotificationSerivece = require('./utils/notificationService');
        const notificationService = initNotificationSerivece(notificationsCollection);

        // Set usersCollection in app.locals pentru acces in middleware-uri
        app.locals.usersCollection = usersCollection;
        app.locals.facultiesCollection = facultiesCollection; // pentru a accesa colectia de facultati
        app.locals.apartmentsCollection = apartmentsCollection; // pentru a accesa colectia de apartamente
        app.locals.reservationHistoryCollection = reservationHistoryCollection;
        app.locals.reservationRequestsCollection = reservationRequestsCollection;
        app.locals.notificationsCollection = notificationsCollection;
        app.locals.markRequestsCollection = markRequestsCollection;
        app.locals.associationsRequestsCollection = associationsRequestsCollection;

        // --- Importa rutele ---
        const adminRoutes = require('./routes/admin')(usersCollection, apartmentsCollection);
        app.use('/admin', authenticateToken, verifyAdmin, adminRoutes);

        const authRoutes = require('./routes/auth')(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection);
        app.use('/auth', authRoutes);

        const createUsersRoutes = require('./routes/users'); // Importa rutele pentru utilizatori
        const userRoutes = createUsersRoutes(usersCollection);
        app.use('/users', userRoutes); // toate requesturile vor avea prefixul /users

        const createApartmentsRoutes = require('./routes/apartments'); // Importa rutele pentru utilizatori
        const apartmentsRoutes = createApartmentsRoutes(apartmentsCollection);
        app.use('/apartments', apartmentsRoutes);

        const createFacultyRoutes = require('./routes/faculty');
        const facultyRoutes = createFacultyRoutes(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection);
        app.use('/faculty', facultyRoutes);

        const createNotificationsRoutes = require('./routes/notifications');
        const notificationsRoutes = createNotificationsRoutes(notificationsCollection, notificationService);
        app.use('/notifications', notificationsRoutes);

        // // --- Handler pentru rute inexistente (404) - Se pune DUPa definirea tuturor rutelor ---
        // app.use((req, res, next) => {
        //     res.status(404).json({ message: "Endpoint negasit" }); // Trimite JSON pt API
        // });

        // // --- Middleware de gestionare a erorilor (Se pune ULTIMUL) ---
        // app.use((err, req, res, next) => {
        //     console.error("-----------------------");
        //     console.error("A aparut o eroare:", err.message);
        //     console.error(err.stack);
        //     console.error("-----------------------");
        //     res.status(err.status || 500).json({
        //         message: err.message || 'Ceva a mers prost pe server!',
        //         // Poti adauga detalii suplimentare in mod dezvoltare
        //         // error: process.env.NODE_ENV === 'development' ? err : {}
        //     });
        // });


        //!! --- Structura veche ---

        // Ruta pentru actualizarea profilului utilizatorului
        app.put('/update-user/:id', authenticateToken, async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: false };
            const updateDoc = {
                $set: {
                    fullName: updatedUser.fullName,
                    email: updatedUser.email,
                    phoneNumber: updatedUser.phoneNumber,
                    // Actualizeaza parola doar daca este furnizata
                    ...(updatedUser.password && {
                        password: await bcrypt.hash(updatedUser.password, 10),
                    }),
                },
            };

            try {
                const result = await usersCollection.updateOne(filter, updateDoc, options);
                if (result.modifiedCount > 0) {
                    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
                    res.status(200).json(user); // Returneaza utilizatorul actualizat
                } else {
                    res.status(400).json({ message: 'Actualizare nereusita' });
                }
            } catch (error) {
                console.error('Eroare la actualizarea utilizatorului:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });



        // Ruta pentru actualizarea statusului unui apartament
        app.put('/admin/apartments/:id/status', authenticateToken, verifyAdmin, async (req, res) => {
            const apartmentId = req.params.id;
            const { status, reason } = req.body;

            if (!['disponibil', 'indisponibil'].includes(status)) {
                return res.status(400).json({ message: 'Status invalid' });
            }

            if (!ObjectId.isValid(apartmentId)) {
                return res.status(400).json({ message: 'ID apartament invalid' });
            }

            try {

                const updateFields = { status };

                if (status === 'indisponibil') {
                    updateFields.reason = reason || '';
                } else {
                    updateFields.reason = '';
                }


                const result = await app.locals.apartmentsCollection.updateOne({ _id: new ObjectId(apartmentId) }, { $set: updateFields });

                if (result.modifiedCount === 0) {
                    return res.status(400).json({ message: 'Nu s-a putut actualiza statusul' });
                }

                const updatedApartment = await app.locals.apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
                res.json(updatedApartment);

            } catch (error) {
                console.error('Eroare la actualizarea statusului apartamentului:', error);
                res.status(500).json({ message: 'Eroare la actualizarea statusului apartamentului' });
            }
        });


        // Pentru stergerea utilizatorilor
        app.delete('/admin/users/:id', authenticateToken, verifyAdmin, async (req, res) => {
            const userId = req.params.id;

            if (!ObjectId.isValid(userId)) {
                return res.status(400).json({ message: 'ID utilizator invalid' });
            }

            try {
                const result = await app.locals.usersCollection.deleteOne({ _id: new ObjectId(userId) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: 'Utilizatorul nu a fost gasit' });
                }

                res.status(200).json({ message: 'Utilizatorul a fost sters cu succes' });
            } catch (error) {
                console.error('Eroare la stergerea utilizatorului:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });



        // Pentru adaugarea de useri
        app.post('/admin/users', authenticateToken, verifyAdmin, async (req, res) => {
            const { email, fullName, phoneNumber, role, password, gender, faculty } = req.body;

            // Validari simple
            if (!email || !fullName || !phoneNumber || !role || !password || !gender || !faculty) {
                return res.status(400).json({ message: 'Toate campurile sunt obligatorii' });
            }

            try {
                // Verifica daca utilizatorul exista deja
                const existingUser = await app.locals.usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: 'Utilizatorul exista deja' });
                }

                // Cripteaza parola
                const hashedPassword = await bcrypt.hash(password, 10);

                // Creeaza noul utilizator
                const newUser = {
                    email,
                    fullName,
                    phoneNumber,
                    role,
                    password: hashedPassword,
                    gender,
                    faculty,
                    createdAt: new Date()
                };

                await app.locals.usersCollection.insertOne(newUser);
                res.status(201).json({ message: 'Utilizatorul a fost adaugat cu succes' });
            } catch (error) {
                console.error('Eroare la adaugarea utilizatorului:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });


        // Exemplu de ruta protejata
        app.post('/reserve', authenticateToken, async (req, res) => {
            const { apartmentId } = req.body;
            const userId = req.user.userId;

            if (!apartmentId) {
                console.log("nu am id apartament");

                return res.status(400).json({ message: 'ID-ul apartamentului este necesar' });
            }

            try {
                const apartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });

                if (!apartment) {
                    console.log("nu am gasit apartament");

                    return res.status(404).json({ message: 'Apartament nu a fost gasit' });
                }

                // Logica de rezervare
                const newReservation = {
                    userId: new ObjectId(userId),
                    apartmentId: new ObjectId(apartmentId),
                    date: new Date(),
                };

                await enrolledCollection.insertOne(newReservation);

                // Actualizeaza numarul total de rezervari al apartamentului
                await apartmentsCollection.updateOne({ _id: new ObjectId(apartmentId) }, { $inc: { totalbooked: 1 } });

                res.status(200).json({ message: 'Rezervare efectuata cu succes!' });
            } catch (error) {
                console.error('Eroare la rezervare:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });

        app.post('/create_reservation_request', authenticateToken, async (req, res) => { // asta creeaza o cerere de rezervare a unui apartament

            if (req.user.role !== 'student' && req.user.role !== 'client') {
                return res.status(403).json({ message: 'Doar clientii pot face cereri de rezervare' });
            }

            const { clientId, apartmentId, checkIn, checkOut } = req.body; // extrag datele din request
            const clientObjectId = new ObjectId(clientId); // creez un obiect de tip ObjectId pentru client
            const apartmentObjectId = new ObjectId(apartmentId);

            // creez obiecte de tip Date pentru check-in si check-out
            const newCheckIn = new Date(checkIn);
            const newCheckOut = new Date(checkOut);

            const reservations = await reservationRequestsCollection.find({ client: clientObjectId }).toArray(); // caut cererile clientului

            for (const reservation of reservations) {
                // creez obiecte de tip Date pentru check-in si check-out pentru fiecare cerere existenta
                const existingCheckIn = new Date(reservation.checkIn);
                const existingCheckOut = new Date(reservation.checkOut);

                // conditia de suprapunere a datelor
                if (newCheckIn <= existingCheckOut && newCheckOut >= existingCheckIn) {
                    return res.status(400).json({ message: 'Datele pentru check-in si check-out se suprapun cu o cerere existenta' });
                }
            }

            const newReservationRequest = {
                client: clientObjectId,
                apartament: apartmentObjectId,
                checkIn: newCheckIn,
                checkOut: newCheckOut
            };

            await reservationRequestsCollection.insertOne(newReservationRequest);

            res.status(200).json({ message: 'Am facut cerere de rezervare' });
        });

        /* returneaza toate cererile de rezervare pentru un proprietar */
        app.get('/owner/list_reservation_requests/:ownerId', authenticateToken, async (req, res) => {
            try {
                const ownerId = req.params.ownerId;

                const rezervari = await reservationRequestsCollection.aggregate([
                    // Lookup pentru apartamente
                    {
                        $lookup: {
                            from: 'apartments',          // Numele colectiei de apartamente
                            localField: 'apartament',     // Campul din cereri care contine id-ul apartamentului
                            foreignField: '_id',         // Campul din colectia de apartamente
                            as: 'apartamentData'
                        }
                    },
                    { $unwind: '$apartamentData' }, // Transforma array-ul din lookup intr-un document
                    {
                        $match: {
                            'apartamentData.ownerId': new ObjectId(ownerId)  // Filtreaza dupa ownerId
                        }
                    },
                    // Lookup pentru client (utilizator)
                    {
                        $lookup: {
                            from: 'users',             // Numele colectiei de utilizatori
                            localField: 'client',      // Campul din cereri care contine id-ul clientului
                            foreignField: '_id',       // Campul din colectia de users
                            as: 'clientData'
                        }
                    },
                    // Optional: daca te astepti ca fiecare cerere sa aiba un singur client, poti face unwind:
                    { $unwind: { path: '$clientData', preserveNullAndEmptyArrays: true } }
                ]).toArray();

                res.json(rezervari);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.post('/reservation_request/:id/accept', authenticateToken, async (req, res) => {
            const reservationId = req.params.id;
            if (!ObjectId.isValid(reservationId)) {
                return res.status(400).json({ message: 'ID-ul rezervarii este invalid' });
            }
            try {
                const reservationRequest = await reservationRequestsCollection.findOne({ _id: new ObjectId(reservationId) });
                if (!reservationRequest) {
                    return res.status(404).json({ message: 'Cererea de rezervare nu a fost gasita' });
                }

                // sterg documentul din colectia de cereri
                await reservationRequestsCollection.deleteOne({ _id: new ObjectId(reservationId) });

                // adaug campul isActive si mut documentul in colectia de istoric de rezervari
                reservationRequest.isActive = true;

                // Populeaza datele clientului si apartamentului inainte de inserare in istoric
                const clientData = await app.locals.usersCollection.findOne({ _id: reservationRequest.client });
                const apartamentData = await app.locals.apartmentsCollection.findOne({ _id: reservationRequest.apartament });
                reservationRequest.clientData = clientData;
                reservationRequest.apartamentData = apartamentData;

                // Actualizeaza documentul apartamentului: seteaza numele clientului in campul "numeColeg"
                await app.locals.apartmentsCollection.updateOne(
                    { _id: reservationRequest.apartament },
                    { $set: { colleaguesNames: clientData.fullName } }
                );

                await reservationHistoryCollection.insertOne(reservationRequest);

                res.status(200).json({ message: 'Cererea de rezervare a fost acceptata' });
            } catch (error) {
                console.error('Eroare la acceptarea cererii de rezervare:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });

        app.post('/reservation_request/:id/decline', authenticateToken, async (req, res) => {
            const reservationId = req.params.id;
            if (!ObjectId.isValid(reservationId)) {
                return res.status(400).json({ message: 'ID-ul rezervarii este invalid' });
            }

            try {
                const reservationRequest = await reservationRequestsCollection.findOne({ _id: new ObjectId(reservationId) });
                if (!reservationRequest) {
                    return res.status(404).json({ message: 'Cererea de rezervare nu a fost gasita' });
                }

                // sterg documentul din colectia de cereri
                await reservationRequestsCollection.deleteOne({ _id: new ObjectId(reservationId) });

                res.status(200).json({ message: 'Cererea de rezervare a fost respinsa' });
            } catch (error) {
                console.error('Eroare la respingerea cererii de rezervare:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });

        // Afiseaza istoricul rezervarilor
        app.get('/owner/reservation_history/:ownerId', authenticateToken, async (req, res) => {
            try {
                const ownerId = req.params.ownerId;
                const history = await reservationHistoryCollection.aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'client',
                            foreignField: '_id',
                            as: 'clientData'
                        }
                    },

                    { $unwind: "$clientData" },

                    {
                        $lookup: {
                            from: 'apartments',
                            localField: 'apartament',
                            foreignField: '_id',
                            as: 'apartamentData'
                        }/*  */
                    },

                    { $unwind: "$apartamentData" },
                    {
                        $match: {
                            'apartamentData.ownerId': new ObjectId(ownerId)  // Filtreaza dupa ownerId
                        }
                    },

                ]).toArray();
                // console.log(history);
                res.status(200).json(history);
            } catch (error) {
                console.error('Eroare la preluarea istoricului rezervarilor:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });



        // create an apartment
        app.post('/new-apartment', async (req, res) => {
            const { ownerId, ...rest } = req.body;

            // get the ownerId from requirementBody and replace it with the ObjectId from it and place it the first in the whole json
            requirementBody = { ownerId: new ObjectId(ownerId), ...rest };

            //requirementBody.numberofrooms = parseInt(requirementBody.numberofrooms);
            const result = await apartmentsCollection.insertOne(requirementBody);
            res.send(result);
        })


        // Afiseaza pe pagina toate apartamentele disponibile si indisponibile
        app.get('/apartments', async (req, res) => {
            const result = await apartmentsCollection.find().toArray();
            res.send(result);
        });


        // ruta pentru dashboardul pentru proprietari
        app.get('/owner/dashboard/:id', authenticateToken, async (req, res) => {
            try {
                const id = req.params.id;
                const count = await apartmentsCollection.countDocuments({ ownerId: new ObjectId(id) });
                res.status(200).json({ count });
            } catch (error) {
                console.error("Eroare la preluarea numarului de apartamente pentru proprietar:", error);
                res.status(500).json({ message: "Eroare interna a serverului" });
            }
        });

        // update class details (toate detaliileb    )
        app.put('/update-apartments/:id', async (req, res) => {
            const id = req.params.id;
            const updatedApartment = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedApartment.name,
                    description: updatedApartment.description,
                    price: updatedApartment.price,
                    numberofrooms: parseInt(updatedApartment.numberofrooms),
                    location: updatedApartment.location,
                    image: updatedApartment.image,
                    status: 'indisponibil'
                }
            }
            const result = await apartmentsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // Get user by email
        app.get('/user/by-email/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })


        // Delete user
        // ! Poate doar adminul
        app.delete('/delete-user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        // Update user
        // ! Modificari:
        /*
            - trebuie verificat cine acceseaza /update-user (utilizatorul poate updata doar pe el insusi)
            - modificat ce se poate actualiza la user (scoti photo, vezi daca lasi rolul etc.)
        */
        // app.put('/update-user/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const updatedUser = req.body;
        //     const filter = { _id: new ObjectId(id) };
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             name: updatedUser.name,
        //             email: updatedUser.email,
        //             role: updatedUser.role,
        //             address: updatedUser.address,
        //             phoneNumber: updatedUser.phoneNumber,
        //             photoUrl: updatedUser.photoUrl
        //         }
        //     }
        //     const result = await usersCollection.updateOne(filter, updateDoc, options);
        //     res.send(result);
        // })



        // ! ENROLLED ROUTES
        // afiseaza lista cu apartamentele cele mai populare in ordine descrescatoare, care au fost inchiriate de mai multe ori
        app.get('/popular_apartments', async (req, res) => {
            const result = await apartmentsCollection.find().sort({ totalbooked: -1 }).limit(6).toArray();
            res.send(result);
        })


        app.get('/popular-owner', async (req, res) => {
            const pipeline = [{
                $group: {
                    _id: "$owneremail",
                    totalbooked: { $sum: "$totalbooked" },
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "email",
                    as: "owner"
                }
            },
            {
                $project: {
                    _id: 0,
                    owner: {
                        $arrayElemAt: ["$owner", 0]
                    },
                    totalbooked: 1
                }
            },
            {
                $sort: {
                    totalbooked: -1
                }
            },
            {
                $limit: 6
            }
            ]
            const result = await apartmentsCollection.aggregate(pipeline).toArray();
            res.send(result);
        })


        // ADMINS stats
        app.get('/admin-stats', async (req, res) => {
            // Get approved classes and pending classes and instructors
            const approvedApartments = (await apartmentsCollection.find({ status: 'disponibil' }).toArray()).length;
            const unavailableApartments = (await apartmentsCollection.find({ status: 'indisponibil' }).toArray()).length;
            const owners = (await usersCollection.find({ role: 'proprietar' }).toArray()).length;
            const totalApartments = (await apartmentsCollection.find().toArray()).length;
            const totalEnrolled = (await enrolledCollection.find().toArray()).length;
            const result = {
                approvedApartments,
                unavailableApartments,
                owners,
                totalApartments,
                totalEnrolled,

            }
            res.send(result);

        })



        // Get all owners
        app.get('/owners', async (req, res) => {
            const result = await usersCollection.find({ role: 'proprietar' }).toArray();
            res.send(result);
        })

        // Add ENROLLMENT
        app.post('/new-enrollment', async (req, res) => {
            const newEnroll = req.body;
            const result = await enrolledCollection.insertOne(newEnroll);
            res.send(result);
        })

        app.get('/enrolled', async (req, res) => {
            const result = await enrolledCollection.find({}).toArray();
            res.send(result);
        })

        // NU MERGE
        app.get('/enrolled-apartments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const pipeline = [{
                $match: query
            },
            {
                $lookup: {
                    from: "apartments",
                    localField: "apartmentId",
                    foreignField: "_id",
                    as: "apartments"
                }
            },
            {
                $unwind: "$apartments"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "apartments.owneremail",
                    foreignField: "email",
                    as: "proprietar"
                }
            },
            {
                $project: {
                    _id: 0,
                    proprietar: {
                        $arrayElemAt: ["$proprietar", 0]
                    },
                    apartments: 1,
                }
            }

            ];

            const result = await enrolledCollection.aggregate(pipeline).toArray();
            res.send(result);
            //const result = await enrolledCollection.find(query).toArray();


            // const result = await enrolledCollection.find({ userEmail: email }).toArray();
            // console.log(result);




        })


        // Applied route
        app.post('/as-proprietar', async (req, res) => {
            const data = req.body;
            const result = await appliedCollection.insertOne(data);
            res.send(result);
        });

        app.get('/applied-owners/:email', async (req, res) => {
            const email = req.params.email;
            const result = await appliedCollection.findOne({ email });
            res.send(result);
        });

        app.get('/unavailable_dates/:apartment_id', async (req, res) => {

            const apartmentId = req.params.apartment_id;

            try {
                const reservationsFromHistory = await reservationHistoryCollection.find({
                    apartament: new ObjectId(apartmentId),
                    isActive: true
                }, {
                    projection: { _id: 0, checkIn: 1, checkOut: 1 }
                }).toArray();

                // extrage datele de check-in si check-out din fiecare rezervare sub forma "yyyy-mm-dd"
                const unavailableDatesHistory = reservationsFromHistory.map(reservation => {
                    checkIn = new Date(reservation.checkIn).toISOString().split('T')[0];
                    checkOut = new Date(reservation.checkOut).toISOString().split('T')[0];
                    return [checkIn, checkOut];
                }).flat();

                // repet pentru colectia de cereri
                const reservationsFromRequests = await reservationRequestsCollection.find({
                    apartament: new ObjectId(apartmentId),
                }, {
                    projection: { _id: 0, checkIn: 1, checkOut: 1 }
                }).toArray();
                const unavailableDatesRequests = reservationsFromRequests.map(reservation => {
                    checkIn = new Date(reservation.checkIn).toISOString().split('T')[0];
                    checkOut = new Date(reservation.checkOut).toISOString().split('T')[0];
                    return [checkIn, checkOut];
                }).flat();

                // unesc intervalele de timp gasite in colectia de istoric si in cea de cereri
                const unavailableDates = [...unavailableDatesHistory, ...unavailableDatesRequests];

                res.send(unavailableDates);
            } catch (error) {
                console.error("Eroare la preluarea rezervarilor:", error);
                res.status(500).json({ message: "Eroare interna a serverului" });
            }

        });

        //!! --- Sfarsit structura veche ---

        app.listen(port, () => {
            console.log(`Serverul ruleaza pe http://localhost:${port}`);
        });
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!! Eroare FATALa la pornire sau conectare DB:", error);
        process.exit(1); // Opreste procesul daca nu se poate conecta la DB
    }
}
run();




//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
// } finally {
//     // Ensures that the client will close when you finish/error
//     //await client.close(); cu el nu merge
// }
// }
// run().catch(console.dir);


// app.get('/', (req, res) => {
//     res.send('Hello Andreea, este primul inceput!')
// })

// app.use((req, res, next) => {
//     res.status(404).send("Sorry, can't find that!");
// });

// // Middleware de gestionare a erorilor (trebuie sa fie dupa toate celelalte rute)
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ message: 'Ceva a mers prost!' });
// });

// // app.listen(port, () => {
// //     console.log(`Example app listening on port ${port}`)
// // })