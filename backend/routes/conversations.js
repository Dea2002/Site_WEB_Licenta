const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createConversationsRoutes(usersCollection, conversationsCollection) {

    // GET /conversations/:userId → listează conversațiile în care e user-ul
    router.get('/:userId', async (req, res) => {
        const userOid = new ObjectId(req.params.userId);
        const list = await conversationsCollection
            .find({ participants: userOid })
            .sort({ lastMessageAt: -1 })
            .toArray();
        res.json(list);
    });

    // POST /conversations → creează sau returnează conversația unu-la-unu
    // body: { participants: [userId1, userId2] }
    router.post('/', async (req, res) => {
        try {
            let { participants } = req.body;
            if (!Array.isArray(participants) || participants.length !== 2) {
                return res.status(400).json({ message: 'Trebuie să trimiți exact doi participanți.' });
            }

            // Transformăm în ObjectId
            const partOids = participants.map(id => {
                if (!ObjectId.isValid(id)) throw new Error('ID invalid');
                return new ObjectId(id);
            });

            // Căutăm conversație unu-la-unu existentă
            const existing = await conversationsCollection.findOne({
                isGroup: false,
                participants: { $size: 2, $all: partOids }
            });

            if (existing) {
                // O returnăm direct
                return res.json(existing);
            }

            // Nu există → creăm una nouă
            const now = new Date();
            const doc = {
                participants: partOids,
                isGroup: false,
                createdAt: now,
                lastMessageAt: now
            };
            const result = await conversationsCollection.insertOne(doc);
            doc._id = result.insertedId;
            return res.status(201).json(doc);

        } catch (err) {
            console.error('Error in POST /conversations:', err);
            return res.status(500).json({ message: err.message });
        }
    });


    return router;
}

module.exports = createConversationsRoutes;