const express = require('express');
const router = express.Router(); // Creeaza o instanta de Router
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/authenticateToken');

function createNotificationsRoutes(notificationsCollection, notificationService) {

    router.get('/', authenticateToken, async (req, res) => {
        // get all notifications for the specified user
        try {
            const userId = req.user._id;
            const docs = await notificationsCollection
                .find({ receiver: new ObjectId(userId) })
                .sort({ createdAt: -1 })
                .toArray();
            return res.json(docs);
        } catch (error) {
            console.error('Error fetching notifications list: ', error);
            return res.status(500).json({ message: 'Eroare interna la citirea notificarilor.' });
        }
    });

    router.get('/unread-count', authenticateToken, async (req, res) => {
        try {
            const userId = req.user._id;

            const count = await notificationsCollection.countDocuments({
                receiver: new ObjectId(userId),
                isRead: false
            });
            return res.json({ unread: count });
        } catch (error) {
            console.error('Error fetching unread notifications counts: ', error);
            return res.status(500).json({ message: 'Eroare interna la citirea notificarilor' });
        }
    });

    router.put(
        '/:id/read',
        authenticateToken,
        async (req, res) => {
            try {
                const notifId = req.params.id;
                const userId = req.user._id;
                const result = await notificationsCollection.updateOne(
                    { _id: new ObjectId(notifId), receiver: new ObjectId(userId) },
                    { $set: { isRead: true } }
                );
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Notificare inexistenta.' });
                }
                return res.json({ message: 'Notificare marcata ca citita.' });
            } catch (err) {
                console.error('Error marking notification read:', err);
                return res
                    .status(500)
                    .json({ message: 'Eroare interna la actualizarea notificarii.' });
            }
        }
    );

    router.delete(
        '/:id',
        authenticateToken,
        async (req, res) => {
            const { id } = req.params;
            await notificationsCollection.deleteOne({
                _id: new ObjectId(id),
                receiver: new ObjectId(req.user._id)
            });
            res.json({ message: 'Notificare stearsa' });
        }
    );

    return router;
}

module.exports = createNotificationsRoutes;