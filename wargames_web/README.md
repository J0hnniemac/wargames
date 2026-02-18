# Wargames - Global Thermonuclear War Simulation (Web Version)

A WebGL-based multi-screen visualization inspired by the 1983 film "WarGames", displaying real-time missile trajectories, explosions, and aircraft movements on a world map with authentic CRT monitor aesthetics.

![Wargames Screenshot](https://img.shields.io/badge/Status-Complete-success)

## Features

- **Multi-Screen Layout**: Responsive grid layout that adapts to screen size
  - Mobile: 1 screen
  - Tablet: 4 screens (2×2 grid)
  - Desktop: 9 screens (3×3 grid)
  - Large Desktop: 12 screens (4×3 grid)
  - Ultra-wide: 16 screens (4×4 grid)

- **Real-Time Simulation**:
  - Geodesic missile trajectories calculated using great-circle paths
  - Multiple expanding ring explosions
  - Circling aircraft with identification callouts
  - Automatic missile spawning (land-based and submarine launches)

- **Visual Effects**:
  - Multi-layer additive glow for phosphor CRT appearance
  - Barrel distortion for curved monitor effect
  - Chromatic aberration (RGB channel separation)
  - Gaussian blur bloom
  - Scanlines and vignetting
  - Screen flicker and noise
  - Color-coded targets (cyan for Western, red for Russia/Japan)

- **View Types**:
  - Global map view
  - Regional zoom views (North America, Europe, Asia, Pacific)
  - Status panels with simulation statistics
  - Target lists with missile progress
  - Radar displays

## Technology Stack

- **WebGL** (GLSL ES 100 shaders)
- **Vanilla JavaScript** (ES6 modules)
- **Turf.js** for geodesic calculations
- **Natural Earth** geographic data (1:110m resolution)

## Installation

### Prerequisites

- Node.js (for shapefile conversion)
- Python 3 (for development server)
- Modern browser with WebGL support

### Setup

1. **Install Dependencies**:
   ```bash
   cd wargames_web
   npm install
   ```

2. **Convert Geographic Data**:
   ```bash
   npm run convert-data
   ```
   This converts ESRI shapefiles to GeoJSON format.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Or use Python directly:
   ```bash
   python3 -m http.server 8080
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:8080`

## Controls

- **R**: Reset simulation
- **P** or **Space**: Pause/Resume
- **F**: Toggle fullscreen

## Project Structure

```
wargames_web/
├── index.html              # Main HTML file
├── css/
│   └── style.css           # Responsive grid and CRT styling
├── shaders/                # GLSL ES 100 shaders
│   ├── basic.vert/frag     # Basic rendering
│   ├── barrel.frag         # Barrel distortion
│   ├── chromatic.frag      # Chromatic aberration
│   ├── bloom.frag          # Gaussian blur
│   └── composite.frag      # Final composite
├── src/
│   ├── main.js             # Application entry point
│   ├── AssetLoader.js      # Asset loading manager
│   ├── Renderer.js         # WebGL rendering engine
│   ├── ScreenManager.js    # Multi-screen manager
│   ├── SimulationState.js  # Game state manager
│   ├── VectorMap.js        # World map renderer
│   ├── Missile.js          # Missile entity
│   ├── Explosion.js        # Explosion effect
│   ├── Aircraft.js         # Aircraft entity
│   └── utils.js            # Utility functions
├── data/                   # Geographic and configuration data (generated)
├── lib/                    # External libraries
│   └── turf.min.js         # Geodesic calculations
└── scripts/
    └── convert-shapefiles.js  # Data conversion tool
```

## Architecture

### Multi-Screen System

The `ScreenManager` creates multiple canvas elements in a responsive CSS Grid layout. Each screen can display:
- **Different viewports**: Global map or regional zooms
- **Different content**: Graphical views, status panels, or target lists
- **Shared state**: All screens render the same simulation state

### Rendering Pipeline

Each graphical screen follows this pipeline:
1. Render scene to framebuffer (map, missiles, explosions, aircraft)
2. Apply barrel distortion
3. Apply chromatic aberration
4. Apply two-pass Gaussian bloom (horizontal + vertical)
5. Composite to screen with scanlines, vignette, noise, and flicker

### Entity System

- **Missiles**: Calculate geodesic paths on spawn, render progressively
- **Explosions**: 4 staggered expanding rings with fade-out
- **Aircraft**: Circle predefined paths with identification boxes

## Performance

- Targets **60 FPS** on modern hardware
- **Viewport culling**: Entities outside view bounds are not rendered
- **Shared resources**: Single vector map and simulation state across all screens
- **Optimized WebGL**: Minimal state changes anddraw calls

## Customization

### Adjusting Screen Layouts

Edit `data/screen-configs.json` to customize which views appear at different viewport sizes.

### Modifying Visual Effects

Shader parameters can be adjusted in `Renderer.js`:
- `uDistortion`: Barrel distortion amount (default: 0.12)
- `uIntensity`: Chromatic aberration intensity (default: 1.5)
- `uBloomIntensity`: Bloom glow strength (default: 0.4)
- `uNoiseIntensity`: Visual noise amount (default: 0.03)
- `uFlickerIntensity`: Screen flicker amount (default: 0.01)

### Adding Targets

Edit `scripts/convert-shapefiles.js` to modify city coordinates, submarine positions, or target lists.

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL support required. Mobile devices may have reduced performance with many screens.

## Credits

- Geographic data: [Natural Earth](https://www.naturalearthdata.com/)
- Inspired by the 1983 film "WarGames"
- Geodesic calculations: [Turf.js](https://turfjs.org/)

## License

MIT License

## Troubleshooting

**Problem**: Black screens or no rendering
- Check browser console for WebGL errors
- Ensure shaders compiled successfully
- Verify geographic data was converted (check `data/` folder)

**Problem**: Poor performance
- Reduce number of screens by resizing window
- Check GPU acceleration is enabled in browser
- Close other GPU-intensive applications

**Problem**: Data files missing
- Run `npm run convert-data` to generate GeoJSON files
- Ensure shapefile source data exists in `../wargames_cpp/data/`

## Development Notes

This web version closely mirrors the C++ implementation architecture while adapting for browser constraints:
- Uses turf.js instead of GeographicLib for geodesics
- GeoJSON instead of ESRI shapefiles for runtime parsing
- GLSL ES 100 instead of GLSL 330 core for broader compatibility
- CSS Grid for responsive layout instead of fixed window size

Would you like to play a game?
