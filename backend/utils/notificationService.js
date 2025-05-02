// services/notificationService.js

const { ObjectId } = require('mongodb');

function initNotificationService(notificationsCollection) {

    if (!notificationsCollection) {
        throw new Error("Notifications Collection is required for NotificationService initialization.");
    }

    async function createNotification(message, receiver, sender = "system") {
        // Validare inputuri
        if (!message || !receiver) {
            throw new Error("Mesajul si ID-ul destinatarului sunt obligatorii pentru notificare.");
        }

        let finalReceiverId;
        try {
            finalReceiverId = new ObjectId(receiver); // Converteste si valideaza ID-ul
        } catch (e) {
            throw new Error(`ID destinatar invalid: ${receiver}`);
        }

        // Construieste documentul
        const notificationDoc = {
            message: message,
            receiver: finalReceiverId,
            sender: sender,
            isRead: false,
            date: new Date(),
        };

        // Inserare
        try {
            const insertResult = await notificationsCollection.insertOne(notificationDoc);
            if (!insertResult.insertedId) {
                throw new Error('Inserarea notificarii a esuat, nu s-a returnat insertedId.');
            }
            console.log(`Notificare (via service) creata pentru ${receiver}. ID: ${insertResult.insertedId}`);
            return insertResult;
        } catch (error) {
            console.error(`Eroare (service) la inserarea notificarii pentru ${receiverId}:`, error);
            throw new Error(`Nu s-a putut crea notificarea: ${error.message}`);
        }
    }

    return {
        createNotification
    };
}


module.exports = initNotificationService;