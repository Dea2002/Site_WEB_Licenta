const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');
const jwt = require('jsonwebtoken');


function createFacultyRoutes(usersCollection, facultiesCollection, notificationService, notificationsCollection, markRequestsCollection, associationsRequestsCollection) {
    router.get('/', async (req, res) => {
        const faculties = await facultiesCollection.find({}).toArray();
        res.send(faculties);

    });

    //! functie care sterge o cerere de asociere cu facultatea
    router.get('/get_association_requests', async (req, res) => {
        const associationRequests = await associationsRequestsCollection.find({}).toArray();
        res.send(associationRequests);
    });

    router.get('/get_association_requests/:facultyId', async (req, res) => {
        const { facultyId } = req.params;
        if (!ObjectId.isValid(facultyId)) {
            // Returneaza o eroare 400 Bad Request daca ID-ul nu e valid
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }
        try {
            const associationRequests = await associationsRequestsCollection.find({ facultyId: new ObjectId(facultyId) }).toArray();
            res.send(associationRequests);
        }
        catch (error) {
            console.log("Eroare la listare cereri de asociere: ", error);
            res.status(500).json({ message: 'Eroare server la preluarea cererilor.' });
        }
    });

    router.put('/association/:id/approve', async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }

        const associationRequestId = new ObjectId(id);

        try {
            const associationRequest = await associationsRequestsCollection.findOne({ _id: associationRequestId });

            if (!associationRequest) {
                // Nu s-a gasit cererea, fie nu exista, fie nu apartine acestei facultati, fie nu mai e pending
                return res.status(404).json({ message: 'Cererea de asociere nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }
            const { studentId } = associationRequest;

            // get the user document from the userId
            const userUpdate = await usersCollection.updateOne(
                { _id: new ObjectId(studentId) },
                { $set: { faculty_valid: true } }
            );

            if (userUpdate.matchedCount === 0) {
                return { success: false, message: "Utilizatorul nu a fost gasit" };
            }

            // delete the current association request
            const deleteRequest = await associationsRequestsCollection.deleteOne({ _id: associationRequestId });
            if (deleteRequest.deletedCount === 0) {
                return res.status(500).json({ message: 'Cererea de asociere nu a putut fi stearsa.' });
            }

            // add a notification for the student
            notificationService.createNotification(message = 'Cererea de asociere a fost acceptata.', receiver = studentId);

            // send positive response
            res.status(200).json({ message: 'Cererea de asociere a fost acceptata cu succes.' });

        } catch (error) {
            console.log("Eroare la acceptarea cererii de asociere: ", error);
            res.status(500).json({ message: 'Eroare server la acceptarea cererii de asociere.' });
        }

    });

    router.put('/association/:id/reject', async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }

        const associationRequestId = new ObjectId(id);

        try {
            const associationRequest = await associationsRequestsCollection.findOne({ _id: associationRequestId });

            if (!associationRequest) {
                // Nu s-a gasit cererea, fie nu exista, fie nu apartine acestei facultati, fie nu mai e pending
                return res.status(404).json({ message: 'Cererea de asociere nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }

            const { studentId } = associationRequest;

            // delete the current association request
            const deleteRequest = await associationsRequestsCollection.deleteOne({ _id: associationRequestId });
            if (deleteRequest.deletedCount === 0) {
                return res.status(500).json({ message: 'Cererea de asociere nu a putut fi stearsa.' });
            }

            // add a notification for the student
            notificationService.createNotification(message = 'Cererea de asociere a fost respinsa.', receiver = studentId);

            // send positive response
            res.status(200).json({ message: 'Cererea de asociere a fost respinsa.' });
        } catch (error) {
            console.error("Eroare la respingerea cererii de asociere: ", error);
            res.status(500).json({ message: 'Eroare server la respingerea cererii de asociere.' });
        }
    });

    router.get('/get_mark_requests', async (req, res) => {
        const markRequests = await markRequestsCollection.find({}).toArray();
        res.send(markRequests);
    });

    router.get('/get_mark_requests/:facultyId', async (req, res) => {
        const { facultyId } = req.params;
        if (!ObjectId.isValid(facultyId)) {
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }

        try {
            const pipeline = [
                // 1. Filtrăm după facultate
                { $match: { facultyId: new ObjectId(facultyId) } },
                // 2. Lookup in colectia 'users' (string), nu in obiect
                {
                    $lookup: {
                        from: 'users',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'studentInfo'
                    }
                },
                // 3. Unwind ca să extragem obiectul
                { $unwind: '$studentInfo' },
                // 4. Proiectăm campurile relevante
                {
                    $project: {
                        _id: 1,
                        requestDate: 1,
                        faculty: 1,
                        // Aici adaugi campurile din studentInfo
                        'studentInfo._id': 1,
                        'studentInfo.fullName': 1,
                        'studentInfo.email': 1,
                        'studentInfo.phoneNumber': 1,
                        'studentInfo.numar_matricol': 1,
                        'studentInfo.anUniversitar': 1,
                        'studentInfo.medie': 1

                    }
                },
                // 5. (optional) Sortezi după data cererii
                { $sort: { requestDate: -1 } }
            ];

            const results = await markRequestsCollection
                .aggregate(pipeline)
                .toArray();

            return res.json(results);
        } catch (error) {
            console.error("Eroare la listare cereri de actualizare medii:", error);
            return res
                .status(500)
                .json({ message: 'Eroare server la cerere actualizare medii.' });
        }
    });

    router.put('/mark/:id/approve', async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }
        const markRequestId = new ObjectId(id);

        try {
            // 1. Găseste cererea
            const markRequest = await markRequestsCollection.findOne({ _id: markRequestId });
            if (!markRequest) {
                return res.status(404).json({
                    message:
                        'Cererea de actualizare medii nu a fost găsită sau nu mai este pending.'
                });
            }

            // 2. Găseste studentul
            const student = await usersCollection.findOne({
                _id: new ObjectId(markRequest.studentId)
            });
            if (!student) {
                return res.status(404).json({ message: 'Studentul nu a fost găsit.' });
            }

            // 3. Găseste facultatea din cerere (markRequest.facultyId)
            const facultyDoc = await facultiesCollection.findOne({
                _id: new ObjectId(markRequest.facultyId)
            });
            if (!facultyDoc) {
                return res
                    .status(404)
                    .json({ message: 'Facultatea asociată nu a fost găsită.' });
            }

            // 4. Actualizează campul medie_valid al studentului cu valoarea din facultate
            const userUpdate = await usersCollection.updateOne(
                { _id: student._id },
                { $set: { medie_valid: facultyDoc.medie_valid } }
            );
            if (userUpdate.matchedCount === 0) {
                return res
                    .status(404)
                    .json({ message: 'Nu s-a putut actualiza medie_valid pentru student.' });
            }

            // 5. sterge cererea de actualizare
            const deleteResult = await markRequestsCollection.deleteOne({
                _id: markRequestId
            });
            if (deleteResult.deletedCount === 0) {
                return res
                    .status(500)
                    .json({ message: 'Nu s-a putut sterge cererea de actualizare.' });
            }

            // 6. Trimite notificare studentului
            await notificationService.createNotification(
                `Media ta a fost actualizată la ${facultyDoc.medie_valid}.`,
                student._id
            );

            return res
                .status(200)
                .json({ message: 'Cererea a fost aprobată si media actualizată.' });
        } catch (error) {
            console.error("Eroare la acceptarea cererii de actualizare medii:", error);
            return res
                .status(500)
                .json({ message: 'Eroare server la aprobarea cererii de actualizare medii.' });
        }
    });

    router.put('/mark/:id/reject', async (req, res) => { });


    router.patch('/edit_profile', authenticateToken, async (req, res) => {
        try {
            const facultyId = req.user._id;
            const updates = { ...req.body };
            const allowed = ['numeRector', 'emailSecretariat', 'phoneNumber', 'medie_valid'];
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
            await facultiesCollection.updateOne(
                { _id: new ObjectId(facultyId) },
                { $set: setFields }
            );

            // recupereaza documentul actualizat
            const updated = await facultiesCollection.findOne({ _id: new ObjectId(facultyId) });
            // creeaza un nou token pe baza datelor relevante
            const newToken = jwt.sign(updated, process.env.ACCESS_SECRET, { expiresIn: '1h' });

            // trimite tokenul nou
            return res.json({
                message: 'Profil actualizat cu succes',
                token: newToken
            });
        } catch (error) {
            console.error('Eroare la PATCH /faculty/edit_profile: ', error);
            return res.status(500).json({ message: 'Eroare interna la server' });
        }
    });









    return router;
}

module.exports = createFacultyRoutes;