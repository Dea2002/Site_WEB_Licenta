// backend/middleware/verifyAdmin.js

// const verifyAdmin = async (req, res, next) => {
//     const { email } = req.user; // Presupunand ca token-ul include email-ul utilizatorului
//     try {
//         const user = await req.app.locals.usersCollection.findOne({ email: email });
//         if (user && user.role === 'admin') {
//             next();
//         } else {
//             return res.status(403).json({ message: 'Acces rezervat administratorilor' });
//         }
//     } catch (error) {
//         console.error('Eroare la verificarea rolului:', error);
//         res.status(500).json({ message: 'Eroare interna a serverului' });
//     }
// };

// module.exports = verifyAdmin;


const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Acces interzis. Doar pentru admini.' });
    }
};

module.exports = verifyAdmin;