import { PORT } from './config/env.js';
import { server } from './app.js';

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Skribbl clone server listening on port ${PORT}`);
});