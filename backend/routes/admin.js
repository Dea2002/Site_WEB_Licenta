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

    // Ruta pentru actualizarea statusului unui apartament
    router.put('/apartments/:id/status', authenticateToken, verifyAdmin, async (req, res) => {
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


            const result = await apartmentsCollection.updateOne({ _id: new ObjectId(apartmentId) }, { $set: updateFields });

            if (result.modifiedCount === 0) {
                return res.status(400).json({ message: 'Nu s-a putut actualiza statusul' });
            }

            const updatedApartment = await apartmentsCollection.findOne({ _id: new ObjectId(apartmentId) });
            res.json(updatedApartment);

        } catch (error) {
            console.error('Eroare la actualizarea statusului apartamentului:', error);
            res.status(500).json({ message: 'Eroare la actualizarea statusului apartamentului' });
        }
    });

    // Pentru adaugarea de useri
    router.post('/users', authenticateToken, verifyAdmin, async (req, res) => {
        const { email, fullName, phoneNumber, role, password, gender, faculty } = req.body;

        // Validari simple
        if (!email || !fullName || !phoneNumber || !role || !password || !gender || !faculty) {
            return res.status(400).json({ message: 'Toate campurile sunt obligatorii' });
        }

        try {
            // Verifica daca utilizatorul exista deja
            const existingUser = await usersCollection.findOne({ email });
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

            await usersCollection.insertOne(newUser);
            res.status(201).json({ message: 'Utilizatorul a fost adaugat cu succes' });
        } catch (error) {
            console.error('Eroare la adaugarea utilizatorului:', error);
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

    // Pentru stergerea utilizatorilor
    router.delete('/users/:id', authenticateToken, verifyAdmin, async (req, res) => {
        const userId = req.params.id;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'ID utilizator invalid' });
        }

        try {
            const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Utilizatorul nu a fost gasit' });
            }

            res.status(200).json({ message: 'Utilizatorul a fost sters cu succes' });
        } catch (error) {
            console.error('Eroare la stergerea utilizatorului:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    return router;
};