# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY ./package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Serve stage
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port 5173
EXPOSE 5173

# Start the application
CMD ["serve", "-s", "dist", "-l", "5173"] 