#!/usr/bin/env python3
"""
Generate GLAD OpenGL loader files
Requires: pip install glad
"""

import subprocess
import sys
import os

# Check if glad is installed
try:
    import glad
except ImportError:
    print("Installing glad generator...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "glad", "--user"])

# Change to project directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Generate GLAD files
print("Generating GLAD files for OpenGL 3.3 Core...")
cmd = [
    sys.executable, "-m", "glad",
    "--api", "gl:core=3.3",
    "--out-path", ".",
    "c"
]

try:
    subprocess.check_call(cmd)
    print("\nGLAD files generated successfully!")
    print("  - include/glad/glad.h")
    print("  - include/KHR/khrplatform.h")
    print("  - src/glad.c")
except subprocess.CalledProcessError as e:
    print(f"Error generating GLAD: {e}")
    sys.exit(1)
