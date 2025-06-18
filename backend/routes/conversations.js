const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createConversationsRoutes(usersCollection, conversationsCollection) {

    router.post('/initiatePrivate', authenticateToken, async (req, res) => {
        const userId = req.user._id;
        const recipientId = req.body.recipientId;

        if (!recipientId || !ObjectId.isValid(recipientId)) {
            return res.status(400).json({ message: 'ID destinatar invalid.' });
        }

        if (userId.toString() === recipientId) {
            return res.status(400).json({ message: 'Nu poti incepe o conversatie cu tine insuti.' });
        }

        const participantsOids = [new ObjectId(userId), new ObjectId(recipientId)];

        try {
            // Cautam o conversatie privata existenta intre cei doi utilizatori
            const existingConversation = await conversationsCollection.findOne({
                isGroup: false,
                participants: { $all: participantsOids, $size: 2 }
            });

            if (existingConversation) {
                console.log("existing: ", existingConversation);

                return res.json(existingConversation);
            }

            // Daca nu exista, cream una noua
            const now = new Date();
            const newConversation = {
                participants: participantsOids,
                isGroup: false,
                createdAt: now,
                lastMessageAt: now,
                lastMessageText: '',
            };

            const result = await conversationsCollection.insertOne(newConversation);
            newConversation._id = result.insertedId;
            console.log(newConversation);

            // res.status(201).json(newConversation);

        } catch (error) {
            console.error('Eroare la initierea conversatiei private:', error);
            res.status(500).json({ message: 'Eroare server' });
        }
    });


    router.post('/initiateGroup', authenticateToken, async (req, res) => {

    });

    router.post('/apartment/:apartmentId', authenticateToken, async (req, res) => {
        const { apartmentId } = req.params;
        const includeOwner = req.query.includeOwner === 'true';
        if (!ObjectId.isValid(apartmentId)) {
            return res.status(400).json({ message: 'ID apartament invalid' });
        }

        // build the filter so that we match exactly one of the two group-chats
        const filter = {
            apartmentId: new ObjectId(apartmentId),
            isGroup: true,
            includeOwner: includeOwner
        };


        // 1) try to find existing convo of this type
        let convo = await conversationsCollection.findOne(filter);
        if (convo) {
            return res.json(convo);
        }
        // 2) else create new
        const { participants: tenantIds = [], ownerId } = req.body;
        if (!Array.isArray(tenantIds) || tenantIds.length < 1) {
            return res
                .status(400)
                .json({ message: 'Trebuie sa trimiti cel putin un chirias in participants.' });
        }

        // ObjectId-ize
        const tenantsOids = tenantIds.map(id => new ObjectId(id));
        const participants = [...tenantsOids];

        if (includeOwner) {
            if (!ownerId || !ObjectId.isValid(ownerId)) {
                return res
                    .status(400)
                    .json({ message: 'Pentru includeOwner=true trebuie sa trimiti ownerId valid.' });
            }
            participants.push(new ObjectId(ownerId));
        }

        const now = new Date();
        const doc = {
            apartmentId: new ObjectId(apartmentId),
            participants,
            isGroup: true,
            includeOwner,
            createdAt: now,
            lastMessageAt: now,
            lastMessageText: '',
        };

        const result = await conversationsCollection.insertOne(doc);
        doc._id = result.insertedId;
        res.status(201).json(doc);
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

    // router.delete('/clear', async (req, res) => {
    //     const { confirmation } = req.body;
    //     if (confirmation !== 'CONFIRM') {
    //         return res
    //             .status(400)
    //             .json({ message: 'Trebuie sa trimiti in body { confirmation: "CONFIRM" }' });
    //     }
    //     try {
    //         const result = await conversationsCollection.deleteMany({});
    //         return res.json({
    //             message: `Au fost sterse ${result.deletedCount} documente.`,
    //         });
    //     } catch (err) {
    //         console.error('Eroare la stergerea documentelor:', err);
    //         return res
    //             .status(500)
    //             .json({ message: 'Eroare interna la server.' });
    //     }
    // });

    return router;
}

module.exports = createConversationsRoutes;