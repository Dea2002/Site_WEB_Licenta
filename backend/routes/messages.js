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
            .find({ conversationId: conversationId })   // cauta exact acelaşi tip
            .sort({ createdAt: 1 })
            .toArray();
        res.json(history);
    });

    router.delete('/clear', async (req, res) => {
        const { confirmation } = req.body;
        if (confirmation !== 'CONFIRM') {
            return res
                .status(400)
                .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
        }
        try {
            const result = await messagesCollection.deleteMany({});
            return res.json({
                message: `Au fost sterse ${result.deletedCount} documente.`,
            });
        } catch (err) {
            console.error('Eroare la stergerea documentelor:', err);
            return res
                .status(500)
                .json({ message: 'Eroare interna la server.' });
        }
    });

    return router;
}

module.exports = createMessagesRoutes;