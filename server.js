//const { Pool } = require('pg');
const { Client } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// Configure middleware
app.use(bodyParser.json());
app.use(cors());

// // PostgreSQL connection settings
// const pool = new Pool({
//     user: 'app',
//     host: 'mildly-kind-rabbit.a1.pgedge.io',
//     database: 'vishrutaattendancesystems',
//     password: '70iWwCw254DfWyAH52S255qR',
//     port: 5432,
// });

const dbConfig = {
    user: 'app',
    host: 'mildly-kind-rabbit.a1.pgedge.io',
    database: 'vishrutaattendancesystems',
    password: '70iWwCw254DfWyAH52S255qR',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
};

const client = new Client(dbConfig);
client.connect();


// Endpoint to insert data into PostgreSQL
app.post('/check_emp_exists', async (req, res) => {
    const { emp_id } = req.body;
    console.log(emp_id);
    try {
        const check_exist = `SELECT employee_id FROM employees_details WHERE employee_id = $1`;
        const check_exist_result = await client.query(check_exist, [emp_id]);
        if (check_exist_result.rows.length > 0) {
            res.json({ exists: true, employee_id: check_exist_result.rows[0].employee_id });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



// Endpoint to fetch data from PostgreSQL
app.get('/data', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM employees_details');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Endpoint to insert data into PostgreSQL
app.post('/data', async (req, res) => {
    const { column1, column2 } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO your_table_name (column1, column2) VALUES ($1, $2) RETURNING *',
            [column1, column2]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
