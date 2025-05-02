const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');


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
            // Returneaza o eroare 400 Bad Request daca ID-ul nu e valid
            return res.status(400).json({ message: 'ID facultate invalid.' });
        }

        try {
            const markRequests = await markRequestsCollection.find({ facultyId: new ObjectId(facultyId) }).toArray();
            res.send(markRequests);
        } catch (error) {
            console.log("Eroare la listare cereri de actualizare medii:", error);
            res.status(500).json({ message: 'Eroare server la cerere actualizare medii.' });
        }
    });

    router.put('/mark/:id/approve', async (req, res) => {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID request invalid" });
        }

        const markRequestId = new ObjectId(id);

        try {
            const markRequest = await markRequestsCollection.findOne({ _id: markRequestId });

            if (!markRequest) {
                // Nu s-a gasit cererea, fie nu exista, fie nu apartine acestei facultati, fie nu mai e pending
                return res.status(404).json({ message: 'Cererea de actualizare medii nu a fost gasita, este deja procesata sau nu apartine acestei facultati.' });
            }
            const { studentId } = markRequest;



        } catch (error) {
            console.log("Eroare la acceptarea cererii de actualizare medii: ", error);
            res.status(500).json({ message: 'Eroare server la acceptarea cererii de actualizare medii.' });
        }

    });

    router.put('/mark/:id/reject', async (req, res) => { });












    return router;
}

module.exports = createFacultyRoutes;