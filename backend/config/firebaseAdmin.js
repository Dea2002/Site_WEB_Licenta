const admin = require('firebase-admin');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.backend') });
}

let serviceAccount;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_STRING) {
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_STRING);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
        console.warn("AVERTISMENT: Se incarca cheia de serviciu Firebase dintr-un fisier local. Nerecomandat pentru productie in Git.");
        serviceAccount = require('./service-account-key-local-dev.json');
    }
} catch (error) {
    console.error("Eroare critica: Nu s-a putut incarca/parsa cheia de serviciu Firebase.", error);
}


const firebaseStorageBucketUrl = process.env.FIREBASE_STORAGE_BUCKET_URL;

if (!firebaseStorageBucketUrl) {
    console.error("Eroare critica: Variabila de mediu FIREBASE_STORAGE_BUCKET_URL nu este setata.");
}

if (!admin.apps.length && serviceAccount && firebaseStorageBucketUrl) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: firebaseStorageBucketUrl
        });
        console.log("Firebase Admin SDK initializat cu succes.");
    } catch (initError) {
        console.error("Eroare la initializarea Firebase Admin SDK:", initError);
    }
} else if (admin.apps.length) {
    console.error("Firebase Admin SDK era deja initializat.");
} else if (!serviceAccount) {
    console.error("Firebase Admin SDK nu a putut fi initializat: cheia de serviciu lipseste.");
}


const getBucket = () => {
    if (!admin.apps.length || !admin.storage().bucket(firebaseStorageBucketUrl)) {
        console.error("Firebase Admin SDK sau bucket-ul nu este initializat corect pentru a obtine instanta bucket.");
        throw new Error("Firebase Storage bucket nu este disponibil.");
    }
    return admin.storage().bucket(firebaseStorageBucketUrl);
};

module.exports = { admin, getBucket }; 