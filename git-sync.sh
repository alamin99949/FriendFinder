#!/usr/bin/env bash

# Color codes for visual styling
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GitHub Auto-Sync Assistant ===${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed on this system.${NC}"
    exit 1
fi

# 1. Initialize Git repository if not already done
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing new Git repository...${NC}"
    git init
    git branch -M main
    echo -e "${GREEN}Git repository initialized successfully with branch 'main'.${NC}"
fi

# 2. Check/Setup Remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [ -z "$REMOTE_URL" ]; then
    echo -e "${YELLOW}No GitHub remote repository is connected yet.${NC}"
    echo -e "Please configure your GitHub repository remote URL:"
    echo -e "To set it, run: ${BLUE}git remote add origin <your-github-repo-url>${NC}"
    echo -e "Example: git remote add origin https://github.com/username/my-app.git\n"
    
    # Prompt the user if running interactively
    if [ -t 0 ]; then
        read -p "Would you like to add a remote URL now? (y/n): " ADD_REMOTE
        if [[ $ADD_REMOTE =~ ^[Yy]$ ]]; then
            read -p "Enter GitHub Remote URL: " USER_URL
            if [ ! -z "$USER_URL" ]; then
                git remote add origin "$USER_URL"
                echo -e "${GREEN}Remote 'origin' successfully set to: $USER_URL${NC}"
                REMOTE_URL="$USER_URL"
            fi
        fi
    fi
else
    echo -e "${GREEN}Connected to GitHub remote: ${BLUE}$REMOTE_URL${NC}"
fi

# Function to perform a single commit and push
sync_now() {
    # Check if there are any changes (unstaged or staged)
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${BLUE}[$(date +'%H:%M:%S')] No changes detected. Workspace is clean.${NC}"
        return 0
    fi

    echo -e "${YELLOW}[$(date +'%H:%M:%S')] Changes detected! Staging files...${NC}"
    git add .
    
    COMMIT_MSG="Auto-update: $(date +'%Y-%m-%d %H:%M:%S')"
    echo -e "${YELLOW}Committing changes: \"$COMMIT_MSG\"...${NC}"
    git commit -m "$COMMIT_MSG"
    
    echo -e "${YELLOW}Pushing to GitHub (origin main)...${NC}"
    if git push origin main; then
        echo -e "${GREEN}✓ Successfully synced and pushed to GitHub!${NC}"
    else
        echo -e "${RED}✗ Failed to push to GitHub.${NC}"
        echo -e "Ensure you have permission, your remote is correct, and credentials are configured."
        echo -e "For HTTPS, you can configure a GitHub Personal Access Token (PAT)."
    fi
}

# Check argument mode
if [ "$1" == "--once" ]; then
    sync_now
    exit 0
elif [ "$1" == "--watch" ]; then
    INTERVAL=${2:-10}
    echo -e "${GREEN}Starting Auto-Sync Watcher! Checking for changes every $INTERVAL seconds...${NC}"
    echo -e "Press [Ctrl+C] to stop the watcher."
    
    while true; do
        sync_now
        sleep "$INTERVAL"
    done
else
    # Default interactive helper
    echo -e "\nAvailable Options:"
    echo -e "1) ${GREEN}Sync once now${NC} (Stage, commit, and push changes)"
    echo -e "2) ${GREEN}Start continuous watcher${NC} (Sync automatically every 10 seconds)"
    echo -e "3) Exit\n"
    
    if [ -t 0 ]; then
        read -p "Select an option (1-3): " OPTION
        case $OPTION in
            1)
                sync_now
                ;;
            2)
                read -p "Enter interval in seconds (default 10): " INT_VAL
                INT_VAL=${INT_VAL:-10}
                bash "$0" --watch "$INT_VAL"
                ;;
            *)
                echo "Exiting."
                exit 0
                ;;
        esac
    else
        echo -e "To run a single sync, use: ${BLUE}npm run push-git${NC}"
        echo -e "To start the auto-sync watcher, use: ${BLUE}npm run watch-git${NC}"
    fi
fi
