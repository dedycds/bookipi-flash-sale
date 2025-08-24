import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { processQueuedOrder } from './handlers/order/index';
import type { Order } from './handlers/order/types';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import orderRoutes from './routes/order';
import saleRoutes from './routes/sale';
import userRoutes from './routes/user';
import { connectRabbitMQ, consumeFromQueue, disconnectRabbitMQ } from './services/rabbitmq';
import { connectRedis, disconnectRedis } from './services/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// // Rate limiting
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//     message: 'Too many requests from this IP, please try again later.',
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/users', userRoutes);
// Public read endpoints for sales (status, product)
app.use('/sales', saleRoutes);
app.use('/orders', authMiddleware, orderRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await disconnectRabbitMQ();
    await disconnectRedis();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await disconnectRabbitMQ();
    await disconnectRedis();
    process.exit(0);
});

/**
 * Start other services
 * - redis
 * - queue service
 */
const startServices = async () => {
    try {
        await connectRedis();
        await connectRabbitMQ();
        consumeFromQueue<Order>('order_queue', async message => {
            await processQueuedOrder(message);
        });
    } catch (error) {
        console.error('Failed to start services:', error);
        process.exit(1);
    }
};

startServices();

export default app;
