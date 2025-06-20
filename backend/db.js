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

async function connectDB() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log('MongoDB connected');
    }
    return client.db(process.env.DB_NAME || 'inchiriere-apartamente');
}

module.exports = { connectDB };