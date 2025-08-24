import { Pool } from 'pg';

const pool = new Pool({
    connectionString:
        process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/flash_sale',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', err => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
