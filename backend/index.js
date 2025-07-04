require('dotenv').config();
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ObjectId } = require('mongodb');
const { Server } = require('socket.io');
const authenticateToken = require('./middleware/authenticateToken');
const verifyAdmin = require('./middleware/verifyAdmin');
const { connectDB } = require('./db');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://studentrent.netlify.app/'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// --- CONFIGURARE CORS PENTRU EXPRESS ---

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://studentrent.netlify.app',
    'https://studentrent.up.railway.app/'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization',],
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Rate limiter pentru rutele de autentificare
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute
    max: 100, // Limiteaza la 100 de cereri per IP
    message: 'Prea multe cereri de la aceasta adresa IP, incearca mai tarziu.',
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// Socket.IO real-time
io.on('connection', socket => {

    // clientul intra intr-o camera (conversationId)
    socket.on('join', conversationId => {
        socket.join(conversationId);
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

        console.log(`Mesaj nou in conversatia ${conversationId} de la ${senderId}: ${text}`);

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

async function updateReservationStatusesScheduledTask(databaseInstance, notificationService) {
    if (!databaseInstance) {
        console.error('CRON: Instanta DB nu este disponibila.');
        return;
    }
    console.log('CRON: Pornire actualizare statusuri rezervari...');

    const reservationHistoryCollection = databaseInstance.collection("reservation_history");
    const reservationRequestsCollection = databaseInstance.collection("reservation_requests");
    const apartmentsCollection = databaseInstance.collection("apartments");
    const conversationsCollection = databaseInstance.collection("conversations");

    const currentDate = new Date();
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()); // Doar data, fara ora

    try {
        const rentalsToExpire = await reservationHistoryCollection.find({
            checkOut: { $lt: currentDateOnly },
            isActive: true
        }).toArray();

        if (rentalsToExpire.length > 0) {
            console.log(`CRON: Se proceseaza ${rentalsToExpire.length} rezervari expirate pentru eliminarea din conversatii.`);
            for (const rental of rentalsToExpire) {
                const apartmentIdStr = rental.apartament.toString();
                const clientId = rental.client; // ObjectId

                if (clientId) {
                    const updateConv = await conversationsCollection.updateMany(
                        {
                            apartment: apartmentIdStr,
                            type: 'group'
                        },
                        { $pull: { participants: clientId.toString() } }
                    );
                    if (updateConv.modifiedCount > 0) {
                        console.log(`CRON: Clientul ${clientId} a fost eliminat din ${updateConv.modifiedCount} conversatii pentru apartamentul ${apartmentIdStr}.`);
                    }
                } else {
                    console.warn(`CRON: Rezervarea cu ID ${rental._id} nu are un client asociat.`);
                }
            }
        } else {
            console.log('CRON: Nu exista rezervari active care au expirat.');
        }

        const rentalsToActivate = await reservationHistoryCollection.find({
            checkIn: { $lt: currentDateOnly },
            checkOut: { $gte: currentDateOnly },
            isActive: true
        }).toArray();

        if (rentalsToActivate.length > 0) {
            console.log(`CRON: Se verifica ${rentalsToActivate.length} rezervari active pentru adaugarea in conversatii.`);
            for (const rental of rentalsToActivate) {
                if (rental.chatParticipantAdded) {
                    continue;
                }

                const apartmentIdStr = rental.apartament.toString();
                const clientId = rental.client; // ObjectId

                if (clientId) {
                    // Adauga clientul in grupurile de conversatii pentru apartament.
                    // $addToSet asigura ca ID-ul nu este duplicat in array.
                    const updateConv = await conversationsCollection.updateMany(
                        {
                            apartment: apartmentIdStr,
                            type: 'group'
                        },
                        { $addToSet: { participants: clientId.toString() } }
                    );

                    if (updateConv.modifiedCount > 0) {
                        console.log(`CRON: Clientul ${clientId} a fost adaugat in ${updateConv.modifiedCount} conversatii pentru apartamentul ${apartmentIdStr}.`);
                    }

                    // Marcheaza chiria in baza de date ca fiind procesata, pentru a nu o mai prelucra in viitor.
                    await reservationHistoryCollection.updateOne(
                        { _id: rental._id },
                        { $set: { chatParticipantAdded: true } }
                    );

                } else {
                    console.warn(`CRON: Rezervarea cu ID ${rental._id} nu are un client asociat.`);
                }
            }
        } else {
            console.log('CRON: Nu exista rezervari active de procesat.');
        }


        const expiredRequests = await reservationRequestsCollection.find({
            checkIn: { $lt: currentDateOnly }
        }).toArray();

        if (expiredRequests.length > 0) {
            // trimit notificare studentului cu faptul ca cererea de rezervare a expirat, iar apoi o sterg
            for (const request of expiredRequests) {
                const clientId = request.client;
                const apartmentId = request.apartament;
                const apartmentObject = await databaseInstance.collection("apartments").findOne({ _id: apartmentId });

                // Creeaza notificarea pentru client
                if (clientId) {
                    await databaseInstance.collection("notifications").insertOne({
                        receiver: clientId,
                        message: `Cererea de rezervare pentru apartamentul de la locatia: ${apartmentObject.location}, a expirat si a fost stearsa.`,
                        createdAt: new Date()
                    });
                }

                // Sterge cererea de rezervare
                await reservationRequestsCollection.deleteOne({ _id: request._id });
            }
        } else {
            console.log('CRON: Nu exista cereri de rezervare vechi de sters.');
        }


        const notificationWindowDays = 10;
        const tenDaysFromNow = new Date(currentDateOnly);
        tenDaysFromNow.setDate(currentDateOnly.getDate() + notificationWindowDays);

        // Gaseste chiriile active care expira in urmatoarele `notificationWindowDays` zile
        // si pentru care nu s-a trimis deja notificarea de expirare.
        const upcomingExpirations = await reservationHistoryCollection.find({
            isActive: true,
            checkOut: {
                $gte: currentDateOnly, // Expira azi sau in viitor
                $lt: tenDaysFromNow    // Dar inainte de 10 zile de acum
            },
            checkIn: {
                $lte: currentDateOnly // Inceputul chiriei a fost inainte de azi
            }
        }).toArray();

        if (upcomingExpirations.length > 0) {

            for (const rental of upcomingExpirations) {
                const clientId = rental.client; // Presupunem ca 'client' este ID-ul clientului
                const apartmentId = rental.apartament;
                const checkOutDate = new Date(rental.checkOut);

                // Calculeaza diferenta in zile
                // Pentru a fi corect, calculam diferenta intre checkout si data curenta (fara ore)
                const diffTime = Math.abs(checkOutDate.getTime() - currentDateOnly.getTime());
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let daysLeftString;
                if (checkOutDate.getFullYear() === currentDateOnly.getFullYear() &&
                    checkOutDate.getMonth() === currentDateOnly.getMonth() &&
                    checkOutDate.getDate() === currentDateOnly.getDate()) {
                    daysLeftString = "azi";
                } else {
                    const actualDaysLeft = Math.max(0, daysRemaining);
                    daysLeftString = `${actualDaysLeft} ${actualDaysLeft === 1 ? 'zi' : 'zile'}`;
                }

                let apartmentLocation = "locatie necunoscuta";
                if (apartmentId) {
                    const apartmentObject = await apartmentsCollection.findOne({ _id: apartmentId });
                    if (apartmentObject) {
                        apartmentLocation = apartmentObject.location;
                    }
                }

                if (clientId) {
                    try {
                        notificationService.createNotification(
                            message = `Chiria ta pentru apartamentul de la ${apartmentLocation} expira ${daysLeftString} (pe ${checkOutDate.toLocaleDateString()}).`,
                            receiver = clientId
                        );

                    } catch (notifError) {
                        console.error(`CRON: Eroare la crearea notificarii de expirare iminenta pentru client ${clientId}, chirie ${rental._id}:`, notifError);
                    }
                }
            }

        } else {
            console.log('CRON: Nicio chirie activa care sa expire in urmatoarele 10 zile si care necesita notificare.');
        }

    } catch (error) {
        console.error('CRON: Eroare in timpul actualizarii statusurilor:', error);
    }
    console.log('CRON: Actualizare statusuri rezervari finalizata.');
}

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
        const database = await connectDB();
        console.log("Conectat la MongoDB!");

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
        const reviewsCollection = database.collection("reviews");

        // cron.schedule('5 0 * * *', () => { // Zilnic la 00:05

        const initNotificationService = require('./utils/notificationService');
        const notificationService = initNotificationService(notificationsCollection);

        // cron.schedule('*/2 * * * *', () => { // la fiecare 2 minute
        //     console.log('-------------------------------------');
        //     console.log('CRON: Ruleaza sarcina programata de actualizare a statusurilor...');
        //     updateReservationStatusesScheduledTask(database, notificationService); // Paseaza instanta DB
        // }, {
        //     scheduled: true,
        //     timezone: "Europe/Bucharest"
        // });
        // console.log("CRON: Job pentru actualizarea statusurilor rezervarilor a fost programat.");

        app.locals.usersCollection = usersCollection;
        app.locals.facultiesCollection = facultiesCollection;
        app.locals.apartmentsCollection = apartmentsCollection;
        app.locals.reservationHistoryCollection = reservationHistoryCollection;
        app.locals.reservationRequestsCollection = reservationRequestsCollection;
        app.locals.notificationsCollection = notificationsCollection;
        app.locals.markRequestsCollection = markRequestsCollection;
        app.locals.associationsRequestsCollection = associationsRequestsCollection;
        app.locals.conversationsCollection = conversationsCollection;
        app.locals.messagesCollection = messagesCollection;
        app.locals.reviewsCollection = reviewsCollection;

        // --- Importa rutele ---
        const adminRoutes = require('./routes/admin')(usersCollection, apartmentsCollection);
        app.use('/admin', authenticateToken, verifyAdmin, adminRoutes);

        const authRoutes = require('./routes/auth')(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection);
        app.use('/auth', authRoutes);

        const createUsersRoutes = require('./routes/users');
        const userRoutes = createUsersRoutes(usersCollection, notificationService, markRequestsCollection, facultiesCollection, reservationHistoryCollection, apartmentsCollection, reservationRequestsCollection, reviewsCollection, associationsRequestsCollection, messagesCollection, conversationsCollection);
        app.use('/users', userRoutes);

        const createApartmentsRoutes = require('./routes/apartments');
        const apartmentsRoutes = createApartmentsRoutes(apartmentsCollection, reservationHistoryCollection, usersCollection, notificationService, conversationsCollection);
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

        const createReviewsRoutes = require('./routes/reviews');
        const reviewsRoutes = createReviewsRoutes(reviewsCollection, usersCollection, apartmentsCollection);
        app.use('/reviews', reviewsRoutes);


        app.post('/create_reservation_request', authenticateToken, async (req, res) => {

            if (req.user.role !== 'student' && req.user.role !== 'client') {
                return res.status(403).json({ message: 'Doar clientii pot face cereri de rezervare' });
            }

            const { clientId, apartmentId, numberOfRooms, checkIn, checkOut, priceRent, priceUtilities, discount, numberOfNights } = req.body;
            const clientObjectId = new ObjectId(clientId);
            const apartmentObjectId = new ObjectId(apartmentId);
            const apartmentObject = await apartmentsCollection.findOne({ _id: apartmentObjectId });

            const newCheckIn = new Date(checkIn);
            const newCheckOut = new Date(checkOut);

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

        /* returneaza toate cererile de rezervare pentru un proprietar */
        app.get('/owner/list_reservation_requests/:ownerId', authenticateToken, async (req, res) => {
            try {
                const ownerId = req.params.ownerId;

                const rezervari = await reservationRequestsCollection.aggregate([
                    {
                        $lookup: {
                            from: 'apartments',
                            localField: 'apartament',
                            foreignField: '_id',
                            as: 'apartamentData'
                        }
                    },
                    { $unwind: '$apartamentData' },
                    {
                        $match: {
                            'apartamentData.ownerId': new ObjectId(ownerId)
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'client',
                            foreignField: '_id',
                            as: 'clientData'
                        }
                    },
                    { $unwind: { path: '$clientData', preserveNullAndEmptyArrays: true } }
                ]).toArray();

                res.json(rezervari);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.post('/reservation_request/:id/accept', authenticateToken, async (req, res) => {
            const reservationId = req.params.id;
            const currentDate = new Date();

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

                if (reservationRequest.checkIn <= currentDate && reservationRequest.checkOut >= currentDate) {
                    await conversationsCollection.updateMany(
                        { apartment: reservationRequest.apartament.toString(), type: 'group' },
                        { $addToSet: { participants: reservationRequest.client.toString() } }
                    );
                    reservationRequest.chatParticipantAdded = true;
                } else {
                    reservationRequest.chatParticipantAdded = false; // Nu adaugam in conversatii daca nu este activ
                }

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
            const reason = req.body.reason;

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
                notificationService.createNotification(message = `Cererea de rezervare pentru apartamentul de la locatia: ${apartamentData.location}, a fost respinsa cu motivul: ${reason}`, receiver = reservationRequest.client);
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
                        }
                    },

                    { $unwind: "$apartamentData" },
                    {
                        $match: {
                            'apartamentData.ownerId': new ObjectId(ownerId)
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
            try {
                const newApartment = {
                    ownerId: new ObjectId(ownerId),
                    ...rest,
                    createdAt: new Date()
                };

                const result = await apartmentsCollection.insertOne(newApartment);

                // create conversations with and without the owner
                const conversationWithOwner = {
                    includeOwner: true,
                    apartment: result.insertedId.toString(),
                    type: 'group',
                    updatedAt: new Date(),
                    participants: [new ObjectId(ownerId)],
                    title: `${result.locatie} cu proprietarul`,
                };

                await conversationsCollection.insertOne(conversationWithOwner);

                const conversationWithoutOwner = {
                    includeOwner: false,
                    apartment: result.insertedId.toString(),
                    type: 'group',
                    updatedAt: new Date(),
                    participants: [],
                    title: `${result.locatie} fara proprietar`,
                };

                await conversationsCollection.insertOne(conversationWithoutOwner);

                res.send(result);

            } catch (error) {
                console.error('Eroare la adaugarea apartamentului:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
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

        // Get all owners
        app.get('/owners', async (req, res) => {
            const result = await usersCollection.find({ role: 'proprietar' }).toArray();
            res.send(result);
        })

        app.post('/unavailable_dates/:apartment_id', authenticateToken, async (req, res) => {

            const apartmentId = req.params.apartment_id;
            if (!req.user || !req.user._id) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const requestedRooms = parseInt(req.body.requestedRooms, 10) || 1;

            if (requestedRooms < 1) {
                return res.status(400).json({ message: 'Numar de camere invalid' });
            }

            const currentUserId = req.user._id.toString();

            try {

                const apartment = await apartmentsCollection.findOne(
                    { _id: new ObjectId(apartmentId) },
                    { projection: { numberOfRooms: 1 } }
                );
                if (!apartment) {
                    return res.status(404).json({ message: 'Apartment not found' });
                }
                const capacity = apartment.numberOfRooms;

                const usedRoomsMap = {};

                // === PASUL 1: Ocuparea apartamentului curent ===
                const rentalsForThisApartment = await reservationHistoryCollection.find({ apartament: new ObjectId(apartmentId), isActive: true }).toArray();
                const requestsForThisApartment = await reservationRequestsCollection.find({ apartament: new ObjectId(apartmentId) }).toArray();

                rentalsForThisApartment.forEach(r => {
                    const rooms = r.numberOfRooms || 1;
                    getDatesBetween(new Date(r.checkIn), new Date(r.checkOut)).forEach(day => {
                        usedRoomsMap[day] = (usedRoomsMap[day] || 0) + rooms;
                    });
                });
                requestsForThisApartment.forEach(r => {
                    const rooms = r.numberOfRooms || 1;
                    getDatesBetween(new Date(r.checkIn), new Date(r.checkOut)).forEach(day => {
                        usedRoomsMap[day] = (usedRoomsMap[day] || 0) + rooms;
                    });
                });

                // === PASUL 2: Ocuparea utilizatorului in alte parti ===
                const userRentalsOnOther = await reservationHistoryCollection.find({
                    client: new ObjectId(currentUserId),
                    apartament: {
                        $ne: new ObjectId(apartmentId)
                    },
                    isActive: true
                }).toArray();

                const userRequestsOnOther = await reservationRequestsCollection.find({
                    client: new ObjectId(currentUserId),
                    apartament: {
                        $ne: new ObjectId(apartmentId)
                    }
                }).toArray();

                // Folosim un Set pentru a stoca datele ocupate de utilizator. E mai curat.
                const userBusyDates = new Set();
                userRentalsOnOther.forEach(r => {
                    getDatesBetween(new Date(r.checkIn), new Date(r.checkOut)).forEach(day => userBusyDates.add(day));
                });
                userRequestsOnOther.forEach(r => {
                    getDatesBetween(new Date(r.checkIn), new Date(r.checkOut)).forEach(day => userBusyDates.add(day));
                });

                // === PASUL 3: Combinarea si calculul final ===
                const unavailableDates = [];

                const allRelevantDates = new Set([...Object.keys(usedRoomsMap), ...userBusyDates]);

                allRelevantDates.forEach(day => {
                    const isUserBusy = userBusyDates.has(day);
                    const roomsAlreadyUsed = usedRoomsMap[day] || 0;
                    const isApartmentFull = (roomsAlreadyUsed + requestedRooms) > capacity;

                    if (isUserBusy || isApartmentFull) {
                        unavailableDates.push(day);
                    }
                });
                res.json(unavailableDates.sort());

            } catch (error) {
                console.error("Eroare la preluarea rezervarilor:", error);
                res.status(500).json({ message: "Eroare interna a serverului" });
            }
        });

        //!! --- Sfarsit structura veche ---

        server.listen(port, () => {
        });
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!! Eroare FATALa la pornire sau conectare DB:", error);
        process.exit(1);
    }
}
run();