const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createConversationsRoutes(usersCollection, conversationsCollection) {

    router.post('/apartment/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: 'ID apartament invalid' });
        }
        const aptOid = new ObjectId(apartmentId);

        // 1) cauta conversatia deja creata pentru acest apartament
        let convo = await conversationsCollection.findOne({ apartmentId: aptOid });
        if (convo) {
            return res.json(convo);
        }

        // 2) daca nu exista, creeaza una noua, cu participantii actuali
        //    (poti popula participants cu proprietar + chiriasi din backend)
        const now = new Date();
        const doc = {
            apartmentId: aptOid,
            participants: req.body.participants.map(id => new ObjectId(id)),
            isGroup: true,
            createdAt: now,
            lastMessageAt: now
        };
        const result = await conversationsCollection.insertOne(doc);
        doc._id = result.insertedId;
        return res.status(201).json(doc);
    });

    // GET /conversations/:userId → listeaza conversatiile in care e user-ul
    router.get('/:userId', async (req, res) => {
        const userOid = new ObjectId(req.params.userId);
        const list = await conversationsCollection
            .find({ participants: userOid })
            .sort({ lastMessageAt: -1 })
            .toArray();
        res.json(list);
    });

    // POST /conversations → creeaza sau returneaza conversatia unu-la-unu
    // body: { participants: [userId1, userId2] }
    router.post('/', async (req, res) => {
        try {
            let { participants } = req.body;
            if (!Array.isArray(participants) || participants.length < 2) {
                return res.status(400).json({ message: 'Trebuie sa trimiti cel putin doi participanti.' });
            }

            // Transformam in ObjectId
            const partOids = participants.map(id => {
                if (!ObjectId.isValid(id)) throw new Error('ID invalid');
                return new ObjectId(id);
            });

            const isGroup = partOids.length > 2;

            // Cautam conversatie unu-la-unu existenta
            const existing = await conversationsCollection.findOne({
                isGroup,
                participants: { $size: partOids.length, $all: partOids }
            });


            if (existing) {
                return res.json(existing);
            }

            // Nu exista → cream una noua
            const now = new Date();
            const doc = {
                participants: partOids,
                isGroup,
                createdAt: now,
                lastMessageAt: now,
                lastMessageText: '',
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