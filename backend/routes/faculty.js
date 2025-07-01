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

    router.get('/by_name', async (req, res) => {
        const name = req.query.name;
        if (!name) {
            return res.status(400).json({ message: 'Numele facultatii este necesar.' });
        }
        try {
            const faculty = await facultiesCollection.findOne({ fullName: name });
            if (!faculty) {
                return res.status(404).json({ message: 'Facultatea nu a fost gasita.' });
            }
            res.send(faculty);
        } catch (error) {
            console.error("Eroare la cautarea facultatii: ", error);
            res.status(500).json({ message: 'Eroare server la cautarea facultatii.' });
        }
    });

    router.get('/all_students', authenticateToken, async (req, res) => {
        facultyId = req.user._id;
        if (!ObjectId.isValid(facultyId)) {
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }

        const facultyObj = await facultiesCollection.findOne({ _id: new ObjectId(facultyId) });
        if (!facultyObj) {
            return res.status(404).json({ message: 'Facultatea nu a fost gasita.' });
        }


        try {
            const students = await usersCollection.find({ faculty_valid: true, faculty: facultyObj.fullName }).toArray();
            res.send(students);
        } catch (error) {
            console.error("Eroare la listarea studentilor: ", error);
            res.status(500).json({ message: 'Eroare server la preluarea studentilor.' });
        }
    });

    router.get('/get_association_requests/:facultyId', async (req, res) => {
        const { facultyId } = req.params;
        if (!ObjectId.isValid(facultyId)) {
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }
        try {
            const associationRequests = await associationsRequestsCollection.find({ facultyId: new ObjectId(facultyId) }).toArray();

            res.send(associationRequests);
        }
        catch (error) {
            console.error("Eroare la listare cereri de asociere: ", error);
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
                return res.status(404).json({ message: 'Cererea de asociere nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }
            const { studentId } = associationRequest;

            const userUpdate = await usersCollection.updateOne(
                { _id: new ObjectId(studentId) },
                { $set: { faculty_valid: true } }
            );

            if (userUpdate.matchedCount === 0) {
                return { success: false, message: "Utilizatorul nu a fost gasit" };
            }

            const deleteRequest = await associationsRequestsCollection.deleteOne({ _id: associationRequestId });
            if (deleteRequest.deletedCount === 0) {
                return res.status(500).json({ message: 'Cererea de asociere nu a putut fi stearsa.' });
            }

            notificationService.createNotification(message = 'Cererea de asociere a fost acceptata.', receiver = studentId);

            res.status(200).json({ message: 'Cererea de asociere a fost acceptata cu succes.' });

        } catch (error) {
            console.error("Eroare la acceptarea cererii de asociere: ", error);
            res.status(500).json({ message: 'Eroare server la acceptarea cererii de asociere.' });
        }

    });

    router.post('/association/:id/reject', async (req, res) => {
        const { id } = req.params; // extrag id din link-ul cererii
        const reason = req.body.reason; // extrag motivul din corpul cererii

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }

        const associationRequestId = new ObjectId(id);

        try {
            const associationRequest = await associationsRequestsCollection.findOne({ _id: associationRequestId });

            if (!associationRequest) {
                return res.status(404).json({ message: 'Cererea de asociere nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }

            const { studentId } = associationRequest; // extrag id-ul studentului din cerere

            const deleteRequest = await associationsRequestsCollection.deleteOne({ _id: associationRequestId });
            if (deleteRequest.deletedCount === 0) {
                return res.status(500).json({ message: 'Cererea de asociere nu a putut fi stearsa.' });
            }

            notificationService.createNotification(message = `Cererea de asociere a fost respinsa cu motivul ${reason}.`, receiver = studentId);

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
        const facultyId = new ObjectId(req.params.facultyId);

        if (!ObjectId.isValid(facultyId)) {
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }

        try {
            const pipeline = [
                // 1. Filtram dupa facultate
                {
                    $match: { facultyId } // filtram cererile dupa id-ul facultatii
                },

                {
                    $addFields: {
                        studentObjId: { // adaugam un camp nou studentObjId care este ObjectId-ul studentului
                            $toObjectId: '$studentId'
                        }
                    }
                },

                {
                    $lookup: {
                        from: 'users', // din colectia users
                        localField: 'studentObjId', // folosim campul studentObjId din cerere
                        foreignField: '_id', // cautam dupa campul _id din users
                        as: 'studentInfo' // rezultatul va fi in campul studentInfo
                    }
                },

                {
                    $unwind: '$studentInfo' // desfacem array-ul studentInfo pentru a avea un singur document per student
                },

                {
                    $project: { // selectam campurile pe care vrem sa le returnam
                        _id: 1,
                        requestDate: 1,
                        faculty: 1,
                        'studentInfo._id': 1,
                        'studentInfo.fullName': 1,
                        'studentInfo.email': 1,
                        'studentInfo.phoneNumber': 1,
                        'studentInfo.numar_matricol': 1,
                        'studentInfo.anUniversitar': 1,
                        'studentInfo.medie': 1
                    }
                }
            ];

            const results = await markRequestsCollection
                .aggregate(pipeline) // folosim agregarea definita mai sus
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
        const { id } = req.params; //extrag id din link-ul cererii
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }
        const markRequestId = new ObjectId(id);

        try {
            const markRequest = await markRequestsCollection.findOne({ _id: markRequestId });
            if (!markRequest) return res.status(404).json({ message: 'Cererea de actualizare medii nu a fost gasita sau nu mai este pending.' });

            const student = await usersCollection.findOne({ _id: new ObjectId(markRequest.studentId) });
            if (!student) return res.status(404).json({ message: 'Studentul nu a fost gasit.' });

            // cauta facultatea asociata cererii
            const facultyDoc = await facultiesCollection.findOne({ _id: new ObjectId(markRequest.facultyId) });

            if (!facultyDoc) return res.status(404).json({ message: 'Facultatea asociata nu a fost gasita.' });

            const userUpdate = await usersCollection.updateOne(
                { _id: student._id },
                { $set: { medie_valid: facultyDoc.medie_valid } }
            );
            if (userUpdate.matchedCount === 0) return res.status(404).json({ message: 'Nu s-a putut actualiza medie_valid pentru student.' });


            const deleteResult = await markRequestsCollection.deleteOne({ _id: markRequestId });
            if (deleteResult.deletedCount === 0) return res.status(500).json({ message: 'Nu s-a putut sterge cererea de actualizare.' });


            await notificationService.createNotification(`Termenul de valabilitate a mediei a fost actualizat la ${facultyDoc.medie_valid}.`, student._id);

            return res.status(200).json({ message: 'Cererea a fost aprobata si media actualizata.' });
        } catch (error) {
            console.error("Eroare la acceptarea cererii de actualizare medii:", error);
            return res
                .status(500)
                .json({ message: 'Eroare server la aprobarea cererii de actualizare medii.' });
        }
    });

    router.post('/mark/:id/reject', async (req, res) => {
        const { id } = req.params; // extrag id din link-ul cererii
        const reason = req.body.reason; // extrag motivul din corpul cererii

        if (!ObjectId.isValid(id)) { // verific formatul id-ului sa fie valid
            return res.status(400).json({ message: "ID request invalid" });
        }

        const markRequestId = new ObjectId(id);

        try {
            const markRequest = await markRequestsCollection.findOne({ _id: markRequestId });

            if (!markRequest) {
                return res.status(404).json({ message: 'Cererea de actualizare de medie nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }

            const { studentId } = markRequest; // extrag id-ul studentului din cerere

            const deleteRequest = await markRequestsCollection.deleteOne({ _id: markRequestId });
            if (deleteRequest.deletedCount === 0) {
                return res.status(500).json({ message: 'Cererea de actualizare medie nu a putut fi stearsa.' });
            }

            notificationService.createNotification(message = `Cererea de actualizare medie a fost respinsa cu motivul ${reason}.`, receiver = studentId);

            res.status(200).json({ message: 'Cererea de actualizare medie a fost respinsa.' });
        } catch (error) {
            console.error("Eroare la respingerea cererii de asociere: ", error);
            res.status(500).json({ message: 'Eroare server la respingerea cererii de asociere.' });
        }
    });

    router.patch('/students/invalidate-all', authenticateToken, async (req, res) => {
        try {
            const updateResult = await usersCollection.updateMany(
                {
                    faculty_valid: true,
                    faculty: req.user.fullName
                },
                { $set: { faculty_valid: false } }
            );

            // Trimite notificare tuturor studentilor
            const students = await usersCollection.find({ faculty_valid: false }).toArray();
            for (const student of students) {
                await notificationService.createNotification('Ai fost invalidat de la facultate.', student._id);
            }

            return res.status(200).json({ message: 'Toti studentii au fost invalidati cu succes.' });
        } catch (error) {
            console.error("Eroare la invalidarea tuturor studentilor:", error);
            return res.status(500).json({ message: 'Eroare server la invalidarea studentilor.' });
        }
    });

    router.delete('/account/delete', authenticateToken, async (req, res) => {
        const facultyId = req.user._id;

        if (!ObjectId.isValid(facultyId)) {
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }

        try {
            const faculty = await facultiesCollection.findOne({ _id: new ObjectId(facultyId) });
            if (!faculty) {
                return res.status(404).json({ message: 'Facultatea nu a fost gasita.' });
            }

            const deleteResult = await facultiesCollection.deleteOne({ _id: new ObjectId(facultyId) });
            if (deleteResult.deletedCount === 0) {
                return res.status(500).json({ message: 'Nu s-a putut sterge facultatea.' });
            }

            await associationsRequestsCollection.deleteMany({ facultyId: new ObjectId(facultyId) });
            await markRequestsCollection.deleteMany({ facultyId: new ObjectId(facultyId) });

            await notificationsCollection.deleteMany({ receiver: facultyId });

            return res.status(200).json({ message: 'Contul de facultate a fost sters cu succes.' });
        } catch (error) {
            console.error("Eroare la stergerea contului de facultate:", error);
            return res.status(500).json({ message: 'Eroare server la stergerea contului de facultate.' });
        }
    });

    router.patch('/students/:studentId/invalidate', authenticateToken, async (req, res) => {
        const { studentId } = req.params;
        if (!ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'ID student invalid.' });
        }

        try {
            const student = await usersCollection.findOne({ _id: new ObjectId(studentId) });
            if (!student) {
                return res.status(404).json({ message: 'Studentul nu a fost gasit.' });
            }

            const updateResult = await usersCollection.updateOne(
                { _id: new ObjectId(studentId) },
                { $set: { faculty_valid: false } }
            );

            if (updateResult.modifiedCount === 0) {
                return res.status(500).json({ message: 'Nu s-a putut invalida studentul.' });
            }

            await notificationService.createNotification('Ai fost invalidat de la facultate.', studentId);

            return res.status(200).json({ message: 'Student invalidat cu succes.' });
        } catch (error) {
            console.error("Eroare la invalidarea studentului:", error);
            return res.status(500).json({ message: 'Eroare server la invalidarea studentului.' });
        }
    });

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