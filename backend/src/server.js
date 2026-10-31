import { PORT } from './config/env.js';
import { server } from './app.js';

server.listen(PORT, () =>
  console.log(`Skribbl clone server listening on port ${PORT}`),
);
