#!/bin/bash

# --- Configuration ---
WEBUI_DIR="webui"

# --- Flags ---
ACTION="start"

# --- Help Function ---
show_help() {
    echo "Usage: ./run.sh [action]"
    echo ""
    echo "Actions:"
    echo "  start (default)   Starts the Web UI."
    echo "  stop              Stops the Web UI."
    echo "  --help, -h        Show this help message."
}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        stop) ACTION="stop"; shift ;;
        --help|-h) show_help; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; show_help; exit 1 ;;
    esac
done

# --- Functions ---

start_webui() {
    echo "--- Starting Web UI ---"
    if [ -d "$WEBUI_DIR" ]; then
        echo "Stopping existing Web UI containers to prevent conflicts..."
        cd $WEBUI_DIR
        sudo docker compose down
        echo "Building and running new Web UI containers..."
        sudo docker compose up -d --build
        cd ..
        echo "Web UI is running in the background!"
    else
        echo "Web UI directory not found. Skipping."
    fi
}

stop_webui() {
    echo "--- Stopping Web UI ---"
    if [ -f "$WEBUI_DIR/docker-compose.yml" ]; then
        echo "Stopping Web UI containers with docker-compose..."
        cd $WEBUI_DIR
        sudo docker compose down
        cd ..
    else
        echo "Web UI docker-compose.yml not found. Skipping."
    fi
}

# --- Main Execution ---

if [ "$ACTION" == "start" ]; then
    start_webui
    echo "Start command finished."
elif [ "$ACTION" == "stop" ]; then
    stop_webui
    echo "Stop command finished."
fi