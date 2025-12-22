FROM node:22-slim

WORKDIR /app/api

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 4000

CMD ["node", "index.js"]
