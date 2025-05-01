const express = require('express');
const router = express.Router(); // Creează o instanță de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');


function createFacultyRoutes(facultiesCollection) {
    router.get('/', async (req, res) => {
        const faculties = await facultiesCollection.find({}).toArray();
        res.send(faculties);

    });

    return router;
}

module.exports = createFacultyRoutes;