import { createApp } from './app.js';
import { readConfig, validateFirebaseProject } from './config.js';
import { createServices } from './services.js';

const config = readConfig();
if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID) {
  validateFirebaseProject(config.firebaseProjectId);
}

const services = createServices(config);
createApp({ config, services }).listen(config.port, '0.0.0.0', () => {
  console.log(`ZOORIGEN API escuchando en el puerto ${config.port}`);
});
