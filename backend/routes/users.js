const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');
const jwt = require('jsonwebtoken');

function createUserRoutes(usersCollection, notificationService, markRequestsCollection, facultiesCollection) {

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


    return router;
}

module.exports = createUserRoutes;