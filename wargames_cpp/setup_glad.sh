#!/bin/bash

# Script to download and set up GLAD for OpenGL loading

echo "Setting up GLAD for OpenGL 3.3 Core..."

# Create temporary directory
mkdir -p /tmp/glad_setup
cd /tmp/glad_setup

# Download GLAD generator
echo "Downloading GLAD..."
curl -L -o glad.zip "https://glad.dav1d.de/generated/tmp$(date +%s)/glad.zip?generator=c&api=gl%3D3.3&profile=gl%3Dcore&options=LOADER"

if [ ! -f glad.zip ]; then
    echo "Failed to download GLAD. Please visit https://glad.dav1d.de/ manually."
    echo "Settings: Language=C/C++, API=gl 3.3, Profile=Core"
    exit 1
fi

# Extract
unzip -q glad.zip

# Copy to project
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Copying GLAD files to project..."

cp -r include/glad "$SCRIPT_DIR/include/"
cp -r include/KHR "$SCRIPT_DIR/include/"
cp src/glad.c "$SCRIPT_DIR/src/"

echo "GLAD setup complete!"
echo "Files copied to:"
echo "  - $SCRIPT_DIR/include/glad/"
echo "  - $SCRIPT_DIR/include/KHR/"
echo "  - $SCRIPT_DIR/src/glad.c"

cd -
rm -rf /tmp/glad_setup
