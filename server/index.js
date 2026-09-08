import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 LLD Practice Platform Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`⚡ Environment: Node.js (ES Modules)`);
  console.log(`=======================================================`);
});
