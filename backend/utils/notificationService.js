const { ObjectId } = require('mongodb');

function initNotificationService(notificationsCollection) {

    if (!notificationsCollection) {
        throw new Error("Notifications Collection is required for NotificationService initialization.");
    }

    async function deleteNotificationsByReceiver(receiverId) {
        if (!receiverId) {
            throw new Error("ID-ul destinatarului este obligatoriu pentru stergerea notificarilor.");
        }
        let finalReceiverId;
        try {
            finalReceiverId = new ObjectId(receiverId);
        }
        catch (e) {
            throw new Error(`ID destinatar invalid: ${receiverId}`);
        }
        try {
            const deleteResult = await notificationsCollection.deleteMany({ receiver: finalReceiverId });

            return deleteResult;
        } catch (error) {
            console.error(`Eroare (service) la stergerea notificarilor pentru ${receiverId}:`, error);
            throw new Error(`Nu s-au putut sterge notificarile: ${error.message}`);
        }
    }

    async function createNotification(message, receiver, sender = "system") {
        if (!message || !receiver) {
            throw new Error("Mesajul si ID-ul destinatarului sunt obligatorii pentru notificare.");
        }

        let finalReceiverId;
        try {
            finalReceiverId = new ObjectId(receiver);
        } catch (e) {
            throw new Error(`ID destinatar invalid: ${receiver}`);
        }

        const notificationDoc = {
            message: message,
            receiver: finalReceiverId,
            sender: sender,
            isRead: false,
            date: new Date(),
        };

        try {
            const insertResult = await notificationsCollection.insertOne(notificationDoc);
            if (!insertResult.insertedId) {
                throw new Error('Inserarea notificarii a esuat, nu s-a returnat insertedId.');
            }
            return insertResult;
        } catch (error) {
            console.error(`Eroare (service) la inserarea notificarii pentru ${receiverId}:`, error);
            throw new Error(`Nu s-a putut crea notificarea: ${error.message}`);
        }
    }

    return {
        createNotification, deleteNotificationsByReceiver
    };
}

module.exports = initNotificationService;