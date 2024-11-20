// mariadb-query.js
const dotenv = require('dotenv');
const mariadb = require('mariadb');
const { performance } = require('perf_hooks');
const faker = require('@faker-js/faker').faker;

dotenv.config();

const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 10000;
const TIME_UNIT = process.env.TIME_UNIT || 'ms'; // 'ms', 'µs', 'ns'

const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  port: parseInt(process.env.MARIADB_PORT) || 3306,
  connectionLimit: 5,
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

async function writeTest(conn) {
  try {
    // Disable foreign key checks before truncating
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    // Truncate 'tasks' and 'user' tables
    await conn.query('TRUNCATE TABLE `tasks`;');
    await conn.query('TRUNCATE TABLE `user`;');
    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

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
    await conn.beginTransaction();
    const placeholders = users.map(() => '(?, ?, ?)').join(', ');
    const values = [];
    users.forEach(user => {
      values.push(user.username, user.email, user.password);
    });

    const query = `INSERT INTO \`user\` (username, email, password) VALUES ${placeholders}`;
    await conn.query(query, values);
    await conn.commit();
    const endTime = process.hrtime(startTime);
    performanceMetrics.push({
      Operation: `Write ${TOTAL_USERS} Users`,
      Time: convertTime(endTime).toFixed(2),
      Unit: TIME_UNIT,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error in writeTest:', err);
    throw err;
  }
}

async function readTest(conn) {
  try {
    // Measure read performance (select)
    const startTime = process.hrtime();
    const rows = await conn.query('SELECT * FROM `user`;');
    const endTime = process.hrtime(startTime);
    performanceMetrics.push({
      Operation: `Read ${rows.length} Users`,
      Time: convertTime(endTime).toFixed(2),
      Unit: TIME_UNIT,
    });
  } catch (err) {
    console.error('Error in readTest:', err);
    throw err;
  }
}

async function deleteTest(conn) {
  try {
    // Delete all users
    const startTime = process.hrtime();
    await conn.query('DELETE FROM `user`;');
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
  let conn;
  try {
    conn = await pool.getConnection();
    console.error('Connected to MariaDB database.');

    await writeTest(conn);
    await readTest(conn);
    await deleteTest(conn);

    // Output performance metrics as JSON
    console.log(JSON.stringify(performanceMetrics));
  } catch (err) {
    console.error('Error in run function:', err);
    // Ensure that performance metrics are outputted even if incomplete
    console.log(JSON.stringify(performanceMetrics));
    process.exit(1);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

run();
