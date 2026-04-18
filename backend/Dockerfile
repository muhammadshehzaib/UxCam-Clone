FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the API port
EXPOSE 3001

# Command to run migrations and then start the backend in dev mode
CMD npm run migrate && npm run dev
