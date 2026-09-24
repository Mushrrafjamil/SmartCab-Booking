const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

dotenv.config();
connectDB();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(mongoSanitize());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cab Booking API is running successfully!'
  });       
});
app.get('/',(req,res)=>{
  res.send('cab booking api is running successfully');
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Cab Booking API is running' });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/addresses', require('./routes/address'));
app.use('/api/drivers', require('./routes/driver'));
app.use('/api/vehicles', require('./routes/vehicle'));
app.use('/api/rides', require('./routes/ride'));
app.use('/api/coupons', require('./routes/coupon'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/reports', require('./routes/report'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/wallet', require('./routes/wallet.routes'));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.io enabled for live ride tracking');
});