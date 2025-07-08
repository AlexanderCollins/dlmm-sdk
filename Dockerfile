FROM node:20

# Create and set working directory
WORKDIR /app

# Copy package files from ts-client
COPY ts-client/package*.json ./ts-client/

# Change to the ts-client folder and install dependencies
WORKDIR /app/ts-client
RUN npm install

# Copy the remaining ts-client files and build the project
COPY ts-client/ .
RUN npm run build

# Expose the port as defined in your ts-client app (e.g., 3000)
EXPOSE 3000

# Start the server using the appropriate npm script from package.json
CMD ["npm", "run", "start-server"]
