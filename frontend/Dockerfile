FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the dashboard port
EXPOSE 3000

# Command to start the dashboard in dev mode
CMD ["npm", "run", "dev"]
