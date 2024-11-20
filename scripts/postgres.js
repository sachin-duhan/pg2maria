// postgres-query.js
const dotenv = require('dotenv');
const { Client } = require('pg');
const { performance } = require('perf_hooks');
const faker = require('@faker-js/faker').faker;

dotenv.config();

const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 10000;
const TIME_UNIT = process.env.TIME_UNIT || 'ms'; // 'ms', 'µs', 'ns'

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

const performanceMetrics = [];

function convertTime(duration) {
  const nanoseconds = duration[0] * 1e9 + duration[1];
  switch (TIME_UNIT) {
    case 'ms':
      return nanoseconds / 1e6;
    case 'µs':
      return nanoseconds / 1e3;
    case 'ns':
      return nanoseconds;
    default:
      return nanoseconds;
  }
}

async function writeTest() {
  try {
    // Truncate 'user' and 'tasks' tables to ensure a clean state
    await client.query('TRUNCATE TABLE "tasks" RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;');

    const users = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
      users.push({
        username: faker.internet.username(),
        email: `user${i}@example.com`,
        password: faker.internet.password(),
      });
    }

    // Measure write performance (bulk insert)
    const startTime = process.hrtime();
    await client.query('BEGIN');
    const values = [];
    const placeholders = users
      .map((_, i) => {
        const idx = i * 3;
        values.push(users[i].username, users[i].email, users[i].password);
        return `($${idx + 1}, $${idx + 2}, $${idx + 3})`;
      })
      .join(', ');

    const query = `INSERT INTO "user" (username, email, password) VALUES ${placeholders}`;
    await client.query(query, values);
    await client.query('COMMIT');
    const endTime = process.hrtime(startTime);
    performanceMetrics.push({
      Operation: `Write ${TOTAL_USERS} Users`,
      Time: convertTime(endTime).toFixed(2),
      Unit: TIME_UNIT,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in writeTest:', err);
    throw err;
  }
}

async function readTest() {
  try {
    // Measure read performance (select)
    const startTime = process.hrtime();
    const res = await client.query('SELECT * FROM "user";');
    const endTime = process.hrtime(startTime);
    performanceMetrics.push({
      Operation: `Read ${res.rowCount} Users`,
      Time: convertTime(endTime).toFixed(2),
      Unit: TIME_UNIT,
    });
  } catch (err) {
    console.error('Error in readTest:', err);
    throw err;
  }
}

async function deleteTest() {
  try {
    // Measure delete performance
    const startTime = process.hrtime();
    await client.query('DELETE FROM "user";');
    const endTime = process.hrtime(startTime);
    performanceMetrics.push({
      Operation: `Delete ${TOTAL_USERS} Users`,
      Time: convertTime(endTime).toFixed(2),
      Unit: TIME_UNIT,
    });
  } catch (err) {
    console.error('Error in deleteTest:', err);
    throw err;
  }
}

async function run() {
  try {
    await client.connect();
    console.error('Connected to PostgreSQL database.');

    await writeTest();
    await readTest();
    await deleteTest();

    // Output performance metrics as JSON
    console.log(JSON.stringify(performanceMetrics));
  } catch (err) {
    console.error('Error in run function:', err);
    // Ensure that performance metrics are outputted even if incomplete
    console.log(JSON.stringify(performanceMetrics));
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
