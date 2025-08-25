## **🏗️ Architecture**

Please see the [system design doc here](./system-design/System-Design.md) for the proposed system design stack and tradeoff

The code implemented in this repo currently consists of frontend and backend architecture that a little bit different for simplicity of the take home test implementation

**Frontend:** React + Vite (TypeScript), React Query, React Router 

**Backend:**  (Express)

**Infra:** Redis, PostgreSQL, RabbitMQ, Docker Compose

## **🚀 Quick Start**

### **Prerequisites**

- Docker & Docker Compose
- Node.js 18+

### **Running with Docker Compose**

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd bookipi-flash-sale

    ```

2. Build and start all services:

    ```bash
    docker-compose build && docker-compose up -d

    ```

    Running this script will automatically populate the flash sale and product data.
    You would need to use the `POST /sales/update` endpoint to adjust `start_date`, `end_date` and `quantity`

3. Access:
    - Frontend: [http://localhost:3000](http://localhost:3000/)
    - Backend: [http://localhost:8000](http://localhost:8000/)
    - RabbitMQ: [http://localhost:15672](http://localhost:15672/) (guest/guest)

### **Development Setup**

1. Install dependencies for each service:

    ```bash
    npm install
    cd frontend && npm install
    cd backend && npm install
    ```

## **📋 API Endpoints**

### **Auth & Users**

- `POST /users` — Register user, returns JWT
    - Body

    ```jsx
    {
        "email": "test2@mailinator.com",
        "password": "12345678"
    }
    ```

    - Response

    ```jsx
    {
        "user_id": "1fb06744-a5e4-43cf-88b2-e0971e9b6f9c",
        "email": "test2@mailinator.com",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFmYjA2NzQ0LWE1ZTQtNDNjZi04OGIyLWUwOTcxZTliNmY5YyIsImVtYWlsIjoidGVzdDJAbWFpbGluYXRvci5jb20iLCJpYXQiOjE3NTYwMjEzMzQsImV4cCI6MTc1NjEwNzczNH0.DKfsUDuoUHnCTXf1LZfDk67909Gg4WjgSQnaZbzM13w"
    }
    ```

- `POST /users/authenticate` — Login, returns JWT
    - Body

    ```jsx
    {
        "email": "test2@mailinator.com",
        "password": "12345678"

    ```

    - Response

    ```jsx
    {
        "user_id": "1fb06744-a5e4-43cf-88b2-e0971e9b6f9c",
        "email": "test2@mailinator.com",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFmYjA2NzQ0LWE1ZTQtNDNjZi04OGIyLWUwOTcxZTliNmY5YyIsImVtYWlsIjoidGVzdDJAbWFpbGluYXRvci5jb20iLCJpYXQiOjE3NTYwMjEzMzQsImV4cCI6MTc1NjEwNzczNH0.DKfsUDuoUHnCTXf1LZfDk67909Gg4WjgSQnaZbzM13w"
    }
    ```

### **Flash Sale**

- `GET /sales` — Sale status (product, stock, sale start date and sale end date)
    - Response

    ```jsx
    {
        "flash_sale_id": "550e8400-e29b-41d4-a716-446655440001",
        "start_date": "2025-08-25T02:21:13.177Z",
        "end_date": "2025-08-25T03:39:44.694Z",
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "quantity": 100,
        "name": "Premium Wireless Headphones",
        "price_in_cent": 9999,
        "status": "ended",
        "remaining_stock": 100
    }
    ```

- `POST /sales/update` - Configure the start date, end date and quantity for the flash sale product.
    - Body

    ```jsx
    {
        "start_date": "2025-08-25T02:21:13.177Z",
        "end_date" : "2025-08-25T03:48:44.694Z",
        "quantity": 100
    }
    ```

    - Response

    ```
    {
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "start_date": "2025-08-25T02:21:13.177Z",
        "end_date": "2025-08-25T03:48:44.694Z",
        "flash_sale_id": "550e8400-e29b-41d4-a716-446655440001",
        "quantity": 100
    }
    ```

### Order

- `POST /orders` — Attempt purchase (requires JWT)
    - Body

    ```jsx
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```

- `GET /orders` — See order created by the user (requires JWT)
    - Response

    ```jsx
    {
        "order_id": "adb269a9-720e-4ff7-9df6-f2782410466c",
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "created_at": "2025-08-25T03:46:18.515Z"
    }
    ```

### **Health**

- `GET /health` — Service health check

## **🧪 Load Testing with Artillery**

### **Generate Users & Tokens**

1. Generate 1000 users and tokens for load test:

    ```bash
    node artillery/scripts/generate-users-csv.js

    ```

    - This creates `artillery/users.csv` with columns: `email,password,token`

### **Run Stress Test**

1. Run Artillery scenario:

    ```bash
    npx artillery run artillery/attempt-purchase.yml

    ```

    - This simulates authenticated purchase attempts using the generated users and tokens.

### **Stress Test Result**

With 1000 requests/second in 4 seconds (4000 requests total)

- There are 100 success requests to the queue, the same number as the stock
- There are 3899 requests with 400 which indicate the order has been created / stock is empty
- Overall it can successfully prevent over bill while still healthy
- Most requests are super quick (median 13ms), but the top 5% stretch into 180–220ms

```
All VUs finished. Total time: 7 seconds

--------------------------------
Summary report @ 14:37:15(+0800)
--------------------------------

http.codes.200: ................................................................ 100
http.codes.400: ................................................................ 3899
http.codes.401: ................................................................ 1
http.downloaded_bytes: ......................................................... 121301
http.request_rate: ............................................................. 967/sec
http.requests: ................................................................. 4000
http.response_time:
  min: ......................................................................... 1
  max: ......................................................................... 260
  mean: ........................................................................ 57.1
  median: ...................................................................... 13.1
  p95: ......................................................................... 186.8
  p99: ......................................................................... 223.7
http.response_time.2xx:
  min: ......................................................................... 4
  max: ......................................................................... 260
  mean: ........................................................................ 83.1
  median: ...................................................................... 40.9
  p95: ......................................................................... 206.5
  p99: ......................................................................... 257.3
http.response_time.4xx:
  min: ......................................................................... 1
  max: ......................................................................... 257
  mean: ........................................................................ 56.5
  median: ...................................................................... 12.1
  p95: ......................................................................... 186.8
  p99: ......................................................................... 223.7
http.responses: ................................................................ 4000
vusers.completed: .............................................................. 4000
vusers.created: ................................................................ 4000
vusers.created_by_name.Attempt purchase flow: .................................. 4000
vusers.failed: ................................................................. 0
vusers.session_length:
  min: ......................................................................... 2.3
  max: ......................................................................... 271
  mean: ........................................................................ 61.7
  median: ...................................................................... 16
  p95: ......................................................................... 194.4
  p99: ......................................................................... 237.5
```

## Opportunities for Improvement

- **Stock reconciliation:** The system currently does not update the actual stock in the product entity after sales. Implementing this will ensure consistency between flash sale and product inventory.
- **Support for multiple products and flash sales:** At present, only a single product and flash sale are supported. Extending the system to handle multiple products and concurrent flash sales will improve scalability and flexibility.
- **Integration testing:** Integration tests are not yet implemented. Setting up tests that run services in isolated containers will help avoid port conflicts and ensure reliable end-to-end validation.
- **Frontend improvements:** The frontend would benefit from enhanced unit test coverage and code quality checks to improve maintainability and reliability.
