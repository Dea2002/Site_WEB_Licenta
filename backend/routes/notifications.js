const express = require('express');
const router = express.Router(); // Creează o instanță de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createNotificationsRoutes(notificationsCollection) {

    router.get('/', async (req, res) => {
        // get all notifications
        const notifications = await notificationsCollection.find({}).toArray();
        res.send(notifications);
    });

    return router;
}

module.exports = createNotificationsRoutes;