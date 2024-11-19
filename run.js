// compare-performance.js
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();

const NUM_RUNS = parseInt(process.env.NUM_RUNS) || 10;

const postgresScript = 'scripts/postgres.js';
const mariadbScript = 'scripts/maria.js';

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptName}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptName}:`, stderr);
        reject(error);
      } else {
        try {
          // Since the scripts output only JSON to stdout, we can parse it directly
          const metrics = JSON.parse(stdout);
          resolve(metrics);
        } catch (parseError) {
          console.error(`Error parsing output from ${scriptName}:`, parseError);
          reject(parseError);
        }
      }
    });
  });
}

async function comparePerformance() {
  const postgresResults = [];
  const mariadbResults = [];

  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log(`\nRun ${i} of ${NUM_RUNS} for PostgreSQL`);
    try {
      const metrics = await runScript(postgresScript);
      postgresResults.push(metrics);
    } catch (error) {
      console.error('PostgreSQL script failed:', error);
    }

    console.log(`\nRun ${i} of ${NUM_RUNS} for MariaDB`);
    try {
      const metrics = await runScript(mariadbScript);
      mariadbResults.push(metrics);
    } catch (error) {
      console.error('MariaDB script failed:', error);
    }
  }

  if (postgresResults.length === 0 || mariadbResults.length === 0) {
    console.error('No results to compare.');
    return;
  }

  // Aggregate and compare performance metrics
  const operations = postgresResults[0].map(metric => metric.Operation);
  const comparisonTable = [];

  for (let opIndex = 0; opIndex < operations.length; opIndex++) {
    const operation = operations[opIndex];
    const postgresTimes = postgresResults.map(run => run[opIndex].Time_ms);
    const mariadbTimes = mariadbResults.map(run => run[opIndex].Time_ms);

    const postgresAvg = average(postgresTimes);
    const mariadbAvg = average(mariadbTimes);

    comparisonTable.push({
      Operation: operation,
      'PostgreSQL Avg Time (ms)': postgresAvg.toFixed(2),
      'MariaDB Avg Time (ms)': mariadbAvg.toFixed(2),
    });
  }

  console.log('\nPerformance Comparison:');
  console.table(comparisonTable);
}

function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

comparePerformance();
