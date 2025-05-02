const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ message: 'Neautorizat' });

    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Token invalid sau expirat' });
        req.user = decoded;
        next();
    });
};

module.exports = authenticateToken;