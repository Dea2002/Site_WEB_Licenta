const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createMessagesRoutes(usersCollection, messagesCollection, conversationsCollection) {
    router.get('/:conversationId', async (req, res) => {
        const { conversationId } = req.params;
        if (!ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'ID invalid' });
        }
        // const convoOid = new ObjectId(conversationId);
        const history = await messagesCollection
            .find({ conversationId: conversationId })   // caută exact acelaşi tip
            .sort({ createdAt: 1 })
            .toArray();
        res.json(history);
    });

    return router;
}

module.exports = createMessagesRoutes;