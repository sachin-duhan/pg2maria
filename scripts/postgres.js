// postgres-query.js
const dotenv = require('dotenv');
const { Client } = require('pg');
const faker = require('@faker-js/faker').faker;

dotenv.config();

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 1000;
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 10000;
const SMALL_DATASET_USERS = parseInt(process.env.SMALL_DATASET_USERS) || 100;

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
});

const performanceMetrics = [];

async function bulkInsertUsers(client, users, batchSize) {
  const startTime = Date.now();

  // Truncate the table before bulk insert
  await client.query('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;');

  const totalBatches = Math.ceil(users.length / batchSize);

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const values = [];
    const placeholders = batch
      .map((_, index) => {
        const idx = index * 3;
        values.push(batch[index].username, batch[index].email, batch[index].password);
        return `($${idx + 1}, $${idx + 2}, $${idx + 3})`;
      })
      .join(', ');

    const query = `INSERT INTO "user" (username, email, password) VALUES ${placeholders}`;

    await client.query('BEGIN');
    try {
      await client.query(query, values);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
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

async function sequentialInsertUsers(client, users) {
  const startTime = Date.now();

  // Truncate the table before sequential insert
  await client.query('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;');

  await client.query('BEGIN');
  try {
    for (const user of users) {
      await client.query(
        'INSERT INTO "user" (username, email, password) VALUES ($1, $2, $3)',
        [user.username, user.email, user.password]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  const endTime = Date.now();
  performanceMetrics.push({
    Operation: `Sequential Insert of ${users.length} Users`,
    Time_ms: endTime - startTime,
  });
}

async function bulkInsertTasks(client, tasks, batchSize) {
  const startTime = Date.now();

  // Truncate the tasks table before bulk insert
  await client.query('TRUNCATE TABLE "tasks" RESTART IDENTITY;');

  const totalBatches = Math.ceil(tasks.length / batchSize);

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const values = [];
    const placeholders = batch
      .map((_, index) => {
        const idx = index * 3;
        values.push(batch[index].user_id, batch[index].title, batch[index].description);
        return `($${idx + 1}, $${idx + 2}, $${idx + 3})`;
      })
      .join(', ');

    const query = `INSERT INTO "tasks" (user_id, title, description) VALUES ${placeholders}`;

    await client.query('BEGIN');
    try {
      await client.query(query, values);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
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
  try {
    await client.connect();

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
    await bulkInsertUsers(client, users, BATCH_SIZE);

    // Sequential insert users
    await sequentialInsertUsers(client, users);

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
    await bulkInsertUsers(client, smallUsers, BATCH_SIZE);

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
    await bulkInsertTasks(client, tasks, BATCH_SIZE);

    // Perform join query
    const startTime = Date.now();
    await client.query(`
      SELECT u.username, t.title, t.description
      FROM "user" u
      JOIN "tasks" t ON u.id = t.user_id
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
    await client.end();
  }
}

run();
