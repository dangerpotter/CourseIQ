FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Make environment variable available during build
ARG VITE_API_URL=/courseiq/api
ENV VITE_API_URL=${VITE_API_URL}

# Build the app
RUN npm run build

# Serve the built application
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
