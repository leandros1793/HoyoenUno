import express from 'express';
import paymentRoutes from './routes/payment.routes.js';
import morgan from 'morgan';
import { PORT } from './config.js';
const app = express();

app.use(morgan('dev'));
app.use('/payment', paymentRoutes);

app.listen(PORT);
console.log('Server running on port', PORT);