/**
 * Backend Server Entrypoint
 * Starts HTTP listener on configured port and performs initial database verification.
 */

const app = require('./app');
const config = require('./config');
const db = require('./config/db');

async function startServer() {
  try {
    // Non-blocking database sanity check
    const checkRes = await db.query('SELECT current_database(), version();');
    console.log(`[+] Connected to Supabase DB: ${checkRes.rows[0].current_database}`);

    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`  MPLADS REST API Gateway running on port ${config.port}`);
      console.log(`  Environment: ${config.env}`);
      console.log(`  ML Microservice Bridge: ${config.mlServiceUrl}`);
      console.log(`=======================================================`);
    });

    return server;
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
