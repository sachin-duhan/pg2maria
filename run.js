// compare-performance.js
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config();

const NUM_RUNS = parseInt(process.env.NUM_RUNS) || 1;

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
          const metrics = JSON.parse(stdout);
          resolve(metrics);
        } catch (parseError) {
          console.error(`Error parsing output from ${scriptName}:`, parseError);
          console.error('Stdout:', stdout);
          console.error('Stderr:', stderr);
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
    const postgresTimes = postgresResults.map(run => parseFloat(run[opIndex].Time));
    const mariadbTimes = mariadbResults.map(run => parseFloat(run[opIndex].Time));

    const postgresAvg = average(postgresTimes);
    const mariadbAvg = average(mariadbTimes);

    comparisonTable.push({
      Operation: operation,
      'PostgreSQL Avg Time': `${postgresAvg.toFixed(2)} ${postgresResults[0][opIndex].Unit}`,
      'MariaDB Avg Time': `${mariadbAvg.toFixed(2)} ${mariadbResults[0][opIndex].Unit}`,
    });
  }

  console.log('\nPerformance Comparison:');
  console.table(comparisonTable);
}

function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

comparePerformance();
