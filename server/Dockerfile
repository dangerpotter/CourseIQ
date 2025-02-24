FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create directories for volumes
RUN mkdir -p /app/uploads /app/output

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider ${import.meta.env.VITE_API_URL}/health || exit 1

# Start the application
CMD ["npm", "start"]
