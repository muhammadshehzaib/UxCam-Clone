import app from './app';
import { config } from './config';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API running on http://0.0.0.0:${config.port}`);
});
