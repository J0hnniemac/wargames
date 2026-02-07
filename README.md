# WarGames NORAD Display Recreation

A faithful recreation of the iconic NORAD command center display from the 1983 film **WarGames** — built entirely in Python using Pygame.

![WarGames Display](https://img.shields.io/badge/Python-3.10+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- **Authentic vector-style map** using Natural Earth geographic data
- **Glowing phosphor CRT aesthetic** with cyan/blue color scheme
- **Great-circle missile trajectories** (geodesic arcs)
- **Submarine-launched missiles** from ocean positions
- **Russia highlighted in red** (Cold War accurate!)
- **Multiple CRT filter modes** (scanlines, chromatic aberration, phosphor bloom)
- **Real-time explosions** on impact

## Screenshots

*"Shall we play a game?"*

## Installation

### Prerequisites

- Python 3.10+
- pip

### Setup

```bash
# Clone the repository
git clone https://github.com/J0hnniemac/wargames.git
cd wargames

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install pygame pyshp geographiclib numpy pillow
```

### Download Map Data

Download the Natural Earth 110m shapefiles:

1. [Coastlines](https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/110m/physical/ne_110m_coastline.zip)
2. [Countries](https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/110m/cultural/ne_110m_admin_0_countries.zip)

Extract both zip files into the project directory.

## Usage

```bash
# Run fullscreen (default)
python wargames_map.py

# Run in windowed mode
python wargames_map.py -w

# Run with CRT filter (0=off, 1=light, 2=full)
python wargames_map.py --crt 2

# Windowed with full CRT effects
python wargames_map.py -w --crt 2
```

## Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Adjust missile launch intensity |
| `Space` | Burst mode (mass launch) |
| `C` | Cycle CRT filter effects |
| `F` | Toggle fullscreen/windowed |
| `R` | Reset simulation |
| `ESC` / `Q` | Quit |

## Technical Details

- **Projection**: Equirectangular (Plate Carrée)
- **Missile Paths**: Calculated using geodesic (great-circle) routes via GeographicLib
- **Map Data**: Natural Earth 1:110m scale vectors
- **CRT Effects**: Scanlines, vignette, chromatic aberration, phosphor bloom, screen flicker

## Dependencies

- `pygame` - Graphics and window management
- `pyshp` - Shapefile parsing
- `geographiclib` - Geodesic calculations
- `numpy` - Array operations for effects
- `pillow` - Image handling

## License

MIT License - feel free to use, modify, and distribute.

## Acknowledgments

- **WarGames (1983)** - MGM/UA Entertainment
- **Natural Earth** - Public domain map data
- The WOPR, for teaching us that the only winning move is not to play

---

*"A strange game. The only winning move is not to play."*
