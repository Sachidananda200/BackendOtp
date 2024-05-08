const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Hardcoded database details
const hardcodedDBDetails = {
    db1: {
        host: '114.79.172.202',
        user: 'root',
        password: 'Apmosys@123',
        database: 'test'
    },
    db2: {
        host: '114.79.172.202',
        user: 'apmosys',
        password: 'Apmosys@123',
        database: 'test'
    },
    db3: {
        host: '192.168.12.74',
        user: 'admin',
        password: 'Apmosys@123',
        database: 'test'
    }
};

// Declare connection pools for each database
let pools = {};

// Function to create a new database connection pool
async function createPool(dbName, dbDetails) {
    try {
        pools[dbName] = await mysql.createPool({
            host: dbDetails.host,
            user: dbDetails.user,
            password: dbDetails.password,
            database: dbDetails.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log(`Database connection pool created for ${dbName}`);
    } catch (error) {
        console.log(`Error creating database connection pool for ${dbName}:`, error);
        throw error;
    }
}

// Call function to create connection pools during server startup
Object.entries(hardcodedDBDetails).forEach(async ([dbName, dbDetails]) => {
    await createPool(dbName, dbDetails);
});

// Function to create SMS data table for a given database
async function createSmsDataTable(dbName) {
    try {
        const connection = await pools[dbName].getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS IGRS_Message (
                sender VARCHAR(255) NOT NULL,
                Messege_time DATETIME NOT NULL,
                message TEXT NOT NULL,
                otp VARCHAR(10),
                user_mobile VARCHAR(20) NOT NULL
            )
        `);
        connection.release();
        console.log(`SMS data table created or already exists for ${dbName}`);
    } catch (error) {
        console.log(`Error creating SMS data table for ${dbName}:`, error);
    }
}

// Call function to create SMS data tables when server starts up
Object.keys(pools).forEach(async dbName => {
    await createSmsDataTable(dbName);
});

// Endpoint to receive database details from the frontend
app.post('/validate_database', async (req, res) => {
    const { host, user, password, database } = req.body;
    if (!host || !user || !password || !database) {
        return res.status(400).send('Incomplete database details');
    }

    // Check if the received database details match any of the hardcoded ones
    const matchedDB = Object.keys(hardcodedDBDetails).find(dbName =>
        host === hardcodedDBDetails[dbName].host &&
        user === hardcodedDBDetails[dbName].user &&
        password === hardcodedDBDetails[dbName].password &&
        database === hardcodedDBDetails[dbName].database
    );

    if (!matchedDB) {
        return res.status(403).send('Invalid database details');
    }

    res.status(200).send('Database details validated successfully');
});

// Endpoint to handle receiving SMS data from Flutter app
app.post('/sms', async (req, res) => {
    const { dbName, sender, message, message_time, user_mobile } = req.body;
    if (!dbName || !sender || !message || !message_time || !user_mobile) {
        return res.status(400).send('Incomplete SMS data');
    }

    try {
        // Extract OTP from message
        const otpRegex = /\b\d{4,6}|\b\d{16}\b/;
        const otpMatch = message.match(otpRegex);
        const otp = otpMatch ? otpMatch[0] : null;

        const Messege_time = moment(message_time).format('YYYY/MM/DD HH:mm:ss');
        console.log(sender, Messege_time, otp, user_mobile, message);

        // Get connection from pool
        const connection = await pools[dbName].getConnection();

        // Store data in the database
        await connection.query('INSERT INTO IGRS_Message (sender, Messege_time, message, otp, user_mobile) VALUES (?, ?, ?, ?, ?)', [sender, Messege_time, message, otp, user_mobile]);

        // Release connection back to pool
        connection.release();

        console.log('SMS data stored successfully');
        res.status(200).send('SMS data stored successfully');
    } catch (error) {
        console.log('Error storing SMS data:', error);
        res.status(500).send('Error storing SMS data');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://192.168.160.29:${port}`);
});
