const admin = require('firebase-admin');
// 'dotenv' este necesar doar pentru dezvoltare locala daca ai un .env.backend
// in productie, variabilele sunt setate direct de platforma de hosting.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.backend') });
    // Foloseste un .env.backend separat pentru dezvoltare locala a backend-ului
}


let serviceAccount;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_STRING) {
        console.log("Se incarca cheia de serviciu Firebase din variabila de mediu GOOGLE_APPLICATION_CREDENTIALS_JSON_STRING.");
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_STRING);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Aceasta ramura este mai putin probabila pentru platforme PaaS,
        // dar utila daca ai setat calea catre fisier.
        serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
        // Fallback pentru dezvoltare locala daca ai fisierul direct (NU RECOMANDAT PENTRU PRODUCtIE iN GIT)
        // Comenteaza sau sterge aceasta parte pentru productie daca nu e absolut necesar.
        console.warn("AVERTISMENT: Se incarca cheia de serviciu Firebase dintr-un fisier local. Nerecomandat pentru productie in Git.");
        serviceAccount = require('./service-account-key-local-dev.json'); // Adauga la .gitignore
    }
} catch (error) {
    console.error("Eroare critica: Nu s-a putut incarca/parsa cheia de serviciu Firebase.", error);
    // Poti alege sa opresti aplicatia aici daca Firebase Admin e esential
    // process.exit(1); 
}


const firebaseStorageBucketUrl = process.env.FIREBASE_STORAGE_BUCKET_URL;

if (!firebaseStorageBucketUrl) {
    console.error("Eroare critica: Variabila de mediu FIREBASE_STORAGE_BUCKET_URL nu este setata.");
    // process.exit(1);
}

// Initializeaza doar daca nu a fost deja initializat si avem serviceAccount
if (!admin.apps.length && serviceAccount && firebaseStorageBucketUrl) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: firebaseStorageBucketUrl
        });
        console.log("Firebase Admin SDK initializat cu succes.");
    } catch (initError) {
        console.error("Eroare la initializarea Firebase Admin SDK:", initError);
        // process.exit(1);
    }
} else if (admin.apps.length) {
    console.log("Firebase Admin SDK era deja initializat.");
} else if (!serviceAccount) {
    console.error("Firebase Admin SDK nu a putut fi initializat: cheia de serviciu lipseste.");
}


const getBucket = () => {
    if (!admin.apps.length || !admin.storage().bucket(firebaseStorageBucketUrl)) {
        // Acest lucru nu ar trebui sa se intample daca initializarea a reusit
        console.error("Firebase Admin SDK sau bucket-ul nu este initializat corect pentru a obtine instanta bucket.");
        // Poti arunca o eroare sau returna null/undefined si sa gestionezi in alta parte
        throw new Error("Firebase Storage bucket nu este disponibil.");
    }
    return admin.storage().bucket(firebaseStorageBucketUrl); // Asigura-te ca specifici bucket-ul corect
};

module.exports = { admin, getBucket }; // Exporta o functie pentru a obtine bucket-ul