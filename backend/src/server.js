const app = require('./app');
const { env, assertEnv } = require('./config/env');

try {
  assertEnv();
} catch (error) {
  console.error(`[FCE-SI] ${error.message}`);
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`[FCE-SI] API démarrée sur http://localhost:${env.port} (${env.nodeEnv})`);
});
