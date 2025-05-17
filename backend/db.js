// db.js
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}` +
    `@inchiriere-apartamente.2qkb7.mongodb.net/` +
    `?retryWrites=true&w=majority&appName=inchiriere-apartamente`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let isConnected = false;

/**
 * Conecteaza clientul (o singura data) si returneaza instanta de database.
 */
async function connectDB() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log('🗄️ MongoDB connected');
    }
    // a doua data pur si simplu returneaza database
    return client.db(process.env.DB_NAME || 'inchiriere-apartamente');
}

module.exports = { connectDB };
