const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

module.exports = (usersCollection, facultiesCollection) => {


    // endpoint pentru inregistrare facultate
    router.post('/register_faculty', [
        body('denumireaCompleta').notEmpty().withMessage('Denumirea completa este necesara'),
        body('numeRector').notEmpty().withMessage('Nume Rector este necesar'),
        body('emailSecretariat').isEmail().withMessage('Email invalid'),
        body('numarTelefonSecretariat').notEmpty().withMessage('Numar de telefon secretariat este necesar'),
        body('password').isLength({ min: 6 }).withMessage('Parola trebuie sa aiba cel putin 6 caractere'),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { denumireaCompleta, numeRector, emailSecretariat, numarTelefonSecretariat, logoUrl, documentUrl, password, role } = req.body;

        try {

            // Verifica daca facultatea exista deja
            const existingFaculty = await facultiesCollection.findOne({
                $or: [{ emailSecretariat: emailSecretariat }]
            });

            if (existingFaculty) {
                return res.status(400).json({ message: 'Email deja utilizat' });
            }

            // Cripteaza parola
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Creeaza noua facultate
            const newFaculty = {
                denumireaCompleta,
                numeRector,
                emailSecretariat,
                numarTelefonSecretariat,
                logoUrl,
                documentUrl,
                password: hashedPassword,
                createdAt: new Date(),
            };

            // Insereaza facultatea in baza de date
            const result = await facultiesCollection.insertOne(newFaculty);

            // Generare token JWT
            const token = jwt.sign({ facultyId: result.insertedId, role: role, email: emailSecretariat },
                process.env.ACCESS_SECRET, { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'Facultate creata cu succes', token });
        }
        catch (error) {
            console.error('Eroare la inregistrare:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // endpoint pentru inregistrare proprietar
    router.post('/register_owner', [
        body('email').isEmail().withMessage('Email invalid'),
        body('fullName').notEmpty().withMessage('Numele complet este necesar'),
        body('password').isLength({ min: 6 }).withMessage('Parola trebuie sa aiba cel putin 6 caractere'),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, fullName, password, role } = req.body;

        try {
            // Verifica daca utilizatorul exista deja
            const existingUser = await usersCollection.findOne({
                $or: [{ email: email }]
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Email deja utilizat' });
            }

            // Cripteaza parola
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Creeaza noul proprietar
            const newUser = {
                email,
                fullName,
                password: hashedPassword,
                role: role,
                createdAt: new Date(),
            };

            // Insereaza utilizatorul in baza de date
            const result = await usersCollection.insertOne(newUser);

            // Generare token JWT
            const token = jwt.sign({ userId: result.insertedId, role: role, email: email },
                process.env.ACCESS_SECRET, { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'Utilizator creat cu succes', token });
        }
        catch (error) {
            console.error('Eroare la inregistrare:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Endpoint pentru inregistrare student
    router.post('/register_student', [
        body('email').isEmail().withMessage('Email invalid'),
        body('fullName').notEmpty().withMessage('Numele complet este necesar'),
        body('phoneNumber').matches(/^[0-9]{10}$/).withMessage('Numar de telefon invalid. Trebuie sa aiba 10 cifre.'),
        body('gender').isIn(['male', 'female']).withMessage('Gen invalid. Selecteaza "male" sau "female".'),
        body('password').isLength({ min: 6 }).withMessage('Parola trebuie sa aiba cel putin 6 caractere'),
        body('faculty').notEmpty().withMessage('Campul de facultate este necesar')
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, fullName, phoneNumber, gender, password, faculty, role } = req.body; /* ce primesc de la frontend catre backend */

        try {
            // Verifica daca utilizatorul exista deja
            const existingUser = await usersCollection.findOne({
                $or: [{ email: email }]
            });

            if (existingUser) {
                return res.status(400).json({ message: 'Email deja utilizat' });
            }

            // Cripteaza parola
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Creeaza noul utilizator
            const newUser = {
                email,
                fullName,
                phoneNumber,
                gender: gender.toLowerCase(),
                password: hashedPassword,
                role: role,
                faculty,
                createdAt: new Date(),
            };

            // Insereaza utilizatorul in baza de date
            const result = await usersCollection.insertOne(newUser);

            // Generare token JWT
            const token = jwt.sign({ userId: result.insertedId, role: role, email: email },
                process.env.ACCESS_SECRET, { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'Utilizator creat cu succes', token });
        } catch (error) {
            console.error('Eroare la inregistrare:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    // Endpoint pentru Autentificare
    router.post('/login', [
        body('email').isEmail().withMessage('Email invalid'),
        body('password').notEmpty().withMessage('Parola este necesara'),
    ], async (req, res) => {
        console.log("Vreau login");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors);


            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Gaseste utilizatorul dupa email


            const user = await usersCollection.findOne({ email: email });
            if (!user) {
                return res.status(401).json({ message: 'Email sau parola incorecte' });
            }

            // Compara parolele
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Email sau parola incorecte' });
            }

            // Creeaza tokenul JWT
            const token = jwt.sign({ userId: user._id, fullName: user.fullName, role: user.role, email: user.email },
                process.env.ACCESS_SECRET, { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'Autentificare reusita', token, role: user.role });
        } catch (error) {
            console.error('Eroare la autentificare:', error);
            res.status(500).json({ message: 'Eroare interna a serverului' });
        }
    });

    return router;
};