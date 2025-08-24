-- Create database if not exists
SELECT 'CREATE DATABASE flash_sale'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'flash_sale')\gexec

-- Connect to the database
\c flash_sale;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price_in_cent INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create flash_sales table
CREATE TABLE IF NOT EXISTS flash_sales (
    flash_sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(product_id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(product_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    reserved_token VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_product ON orders(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_flash_sales_dates ON flash_sales(start_date, end_date);

-- Insert sample product
INSERT INTO products (product_id, name, price_in_cent, quantity) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Premium Wireless Headphones',
    9999,
    100
) ON CONFLICT (product_id) DO NOTHING;

-- Insert sample flash sale
INSERT INTO flash_sales (flash_sale_id, product_id, start_date, end_date)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours'
) ON CONFLICT (flash_sale_id) DO NOTHING;
