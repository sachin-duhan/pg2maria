// mariadb-query.js
const dotenv = require('dotenv');
const mariadb = require('mariadb');
const faker = require('@faker-js/faker').faker;

dotenv.config();

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 1000;
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 10000;
const SMALL_DATASET_USERS = parseInt(process.env.SMALL_DATASET_USERS) || 100;

const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST || 'localhost',
  user: process.env.MARIADB_USER,
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DATABASE,
  port: process.env.MARIADB_PORT || 3306,
  connectionLimit: 5,
});

const performanceMetrics = [];

async function bulkInsertUsers(conn, users, batchSize) {
  const startTime = Date.now();

  // Disable foreign key checks before truncating the user table
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
  await conn.query('TRUNCATE TABLE `user`;');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

  const totalBatches = Math.ceil(users.length / batchSize);

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const placeholders = batch.map(() => '(?, ?, ?)').join(', ');
    const values = [];
    batch.forEach(user => {
      values.push(user.username, user.email, user.password);
    });

    const query = `INSERT INTO \`user\` (username, email, password) VALUES ${placeholders}`;

    await conn.beginTransaction();
    try {
      await conn.query(query, values);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    if (totalBatches > 1) {
      const currentBatch = Math.floor(i / batchSize) + 1;
      console.error(`Inserted batch ${currentBatch} of ${totalBatches}`);
    }
  }

  const endTime = Date.now();
  performanceMetrics.push({
    Operation: `Bulk Insert of ${users.length} Users`,
    Time_ms: endTime - startTime,
  });
}

async function sequentialInsertUsers(conn, users) {
  const startTime = Date.now();

  // Disable foreign key checks before truncating the user table
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
  await conn.query('TRUNCATE TABLE `user`;');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

  await conn.beginTransaction();
  try {
    for (const user of users) {
      await conn.query(
        'INSERT INTO `user` (username, email, password) VALUES (?, ?, ?)',
        [user.username, user.email, user.password]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  const endTime = Date.now();
  performanceMetrics.push({
    Operation: `Sequential Insert of ${users.length} Users`,
    Time_ms: endTime - startTime,
  });
}

async function bulkInsertTasks(conn, tasks, batchSize) {
  const startTime = Date.now();

  // Truncate the tasks table before bulk insert
  await conn.query('TRUNCATE TABLE `tasks`;');

  const totalBatches = Math.ceil(tasks.length / batchSize);

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const placeholders = batch.map(() => '(?, ?, ?)').join(', ');
    const values = [];
    batch.forEach(task => {
      values.push(task.user_id, task.title, task.description);
    });

    const query = `INSERT INTO \`tasks\` (user_id, title, description) VALUES ${placeholders}`;

    await conn.beginTransaction();
    try {
      await conn.query(query, values);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    if (totalBatches > 1) {
      const currentBatch = Math.floor(i / batchSize) + 1;
      console.error(`Inserted batch ${currentBatch} of ${totalBatches}`);
    }
  }

  const endTime = Date.now();
  performanceMetrics.push({
    Operation: `Bulk Insert of ${tasks.length} Tasks`,
    Time_ms: endTime - startTime,
  });
}

async function run() {
  let conn;
  try {
    conn = await pool.getConnection();

    // Generate users
    const users = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
      users.push({
        username: faker.internet.username(),
        email: `user${i}@example.com`,
        password: faker.internet.password(),
      });
    }

    // Bulk insert users
    await bulkInsertUsers(conn, users, BATCH_SIZE);

    // Sequential insert users
    await sequentialInsertUsers(conn, users);

    // Generate small dataset users
    const smallUsers = [];
    for (let i = 0; i < SMALL_DATASET_USERS; i++) {
      smallUsers.push({
        username: faker.internet.username(),
        email: `smalluser${i}@example.com`,
        password: faker.internet.password(),
      });
    }

    // Bulk insert small dataset users
    await bulkInsertUsers(conn, smallUsers, BATCH_SIZE);

    // Generate tasks for small dataset users
    const tasks = [];
    for (let userId = 1; userId <= SMALL_DATASET_USERS; userId++) {
      tasks.push({
        user_id: userId,
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
      });
    }

    // Bulk insert tasks
    await bulkInsertTasks(conn, tasks, BATCH_SIZE);

    // Perform join query
    const startTime = Date.now();
    await conn.query(`
      SELECT u.username, t.title, t.description
      FROM \`user\` u
      JOIN \`tasks\` t ON u.id = t.user_id
      LIMIT 10;
    `);
    const endTime = Date.now();
    performanceMetrics.push({
      Operation: 'Join Query',
      Time_ms: endTime - startTime,
    });

    // Output performance metrics as JSON
    console.log(JSON.stringify(performanceMetrics));
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

run();
