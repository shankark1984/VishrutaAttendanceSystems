const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// Configure middleware
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL connection settings
const pool = new Pool({
  user: 'app',
  host: 'mildly-kind-rabbit-pdt.a1.pgedge.io',
  database: 'vishrutaattendancesystems',
  password: '70iWwCw254DfWyAH52S255qR',
  port: 5432,
});

// Endpoint to fetch data from PostgreSQL
app.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees_details');
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
    const result = await pool.query(
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
  console.log(`Server running on https://vishrutaattendancesystems.netlify.app/:${port}`);
});