const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log("ACCESS_SECRET folosit pentru verificare:", process.env.ACCESS_SECRET);
    if (!authorization) return res.status(401).json({ message: 'Neautorizat' });

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) {
            console.error('Eroare la verificare JWT: ', err);
            return res.status(403).json({ message: 'Token invalid sau expirat' });
        }
        req.user = decoded;
        console.log('Token decodat cu succes:', decoded); // Vezi ce conține payload-ul
        next();
    });
};

module.exports = authenticateToken;