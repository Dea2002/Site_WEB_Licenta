const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

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
    return router;
}

module.exports = createUserRoutes;