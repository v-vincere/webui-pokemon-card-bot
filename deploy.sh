#!/bin/bash

# --- Configuration ---
REMOTE_USER="ubuntu"
REMOTE_HOST="146.235.229.94"
REMOTE_DIR="/home/ubuntu/webui-pokemon-card-bot"
LOCAL_DIR="."

# --- Functions ---
setup_remote() {
    echo "Ensuring Docker and rsync are installed and directory exists on remote server..."
    ssh $REMOTE_USER@$REMOTE_HOST "
        sudo apt-get update &> /dev/null
        sudo apt-get install -y ca-certificates curl gnupg rsync &> /dev/null
        if ! command -v docker &> /dev/null; then
            echo 'Docker not found, installing...'
            sudo install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            sudo chmod a+r /etc/apt/keyrings/docker.gpg
            echo \
              \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              \$(. /etc/os-release && echo \"\$VERSION_CODENAME\") stable\" | \
              sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update &> /dev/null
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin &> /dev/null
        else
            echo 'Docker is already installed.'
        fi
        mkdir -p $REMOTE_DIR
    "
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies or create directory on the remote server. Aborting."
        exit 1
    fi
}

sync_files() {
    echo "Syncing project files to $REMOTE_DIR..."
    rsync -avz --delete --exclude='data/*' $LOCAL_DIR/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/
}

deploy_webui() {
    echo "--- Deploying Web UI ---"
    echo "Connecting to remote server to build and run the Docker containers for the web UI..."
    ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && chmod +x run.sh && ./run.sh"
    echo "Web UI deployment complete! It should be available at http://$REMOTE_HOST:8080"
}

# --- Main Execution ---
echo "Starting deployment to $REMOTE_HOST..."

setup_remote
sync_files
deploy_webui

echo "Deployment finished."