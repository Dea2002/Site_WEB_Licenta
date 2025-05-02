const express = require('express');
const router = express.Router(); // Creează o instanță de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');


function createFacultyRoutes(facultiesCollection, notificationsCollection, markRequestsCollection, associationsRequestsCollection) {
    router.get('/', async (req, res) => {
        const faculties = await facultiesCollection.find({}).toArray();
        res.send(faculties);

    });

    //! functie care sterge o cerere de asociere cu facultatea

    return router;
}

module.exports = createFacultyRoutes;