require('dotenv').config();
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs'); // pentru criptarea parolelor
const cors = require('cors');
const jwt = require('jsonwebtoken'); // pentru creare si verificare token-uri JWT
const rateLimit = require('express-rate-limit');
const { ObjectId } = require('mongodb');
const { Server } = require('socket.io');
const authenticateToken = require('./middleware/authenticateToken');
const verifyAdmin = require('./middleware/verifyAdmin');
const { connectDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',   // frontend-ul tau
        methods: ['GET', 'POST'],
        credentials: true
    }
});

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


// // mongodb connection
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@inchiriere-apartamente.2qkb7.mongodb.net/?retryWrites=true&w=majority&appName=inchiriere-apartamente`;
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

// Socket.IO real-time
io.on('connection', socket => {
    // console.log('🔌 New socket:', socket.id);

    // clientul intra intr-o camera (conversationId)
    socket.on('join', conversationId => {
        socket.join(conversationId);
        // console.log(`Socket ${socket.id} joined ${conversationId}`);
    });

    // cand primeste mesaj de la client
    socket.on('message:send', async ({ conversationId, senderId, text }) => {
        const db = await connectDB();
        const messages = db.collection('messages');
        const conversations = db.collection('conversations');

        const now = new Date();
        const msg = { conversationId, senderId, text, createdAt: now };
        const result = await messages.insertOne(msg);
        msg._id = result.insertedId;

        // 1) emit back to everyone in the room
        io.to(conversationId).emit('message:new', msg);

        // 2) update the conversation’s lastMessageAt & lastMessageText
        await conversations.updateOne(
            { _id: new ObjectId(conversationId) },
            {
                $set: {
                    lastMessageAt: now,
                    lastMessageText: text
                }
            }
        );
    });
});

// Utility to generate dates between two dates (inclusive)
function getDatesBetween(start, end) {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const database = await connectDB();
        console.log("Conectat la MongoDB!");

        // database and collections
        // const database = client.db("inchiriere-apartamente");
        const usersCollection = database.collection("users");
        const facultiesCollection = database.collection("faculties");
        const apartmentsCollection = database.collection("apartments");
        const reservationHistoryCollection = database.collection("reservation_history");
        const reservationRequestsCollection = database.collection("reservation_requests");
        const notificationsCollection = database.collection("notifications");
        const markRequestsCollection = database.collection("mark_requests");
        const associationsRequestsCollection = database.collection("association_requests");
        const conversationsCollection = database.collection("conversations");
        const messagesCollection = database.collection("messages");

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
        app.locals.conversationsCollection = conversationsCollection;
        app.locals.messagesCollection = messagesCollection;

        // --- Importa rutele ---
        const adminRoutes = require('./routes/admin')(usersCollection, apartmentsCollection);
        app.use('/admin', authenticateToken, verifyAdmin, adminRoutes);

        const authRoutes = require('./routes/auth')(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection);
        app.use('/auth', authRoutes);

        const createUsersRoutes = require('./routes/users'); // Importa rutele pentru utilizatori
        const userRoutes = createUsersRoutes(usersCollection, notificationService, markRequestsCollection, facultiesCollection, reservationHistoryCollection, apartmentsCollection, reservationRequestsCollection);
        app.use('/users', userRoutes); // toate requesturile vor avea prefixul /users

        const createApartmentsRoutes = require('./routes/apartments'); // Importa rutele pentru utilizatori
        const apartmentsRoutes = createApartmentsRoutes(apartmentsCollection, reservationHistoryCollection, usersCollection, notificationService);
        app.use('/apartments', apartmentsRoutes);

        const createFacultyRoutes = require('./routes/faculty');
        const facultyRoutes = createFacultyRoutes(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection);
        app.use('/faculty', facultyRoutes);

        const createNotificationsRoutes = require('./routes/notifications');
        const notificationsRoutes = createNotificationsRoutes(notificationsCollection, notificationService);
        app.use('/notifications', notificationsRoutes);

        const createConversationsRoutes = require('./routes/conversations');
        const conversationsRoutes = createConversationsRoutes(usersCollection, conversationsCollection);
        app.use('/conversations', conversationsRoutes);

        const createMessagesRoutes = require('./routes/messages');
        const messagesRoutes = createMessagesRoutes(usersCollection, messagesCollection, conversationsCollection);
        app.use('/messages', messagesRoutes);

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

            const { clientId, apartmentId, numberOfRooms, checkIn, checkOut, priceRent, priceUtilities, discount, numberOfNights } = req.body; // extrag datele din request
            const clientObjectId = new ObjectId(clientId); // creez un obiect de tip ObjectId pentru client
            const apartmentObjectId = new ObjectId(apartmentId);
            const apartmentObject = await apartmentsCollection.findOne({ _id: apartmentObjectId }); // caut apartamentul in baza de date

            // creez obiecte de tip Date pentru check-in si check-out
            const newCheckIn = new Date(checkIn);
            const newCheckOut = new Date(checkOut);

            const reservations = await reservationRequestsCollection.find({ client: clientObjectId }).toArray(); // caut cererile clientului

            for (const reservation of reservations) {
                // creez obiecte de tip Date pentru check-in si check-out pentru fiecare cerere existenta
                const existingCheckIn = new Date(reservation.checkIn);
                const existingCheckOut = new Date(reservation.checkOut);

                // conditia de suprapunere a datelor
                // if (newCheckIn <= existingCheckOut && newCheckOut >= existingCheckIn) {
                //     return res.status(400).json({ message: 'Datele pentru check-in si check-out se suprapun cu o cerere existenta' });
                // }
            }
            const finalPrice = (priceRent * ((100 - discount) / 100) * numberOfRooms + priceUtilities) * numberOfNights;
            const newReservationRequest = {
                client: clientObjectId,
                apartament: apartmentObjectId,
                numberOfRooms: parseInt(numberOfRooms),
                checkIn: newCheckIn,
                checkOut: newCheckOut,
                priceRent: parseInt(priceRent),
                priceUtilities,
                discount,
                numberOfNights,
                finalPrice: parseFloat(finalPrice.toFixed(3))
            };

            await reservationRequestsCollection.insertOne(newReservationRequest);

            notificationService.createNotification(message = `Cerere de rezervare pentru apartamentul de la locatia: ${apartmentObject.location}, a fost trimisa cu succes!`, receiver = clientObjectId);
            notificationService.createNotification(message = `${req.user.fullName} a facut o cerere de rezervare pentru apartamentul de la locatia: ${apartmentObject.location}`, receiver = apartmentObject.ownerId);

            res.status(200).json({ message: 'Am facut cerere de rezervare' });
        });

        app.delete('/requests/clear', async (req, res) => {
            const { confirmation } = req.body;
            if (confirmation !== 'CONFIRM') {
                return res
                    .status(400)
                    .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
            }
            try {
                const result = await reservationRequestsCollection.deleteMany({});
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

        app.delete('/history/clear', async (req, res) => {
            const { confirmation } = req.body;
            if (confirmation !== 'CONFIRM') {
                return res
                    .status(400)
                    .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
            }
            try {
                const result = await reservationHistoryCollection.deleteMany({});
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
                console.log(reservationRequest);

                // Populeaza datele clientului si apartamentului inainte de inserare in istoric
                const clientData = await usersCollection.findOne({ _id: reservationRequest.client });
                const apartamentData = await apartmentsCollection.findOne({ _id: reservationRequest.apartament });
                reservationRequest.clientData = clientData;
                reservationRequest.apartamentData = apartamentData;


                await reservationHistoryCollection.insertOne(reservationRequest);
                notificationService.createNotification(message = `Cererea de rezervare pentru apartamentul de la locatia: ${apartamentData.location}, a fost acceptata!`, receiver = reservationRequest.client);
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
                const apartamentData = await app.locals.apartmentsCollection.findOne({ _id: reservationRequest.apartament });
                if (!reservationRequest) {
                    return res.status(404).json({ message: 'Cererea de rezervare nu a fost gasita' });
                }

                // sterg documentul din colectia de cereri
                await reservationRequestsCollection.deleteOne({ _id: new ObjectId(reservationId) });
                notificationService.createNotification(message = `Cererea de rezervare pentru apartamentul de la locatia: ${apartamentData.location}, a fost respinsa!`, receiver = reservationRequest.client);
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

        app.post('/unavailable_dates/:apartment_id', authenticateToken, async (req, res) => {

            const apartmentId = req.params.apartment_id;
            if (!req.user || !req.user._id) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const requestedRooms = parseInt(req.body.numberOfRooms, 10) || 1;

            if (requestedRooms < 1) {
                return res.status(400).json({ message: 'Numar de camere invalid' });
            }

            const currentUserId = req.user._id.toString();

            try {

                // 1) Fetch apartment capacity
                const apartment = await apartmentsCollection.findOne(
                    { _id: new ObjectId(apartmentId) },
                    { projection: { numberOfRooms: 1 } }
                );
                if (!apartment) {
                    return res.status(404).json({ message: 'Apartment not found' });
                }
                const capacity = apartment.numberOfRooms;

                // 2) Fetch active rental history
                const rentals = await reservationHistoryCollection
                    .find({ apartament: new ObjectId(apartmentId), isActive: true })
                    .project({ checkIn: 1, checkOut: 1, numberOfRooms: 1 })
                    .toArray();

                // 3) Fetch all active reservation requests
                const requests = await reservationRequestsCollection
                    .find()
                    .project({ checkIn: 1, checkOut: 1, numberOfRooms: 1, apartament: 1, client: 1 })
                    .toArray();

                // 4) Fetch active rental history PENTRU UTILIZATORUL CURENT, PENTRU ALTE APARTAMENTE
                // Acestea sunt rezervarile confirmate ale utilizatorului curent pentru apartamente diferite de cel verificat (A, C, D...)
                const userRentalsOnOtherApartments = await reservationHistoryCollection
                    .find({
                        user: new ObjectId(currentUserId), // Foloseste ObjectId daca 'user' e stocat asa
                        apartament: { $ne: new ObjectId(apartmentId) }, // Apartament diferit de cel curent (B)
                        isActive: true
                    })
                    .project({ checkIn: 1, checkOut: 1 })
                    .toArray();

                const userRequestsOnOther = requests.filter(reqDoc => {
                    const uid = reqDoc.client.toString();
                    const aid = reqDoc.apartament.toString();
                    return uid === currentUserId && aid !== apartmentId;
                });

                // 5) Build a map of date -> usedRooms count
                const usedRoomsMap = {};

                // A) Proceseaza rezervarile confirmate PENTRU APARTAMENTUL CURENT (B)
                rentals.forEach(rental => {
                    const rooms = rental.numberOfRooms || 1; // Sau o valoare default daca nu e specificat
                    const days = getDatesBetween(new Date(rental.checkIn), new Date(rental.checkOut));
                    days.forEach(day => {
                        usedRoomsMap[day] = (usedRoomsMap[day] || 0) + rooms;
                    });
                });

                // B) Proceseaza TOATE cererile active
                requests.forEach(reqDoc => {
                    const roomsInRequest = reqDoc.numberOfRooms || 1;
                    const daysInRequest = getDatesBetween(new Date(reqDoc.checkIn), new Date(reqDoc.checkOut));
                    const requestApartmentIdStr = reqDoc.apartament.toString();
                    // Asigura-te ca `reqDoc.user` exista si este un ObjectId inainte de a apela toString()
                    const requestUserIdStr = reqDoc.user ? (typeof reqDoc.user === 'string' ? reqDoc.user : reqDoc.user.toString()) : null;


                    daysInRequest.forEach(day => {
                        if (requestApartmentIdStr === apartmentId) {
                            // Cererea este pentru apartamentul curent (B)
                            // Adauga numarul de camere solicitate la totalul pentru ziua respectiva
                            usedRoomsMap[day] = (usedRoomsMap[day] || 0) + roomsInRequest;
                        } else if (requestUserIdStr && requestUserIdStr === currentUserId) {
                            // Cererea este pentru un ALT apartament (A, C, D...)
                            // DAR este facuta de UTILIZATORUL CURENT
                            // Deci, pentru utilizatorul curent, aceasta zi este ocupata, indiferent de apartamentul B
                            // Marcam ziua ca avand capacitatea maxima atinsa (pentru utilizatorul curent)
                            usedRoomsMap[day] = capacity;
                        }
                        // Daca cererea e pentru alt apartament sI alt utilizator, nu afecteaza direct disponibilitatea
                        // apartamentului B pentru utilizatorul curent, decat prin faptul ca ar putea umple apartamentul B
                        // (cazul `requestApartmentIdStr === apartmentId` acoperit mai sus).
                    });
                });

                // C) Proceseaza rezervarile confirmate ale UTILIZATORULUI CURENT pe ALTE APARTAMENTE
                userRentalsOnOtherApartments.forEach(rental => {
                    const days = getDatesBetween(new Date(rental.checkIn), new Date(rental.checkOut));
                    days.forEach(day => {
                        // Utilizatorul curent este ocupat cu o alta rezervare confirmata,
                        // deci ziua este indisponibila pentru el pentru apartamentul B.
                        usedRoomsMap[day] = capacity;
                    });
                });
                userRequestsOnOther.forEach(rq => {
                    getDatesBetween(new Date(rq.checkIn), new Date(rq.checkOut))
                        .forEach(day => {
                            usedRoomsMap[day] = capacity;
                        });
                });

                // 6) Dates with usedRooms >= capacity are unavailable
                const unavailableDates = Object.entries(usedRoomsMap)
                    .filter(([, used]) => used + requestedRooms > capacity)
                    .map(([day]) => day);
                res.json(unavailableDates);


            } catch (error) {
                console.error("Eroare la preluarea rezervarilor:", error);
                res.status(500).json({ message: "Eroare interna a serverului" });
            }
        });

        //!! --- Sfarsit structura veche ---

        server.listen(port, () => {
            console.log(`Serverul ruleaza pe http://localhost:${port}`);
        });
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!! Eroare FATALa la pornire sau conectare DB:", error);
        process.exit(1); // Opreste procesul daca nu se poate conecta la DB
    }
}
run();