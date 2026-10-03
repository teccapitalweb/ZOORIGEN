import { createApp } from './app.js';
import { readConfig, validateFirebaseProject } from './config.js';

const config = readConfig();
if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID) {
  validateFirebaseProject(config.firebaseProjectId);
}

createApp({ config }).listen(config.port, '0.0.0.0', () => {
  console.log(`ZOORIGEN API escuchando en el puerto ${config.port}`);
});
