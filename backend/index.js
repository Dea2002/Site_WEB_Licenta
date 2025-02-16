const express = require('express');
const app = express();
const bcrypt = require('bcryptjs'); // pentru criptarea parolelor
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken'); // pentru creare si verificare token-uri JWT
const rateLimit = require('express-rate-limit');

const port = process.env.PORT || 5000;



// middleware
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

// Middleware pentru verificarea token-ului JWT
const authenticateToken = require('./middleware/authenticateToken');

// Middleware pentru verificarea rolului Admin
const verifyAdmin = require('./middleware/verifyAdmin');


// mongodb connection


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@inchiriere-apartamente.2qkb7.mongodb.net/?retryWrites=true&w=majority&appName=inchiriere-apartamente`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

        // create a database and collections

        const database = client.db("inchiriere-apartamente");
        const usersCollection = database.collection("users");
        const apartmentsCollection = database.collection("apartments");
        const listCollection = database.collection("list");
        //const paymentCollection = database.collection("payments");
        const enrolledCollection = database.collection("enrolled");
        const appliedCollection = database.collection("applied");


        // Set usersCollection in app.locals pentru acces in middleware-uri
        app.locals.usersCollection = usersCollection;
        app.locals.apartmentsCollection = apartmentsCollection; // pentru a accesa colectia de apartamente


        // inlocuieste in interiorul functiei run()
        const adminRoutes = require('./routes/admin')(usersCollection, apartmentsCollection);
        //app.use('/admin', adminRoutes);
        app.use('/admin', authenticateToken, verifyAdmin, adminRoutes);


        // Importa rutele de autentificare
        const authRoutes = require('./routes/auth')(usersCollection);
        app.use('/auth', authRoutes);

        // Ruta pentru actualizarea profilului utilizatorului
        app.put('/update-user/:id', authenticateToken, async(req, res) => {
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
        app.put('/admin/apartments/:id/status', authenticateToken, verifyAdmin, async(req, res) => {
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
        app.delete('/admin/users/:id', authenticateToken, verifyAdmin, async(req, res) => {
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
        app.post('/admin/users', authenticateToken, verifyAdmin, async(req, res) => {
            const { email, fullName, phoneNumber, role, password } = req.body;

            // Validari simple
            if (!email || !fullName || !phoneNumber || !role || !password) {
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
                };

                await app.locals.usersCollection.insertOne(newUser);
                res.status(201).json({ message: 'Utilizatorul a fost adaugat cu succes' });
            } catch (error) {
                console.error('Eroare la adaugarea utilizatorului:', error);
                res.status(500).json({ message: 'Eroare interna a serverului' });
            }
        });







        // Exemplu de ruta protejata
        app.post('/reserve', authenticateToken, async(req, res) => {
            console.log("Buna");
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



        // apartments routes here
        app.post('/new-apartments', async(req, res) => {
            const newClass = req.body;
            //newClass.numberofrooms = parseInt(newClass.numberofrooms);
            const result = await apartmentsCollection.insertOne(newClass);
            res.send(result);
        })

        // Afiseaza pe pagina doar apartamentele care sunt disponibile, cele care au statusul indisponibil nu apar
        // app.get('/apartments', async(req, res) => {
        //     const query = { status: 'disponibil' };
        //     const result = await apartmentsCollection.find(query).toArray();
        //     res.send(result);
        // })

        // Afiseaza pe pagina toate apartamentele disponibile si indisponibile
        app.get('/apartments', async(req, res) => {
            const result = await apartmentsCollection.find().toArray();
            res.send(result);
        });



        // getapartments by owner email address
        app.get('/apartments/by-email/:email', async(req, res) => {
            const email = req.params.email;
            const query = { owneremail: email };
            const result = await apartmentsCollection.find(query).toArray();
            res.send(result);
        });

        // manage apartments
        app.get('/apartments-manage', async(req, res) => {
            const result = await apartmentsCollection.find().toArray();
            res.send(result);
        })

        // update apartments status and reason
        // app.patch('/change-status/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const status = req.body.status;
        //     const reason = req.body.reason;
        //     const filter = { _id: new ObjectId(id) };
        //     const options = { upsert: false };
        //     const updateDoc = {
        //         $set: {
        //             status: status,
        //             reason: reason
        //         },
        //     };
        //     const result = await apartmentsCollection.updateOne(filter, updateDoc, options);
        //     res.send(result);
        // })


        //get single class details
        app.get('/apartments/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await apartmentsCollection.findOne(query);
            res.send(result);
        })

        // update class details (toate detaliileb    )
        app.put('/update-apartments/:id', async(req, res) => {
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


        // USERS 
        // app.post('/new-user', async (req, res) => {
        //     const newUser = req.body;
        //     const result = await usersCollection.insertOne(newUser);
        //     res.send(result);
        // })


        // Get all users
        app.get('/users', async(req, res) => {
            const users = await usersCollection.find({}).toArray();
            res.send(users);
        })

        // Get user by ID
        app.get('/users/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const user = await usersCollection.findOne(query);
            res.send(user);
        })

        // Get user by email
        app.get('/user/by-email/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })


        // Delete user  
        // ! Poate doar adminul
        app.delete('/delete-user/:id', async(req, res) => {
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
        app.get('/popular_apartments', async(req, res) => {
            const result = await apartmentsCollection.find().sort({ totalbooked: -1 }).limit(6).toArray();
            res.send(result);
        })


        app.get('/popular-owner', async(req, res) => {
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
        app.get('/admin-stats', async(req, res) => {
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
        app.get('/owners', async(req, res) => {
            const result = await usersCollection.find({ role: 'proprietar' }).toArray();
            res.send(result);
        })

        // Add ENROLLMENT
        app.post('/new-enrollment', async(req, res) => {
            const newEnroll = req.body;
            const result = await enrolledCollection.insertOne(newEnroll);
            res.send(result);
        })

        app.get('/enrolled', async(req, res) => {
            const result = await enrolledCollection.find({}).toArray();
            res.send(result);
        })

        // NU MERGE
        app.get('/enrolled-apartments/:email', async(req, res) => {
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
        app.post('/as-proprietar', async(req, res) => {
            const data = req.body;
            const result = await appliedCollection.insertOne(data);
            res.send(result);
        })
        app.get('/applied-owners/:email', async(req, res) => {
            const email = req.params.email;
            const result = await appliedCollection.findOne({ email });
            res.send(result);
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close(); cu el nu merge
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello Andreea, este primul inceput!')
})

// Middleware de gestionare a erorilor (trebuie sa fie dupa toate celelalte rute)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Ceva a mers prost!' });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})