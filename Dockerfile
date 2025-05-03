# Use an official Node.js runtime as a parent image
# Using a specific LTS version (e.g., 20) is recommended for stability
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV production

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Use --omit=optional to potentially speed up and avoid issues
RUN npm install --ignore-scripts --omit=optional

# Copy the rest of the application code
COPY . .

# Build the TypeScript code using npm exec
RUN npm exec tsc

# Prune development dependencies after the build is complete
RUN npm prune --production

# Expose the port the app runs on
# Heroku will set the PORT environment variable, which our app uses
EXPOSE 7777

# Define the command to run the app
# Use the environment variable PORT provided by Heroku
# NODE_ENV is already set via ENV instruction
CMD [ "npm", "start" ] 