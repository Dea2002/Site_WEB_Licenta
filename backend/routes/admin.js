// backend/routes/admin.js

// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const { body, validationResult } = require('express-validator');

// module.exports = (usersCollection, authenticateToken, verifyAdmin) => {

//     // Endpoint pentru creare utilizator de catre admin
//     router.post('/create-user', authenticateToken, verifyAdmin, [
//         body('email').isEmail().withMessage('Email invalid'),
//         body('fullName').notEmpty().withMessage('Numele complet este necesar'),
//         body('phoneNumber').matches(/^[0-9]{10}$/).withMessage('Numar de telefon invalid. Trebuie sa aiba 10 cifre.'),
//         body('gender').isIn(['male', 'female']).withMessage('Gen invalid. Selecteaza "male" sau "female".'),
//         body('password').isLength({ min: 6 }).withMessage('Parola trebuie sa aiba cel putin 6 caractere'),
//         body('role').optional().isIn(['client', 'admin', 'proprietar']).withMessage('Rol invalid.'),
//     ], async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ errors: errors.array() });
//         }

//         const { email, fullName, phoneNumber, gender, password, role } = req.body;

//         try {
//             // Verifica daca utilizatorul exista deja
//             const existingUser = await usersCollection.findOne({
//                 $or: [{ email: email }]
//             });

//             if (existingUser) {
//                 return res.status(400).json({ message: 'Email deja utilizat' });
//             }

//             // Cripteaza parola
//             const salt = await bcrypt.genSalt(10);
//             const hashedPassword = await bcrypt.hash(password, salt);

//             // Creeaza noul utilizator
//             const newUser = {
//                 email,
//                 fullName,
//                 phoneNumber,
//                 gender: gender.toLowerCase(),
//                 password: hashedPassword,
//                 role: role || 'client',
//                 createdAt: new Date(),
//             };

//             // Insereaza utilizatorul in baza de date
//             const result = await usersCollection.insertOne(newUser);

//             res.status(201).json({ message: 'Utilizator creat cu succes', userId: result.insertedId });
//         } catch (error) {
//             console.error('Eroare la crearea utilizatorului:', error);
//             res.status(500).json({ message: 'Eroare interna a serverului' });
//         }
//     });

//     return router;
// };

// backend/routes/admin.js

// backend/routes/admin.js

const express = require('express');
const router = express.Router();

module.exports = (usersCollection, apartmentsCollection) => {
    const authenticateToken = require('../middleware/authenticateToken');
    const verifyAdmin = require('../middleware/verifyAdmin');

    // Obtine statisticile adminului
    router.get('/stats', authenticateToken, verifyAdmin, async(req, res) => {
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

    // Obtine toti utilizatorii
    router.get('/users', authenticateToken, verifyAdmin, async(req, res) => {
        try {
            const users = await usersCollection.find().toArray();
            res.status(200).json(users);
        } catch (error) {
            console.error('Eroare la obtinerea utilizatorilor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Obtine toate apartamentele
    router.get('/apartments', authenticateToken, verifyAdmin, async(req, res) => {
        try {
            const apartments = await apartmentsCollection.find().toArray();
            res.status(200).json(apartments);
        } catch (error) {
            console.error('Eroare la obtinerea apartamentelor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Obtine toti proprietarii
    router.get('/owners', authenticateToken, verifyAdmin, async(req, res) => {
        try {
            const owners = await usersCollection.find({ role: 'proprietar' }).toArray();
            res.status(200).json(owners);
        } catch (error) {
            console.error('Eroare la obtinerea proprietarilor:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    return router;
};