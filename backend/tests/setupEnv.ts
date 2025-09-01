process.env.POSTGRES_URL =
    process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5433/flash_sale_test';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5673';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
