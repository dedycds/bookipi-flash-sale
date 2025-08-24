FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Install ts-node for runtime TypeScript execution
RUN npm install -g ts-node

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "run", "dev"]
