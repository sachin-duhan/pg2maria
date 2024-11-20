# Database Performance Comparison: PostgreSQL vs. MariaDB

## Overview

This project evaluates and compares the performance of **PostgreSQL** and **MariaDB** databases focusing on three primary operations:

1. **Write** (Bulk Insert of 10,000 Users)
2. **Read** (Select All Users)
3. **Delete** (Remove All Users)

The comparison is based on average execution times measured in microseconds (µs) over multiple runs.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Environment Configuration](#environment-configuration)
  - [Database Schemas](#database-schemas)
  - [Docker Compose](#docker-compose)
- [Makefile Commands](#makefile-commands)
- [Running the Tests](#running-the-tests)
- [Performance Results](#performance-results)
- [Troubleshooting](#troubleshooting)
- [Conclusion](#conclusion)

## Prerequisites

- **Node.js** (v14 or later)
- **npm** (Node Package Manager)
- **Docker** and **Docker Compose** (for containerized databases)
- **PostgreSQL** and **MariaDB** Docker images

## Setup

### Environment Configuration

Create a `.env` file in the project root with the following configurations:

```env
# .env

# PostgreSQL Configuration
POSTGRES_USER=your_postgres_username
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=your_postgres_database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# MariaDB Configuration
MARIADB_USER=your_mariadb_username
MARIADB_PASSWORD=your_mariadb_password
MARIADB_DATABASE=your_mariadb_database
MARIADB_HOST=localhost
MARIADB_PORT=3306

# Performance Test Configuration
BATCH_SIZE=1000
TOTAL_USERS=10000
NUM_RUNS=3

# Time Units: 'ms' for milliseconds, 'µs' for microseconds, 'ns' for nanoseconds
TIME_UNIT=µs
```

**Replace** the placeholders (e.g., `your_postgres_username`) with your actual database credentials.

### Database Schemas

Ensure both PostgreSQL and MariaDB have the necessary tables with the correct schemas.

**PostgreSQL:**

```sql
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE "tasks" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**MariaDB:**

```sql
CREATE TABLE `user` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE `tasks` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
```

## Commands

A `Makefile` is provided to streamline common tasks. Below are the available commands:

```makefile
.PHONY: all init install up up-dev postgres mariadb logs logs-dev down clean performance

all: init install up postgres mariadb

setup:
	npm install

up:
	docker-compose -f docker-compose.dev.yml --env-file .env up -d

postgres:
	node scripts/postgres.js

mariadb:
	node scripts/maria.js

logs:
	docker-compose -f docker-compose.dev.yml logs -f

down:
	docker-compose -f docker-compose.dev.yml down 

clean:
	rm -rf node_modules package-lock.json

performance:
	node run.js
```

### Command Descriptions

- `make all`: Runs `init`, `install`, `up`, `postgres`, and `mariadb` sequentially.
- `make setup`: Installs necessary npm packages.
- `make up`: Starts the Docker containers for PostgreSQL and MariaDB.
- `make postgres`: Executes the PostgreSQL performance test script.
- `make mariadb`: Executes the MariaDB performance test script.
- `make logs`: Streams the Docker logs.
- `make down`: Stops and removes the Docker containers.
- `make clean`: Removes `node_modules` and `package-lock.json`.
- `make performance`: Runs the performance comparison script.

## Running the Tests

1. **Install Dependencies:**

   ```bash
   make setup
   ```

2. **Start Database Containers:**

   ```bash
   make up
   ```

3. **Run Performance Tests:**

   ```bash
   make performance
   ```

   This command will execute both PostgreSQL and MariaDB performance scripts for the number of runs specified in the `.env` file (`NUM_RUNS=3`).

4. **View Logs (Optional):**

   ```bash
   make logs
   ```

5. **Stop Database Containers:**

   ```bash
   make down
   ```

## Performance Results

After running the tests, you will receive a comparison table summarizing the average execution times for each operation across PostgreSQL and MariaDB.

### Sample Output

```
Performance Comparison:
┌───────────────────────────┬───────────────────────┬─────────────────────┐
│          Operation        │ PostgreSQL Avg Time   │ MariaDB Avg Time    │
├───────────────────────────┼───────────────────────┼─────────────────────┤
│ Write 10000 Users         │ 73653.01 µs           │ 74811.63 µs         │
│ Read 10000 Users          │ 6945.86 µs            │ 6319.56 µs          │
│ Delete 10000 Users        │ 32463.53 µs           │ 17780.92 µs         │
└───────────────────────────┴───────────────────────┴─────────────────────┘
```

### Mathematical Comparison

| Operation            | PostgreSQL Avg Time | MariaDB Avg Time | Faster Database | Margin (%)      |
|----------------------|---------------------|-------------------|------------------|------------------|
| Write 10,000 Users   | 73,653.01 µs        | 74,811.63 µs      | PostgreSQL       | 1.57% faster     |
| Read 10,000 Users    | 6,945.86 µs         | 6,319.56 µs       | MariaDB          | 9.01% faster     |
| Delete 10,000 Users  | 32,463.53 µs        | 17,780.92 µs      | MariaDB          | 45.24% faster    |

**Summary:**

- **Write Operations:** PostgreSQL is slightly faster than MariaDB by **1.57%**.
- **Read Operations:** MariaDB outperforms PostgreSQL by **9.01%**.
- **Delete Operations:** MariaDB significantly outperforms PostgreSQL by **45.24%**.

## Conclusion

Provides a straightforward comparison between PostgreSQL and MariaDB databases, focusing on essential operations: writing, reading, and deleting large datasets. The results indicate:

- **PostgreSQL** has a slight edge in write performance.
- **MariaDB** outperforms PostgreSQL in both read and delete operations, with a significant margin in deletions.

These insights can guide database selection based on specific application needs, especially where read and delete operations are critical.

---

For any further questions or assistance, feel free to reach out @sachin-duhan!