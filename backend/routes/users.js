const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');
const jwt = require('jsonwebtoken');

function createUserRoutes(usersCollection) {

    //! daca este o ruta normala, fara autentificare:
    //! router.<tip_request>('path', async(req, res) => {});


    //! daca am nevoie de autentificare pentru ruta:
    //! router.<tip_request>('path', authenticateToken, async (req, res) => {});


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

    router.patch('/edit_profile', authenticateToken, async (req, res) => {
        try {
            const userId = req.user._id; // id-ul utilizatorului din token
            const updates = { ...req.body };
            const allowed = ['phoneNumber', 'numar_matricol', 'anUniversitar', 'medie'];
            const setFields = {};

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


    return router;
}

module.exports = createUserRoutes;