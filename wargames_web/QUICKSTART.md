# Quick Start Guide

## Current Status

Your development server is running at: **http://localhost:8080**

## What You Should See

### Desktop Layout (3x3 Grid):

**Row 1:**
- **GLOBAL MAP** - World map with coastlines and country borders in cyan
- **NORTH AMERICA** - Zoomed view of North American region  
- **EUROPE/RUSSIA** - Zoomed view of Europe and Russia region

**Row 2:**
- **ASIA-PACIFIC** - Zoomed view of Asia-Pacific region
- **PACIFIC OCEAN** - Zoomed view of Pacific Ocean
- **SYSTEM STATUS** - Real-time simulation statistics

**Row 3:**
- **DEFCON STATUS** - DEFCON level indicator and threat assessment (NEW!)
- **TARGET STATUS** - List of active missiles with progress
- **TACTICAL ANALYSIS** - Tic-Tac-Toe game simulation (NEW!)

### Features to Look For:

1. **Vector Maps**: Cyan glowing coastlines and country borders on all map screens
2. **Missiles**: Curved cyan/red trajectories moving across maps
3. **Explosions**: Expanding red ring waves when missiles reach targets
4. **Aircraft**: Small cyan markers circling on global views
5. **CRT Effects**: Barrel distortion, scanlines, chromatic aberration, screen flicker
6. **DEFCON Status**: Dynamic threat level (1-5) based on active missiles
7. **Tic-Tac-Toe**: Auto-playing game with the famous "A strange game..." message

## Controls

- **R** - Reset the simulation
- **P** or **Space** - Pause/Resume
- **F** - Toggle fullscreen

## Troubleshooting

### If maps appear black/empty:

1. Open browser console (F12) and check for errors
2. Look for the initialization messages:
   ```
   🎮 Initializing Wargames visualization...
   ✓ turf.js loaded
   ✓ All assets loaded
   ✓ Simulation initialized
   ✓ Screen manager initialized
   ✅ Wargames visualization initialized successfully
   ```

3. If you see "turf.js not loaded", refresh the page
4. If you see shader compilation errors, your browser may not fully support WebGL

### Test Page

Visit **http://localhost:8080/test.html** to run system diagnostics

### Common Issues:

**Maps not rendering:**
- Check browser console for WebGL errors
- Ensure data files exist in `wargames_web/data/` folder
- Try refreshing the page (Ctrl+R or Cmd+R)

**Poor performance:**
- Resize browser window to reduce number of screens
- Close other GPU-intensive applications
- Try disabling some CRT effects in Renderer.js

**Tic-Tac-Toe not appearing:**
- Check that you're on desktop size (9 screens)
- Resize window to force screen re-layout

## What's New

### ✨ Features Added:

1. **DEFCON Status Display:**
   - Dynamic DEFCON level (1-5) based on missile count
   - Threat assessment: CRITICAL/HIGH/MODERATE
   - Real-time statistics
   - Color-coded alerts (red for DEFCON 1-2)

2. **Tic-Tac-Toe Game:**
   - Auto-playing AI vs AI
   - Displays the famous "A strange game. The only winning move is not to play." message
   - Continuous gameplay with auto-reset

3. **Enhanced Map Visibility:**
   - Multi-layer glow effects on all geographic features
   - Better viewport culling for performance
   - Improved coordinate transformations

4. **Better Debugging:**
   - Console logging for initialization steps
   - Error messages with helpful hints
   - Test page for system diagnostics

## Next Steps

1. Open http://localhost:8080 in your browser
2. Watch the simulation run - missiles should launch every 2 seconds
3. Observe the different screen views updating in real-time
4. Try the controls (R, P, F)
5. Watch the tic-tac-toe game play itself
6. Monitor the DEFCON level as missiles increase

## Expected Behavior

- **Initial State**: 15 missiles already in flight at various progress levels
- **Continuous Spawning**: New missile every 2 seconds
- **Explosions**: When missile reaches 100%, 4-ring explosion appears
- **DEFCON Changes**: Level drops as more missiles are active
- **Tic-Tac-Toe**: Moves every 1.5 seconds, resets after game over

Enjoy the simulation! 🚀💥

"Shall we play a game?"
