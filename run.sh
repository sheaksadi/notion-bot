#!/bin/bash

# Define variables
IMAGE_NAME="notion-bot"
CONTAINER_NAME="notion_bot_container"
DOCKERFILE_PATH="Dockerfile" # Modify if your Dockerfile is in a different location

# Define environment variables
ENV_VARIABLES="-e ENV_VAR_1=value1 -e ENV_VAR_2=value2" # Modify as needed

# Step 1: Stop and remove the old container if it exists
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing the old container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# Step 2: Build the Docker image
echo "Building the Docker image..."
docker build -t $IMAGE_NAME -f $DOCKERFILE_PATH .

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Docker build failed!"
    exit 1
fi

# Step 3: Run the Docker container with environment variables
echo "Running the Docker container..."
docker run -d --name $CONTAINER_NAME $ENV_VARIABLES $IMAGE_NAME

# Step 4: Show running containers
docker ps

echo "Container is running."
