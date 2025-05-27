// frontend/src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { getAuth } from "firebase/auth"; // Adauga si alte servicii daca le folosesti
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Obtine instante ale serviciilor
const storage = getStorage(app);
// const auth = getAuth(app); // Exemplu

const uploadFileToStorage = (file: File, path: String): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject("Fisier invalid");
            return;
        }

        const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            () => {},
            (error) => {
                console.error("Upload Error:", error);
            },
            () => {
                // upload finalizat cu succes, obtine URL pentru download
                getDownloadURL(uploadTask.snapshot.ref)
                    .then((downloadURL) => {
                        resolve(downloadURL); // rezolva promise-ul cu URL-ul
                    })
                    .catch(reject);
            },
        );
    });
};

export { storage, uploadFileToStorage /*, auth  , alte servicii */ };
