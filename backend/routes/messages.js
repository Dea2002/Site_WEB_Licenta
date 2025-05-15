const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createMessagesRoutes(usersCollection, messagesCollection, conversationsCollection) {
    // GET /messages/:conversationId?limit=50
    router.get('/:conversationId', async (req, res) => {
        const { conversationId } = req.params;
        console.log('conversationId:', conversationId);
        const limit = parseInt(req.query.limit, 10) || 50;
        const convoOid = new ObjectId(conversationId);

        // opțional actualizează lastMessageAt
        await conversationsCollection.updateOne(
            { _id: convoOid },
            { $set: { lastMessageAt: new Date() } }
        );

        const history = await messagesCollection
            .find({ conversationId: convoOid })
            .sort({ createdAt: 1 })
            .limit(limit)
            .toArray();

        res.json(history);
    });

    return router;
}

module.exports = createMessagesRoutes;