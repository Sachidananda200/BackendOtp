const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Hardcoded database details
const hardcodedDBDetails = {
    host: '114.79.172.202',
    user: 'root',
    password: 'Apmosys@123',
    database: 'test'
};

// Function to create a new database connection pool
async function createPool() {
    try {
        const pool = mysql.createPool({
            host: hardcodedDBDetails.host,
            user: hardcodedDBDetails.user,
            password: hardcodedDBDetails.password,
            database: hardcodedDBDetails.database,
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
                sender VARCHAR(255) NOT NULL,
                Messege_time DATETIME NOT NULL,
                message TEXT NOT NULL,
                otp VARCHAR(10),
                user_mobile VARCHAR(20) NOT NULL
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

    // Compare incoming details with hardcoded ones
    if (
        host !== hardcodedDBDetails.host ||
        user !== hardcodedDBDetails.user ||
        password !== hardcodedDBDetails.password ||
        database !== hardcodedDBDetails.database
    ) {
        return res.status(403).send('Invalid database details');
    }

    res.status(200).send('Database details validated successfully');
});


// Endpoint to handle receiving SMS data from Flutter app
app.post('/sms', async (req, res) => {
    const { sender, message, message_time, user_mobile } = req.body;
    if (!sender || !message || !message_time || !user_mobile) {
        return res.status(400).send('Incomplete SMS data');
    }

    try {
        // Extract OTP from message
        const otpRegex = /\b\d{4,6}|\b\d{16}\b/;
        const otpMatch = message.match(otpRegex);
        const otp = otpMatch ? otpMatch[0] : null;
 const Message_Time = moment(message_time).format('YYYY/MM/DD HH:mm:ss');
        console.log(sender);
         console.log(Messege_time);
         console.log(otp);
         console.log(user_mobile);
         console.log(message);
        
        // Get connection pool
        const pool = await createPool();

        // Store data in the database
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO IGRS_Message (sender, Messege_time, message, otp, user_mobile) VALUES (?, ?, ?, ?, ?)', [sender, message_time, message, otp, user_mobile]);
        connection.release();

        console.log('SMS data stored successfully');
        res.status(200).send('SMS data stored successfully');
    } catch (error) {
        console.log('Error storing SMS data:', error);
        res.status(500).send('Error storing SMS data');
    }
});

// Start the server
app.listen(port,  () => {
    console.log(`Server is running on http://192.168.160.29:${port}`);
});



