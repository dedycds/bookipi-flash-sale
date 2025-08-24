import { createClient } from 'redis';

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', err => {
    console.error('Redis Client Error', err);
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

export const connectRedis = async () => {
    try {
        await client.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
};

export const disconnectRedis = async () => {
    await client.quit();
};

export default client;
