import math
import random
import time
import argparse
import pygame
import numpy as np
import shapefile
from geographiclib.geodesic import Geodesic

# ------------ config ------------
COASTLINE_SHP = "ne_110m_coastline.shp"
COUNTRIES_SHP = "ne_110m_admin_0_countries.shp"
FPS = 60

# Intensity settings (adjustable with keys)
DEFAULT_LAUNCH_INTERVAL = 2.5
DEFAULT_SUB_LAUNCH_INTERVAL = 4.0
MIN_LAUNCH_INTERVAL = 0.3
MAX_LAUNCH_INTERVAL = 10.0
MISSILE_FLIGHT_SECONDS = 12.0

# Visual style - WarGames NORAD aesthetic
ARC_THICKNESS = 2
BLIP_RADIUS = 4
GRID_ALPHA = 25
SCANLINE_ALPHA = 30
NOISE_ALPHA = 12
VIGNETTE_STRENGTH = 160

# CRT filter modes
CRT_OFF = 0
CRT_LIGHT = 1
CRT_FULL = 2
CRT_MODE_NAMES = ['OFF', 'LIGHT', 'FULL']

# Colors - authentic CRT phosphor cyan/blue
CYAN = (0, 255, 255)
CYAN_DIM = (0, 180, 180)
CYAN_GLOW = (0, 60, 80)
BLACK = (0, 0, 0)

# Explosion colors
RED = (255, 50, 50)
RED_BRIGHT = (255, 100, 100)
RED_GLOW = (180, 30, 30)
EXPLOSION_DURATION = 2.5  # seconds

# A few fun launch/destination points (lat, lon)
# Western targets (Americas) - lon < 0
WESTERN_TARGETS = [
    (38.9, -77.0),   # Washington DC
    (40.71, -74.0),  # NYC
    (34.05, -118.24),# LA
    (64.13, -21.89), # Reykjavik
    (-34.6, -58.38), # Buenos Aires
]

# Eastern targets (Russia/Asia/Europe) - lon > 0  
EASTERN_TARGETS = [
    (55.75, 37.62),  # Moscow
    (51.5, -0.12),   # London
    (35.68, 139.76), # Tokyo
    (39.9, 116.4),   # Beijing
    (-33.86, 151.2), # Sydney
    (28.61, 77.21),  # Delhi
    (59.33, 18.07),  # Stockholm
]

# All points combined for land missiles
POINTS = WESTERN_TARGETS + EASTERN_TARGETS

# Submarine positions (ocean coordinates)
SUBMARINE_POINTS = [
    (35.0, -45.0),   # North Atlantic
    (45.0, -30.0),   # Mid Atlantic
    (60.0, -20.0),   # North Atlantic (near Iceland)
    (40.0, 160.0),   # North Pacific
    (25.0, -155.0),  # Central Pacific
    (50.0, -140.0),  # Northeast Pacific
    (10.0, 65.0),    # Indian Ocean
    (-30.0, 40.0),   # South Indian Ocean
    (70.0, 40.0),    # Barents Sea
    (55.0, 170.0),   # Bering Sea
    (15.0, -60.0),   # Caribbean
    (-45.0, -60.0),  # South Atlantic
]

# ------------ helpers ------------
def latlon_to_xy(lat, lon, w, h):
    """Equirectangular projection."""
    x = (lon + 180.0) / 360.0 * w
    y = (90.0 - lat) / 180.0 * h
    return int(x), int(y)

def project_coords(coords, w, h):
    """Convert list of (lon, lat) to screen (x, y) points."""
    points = []
    for lon, lat in coords:
        x = int((lon + 180) / 360 * w)
        y = int((90 - lat) / 180 * h)
        points.append((x, y))
    return points

def crosses_antimeridian(coords):
    """Check if shape crosses the 180° meridian (causes screen-spanning lines)."""
    for i in range(len(coords) - 1):
        lon1, lon2 = coords[i][0], coords[i + 1][0]
        if abs(lon1 - lon2) > 180:
            return True
    return False

def split_at_antimeridian(coords):
    """Split coordinates at the antimeridian into separate segments."""
    segments = []
    current = []
    for i, (lon, lat) in enumerate(coords):
        if i > 0:
            prev_lon = coords[i - 1][0]
            if abs(lon - prev_lon) > 180:
                if current:
                    segments.append(current)
                current = []
        current.append((lon, lat))
    if current:
        segments.append(current)
    return segments

# ------------ vector map renderer ------------
class VectorMap:
    """Pre-renders vector coastlines and borders with authentic CRT glow."""
    
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.surface = pygame.Surface((width, height))
        self.surface.fill(BLACK)
        
        print("Loading vector map data...")
        self._render_countries(skip_russia=True)   # Other countries first
        self._render_coastlines()                   # Coastlines second
        self._render_countries(russia_only=True)   # Russia on top
        print("Vector map ready.")
    
    def _draw_glowing_lines(self, points, color, glow_color, line_width=1, glow_layers=4):
        """Draw lines with CRT phosphor glow effect."""
        if len(points) < 2:
            return
        
        # Glow layers (outer to inner)
        for i in range(glow_layers, 0, -1):
            alpha = int(40 * (1 - i / glow_layers) + 15)
            glow_surf = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            glow_c = (*glow_color[:3], alpha)
            pygame.draw.lines(glow_surf, glow_c, False, points, line_width + i * 2)
            self.surface.blit(glow_surf, (0, 0), special_flags=pygame.BLEND_ADD)
        
        # Bright core line
        pygame.draw.lines(self.surface, color, False, points, line_width)
    
    def _render_coastlines(self):
        """Load and render coastlines with bright glow."""
        try:
            sf = shapefile.Reader(COASTLINE_SHP)
        except Exception as e:
            print(f"Could not load coastlines: {e}")
            return
        
        for shape in sf.shapes():
            coords = shape.points
            if len(coords) < 2:
                continue
            
            # Handle antimeridian crossing
            if crosses_antimeridian(coords):
                segments = split_at_antimeridian(coords)
                for seg in segments:
                    if len(seg) >= 2:
                        points = project_coords(seg, self.width, self.height)
                        self._draw_glowing_lines(points, CYAN, CYAN_GLOW, 1, 5)
            else:
                points = project_coords(coords, self.width, self.height)
                self._draw_glowing_lines(points, CYAN, CYAN_GLOW, 1, 5)
    
    def _render_countries(self, skip_russia=False, russia_only=False):
        """Load and render country borders with dimmer glow. Russia in red."""
        try:
            sf = shapefile.Reader(COUNTRIES_SHP)
        except Exception as e:
            print(f"Could not load countries: {e}")
            return
        
        border_color = (0, 140, 160)
        border_glow = (0, 40, 50)
        
        # Red colors for Russia/Soviet bloc
        russia_color = (255, 80, 80)
        russia_glow = (120, 30, 30)
        
        # Get all field names
        fields = [field[0] for field in sf.fields[1:]]  # Skip deletion flag
        
        records = sf.records()
        shapes = sf.shapes()
        
        for idx, shape in enumerate(shapes):
            # Check if this is Russia - search all text fields
            is_russia = False
            if idx < len(records):
                rec = records[idx]
                for i, val in enumerate(rec):
                    if isinstance(val, str):
                        val_upper = val.upper()
                        if 'RUSSIA' in val_upper or 'RUS' == val_upper:
                            is_russia = True
                            break
            
            # Filter based on skip_russia/russia_only flags
            if skip_russia and is_russia:
                continue
            if russia_only and not is_russia:
                continue
            
            # Choose colors based on country
            if is_russia:
                color = russia_color
                glow = russia_glow
                glow_layers = 5
            else:
                color = border_color
                glow = border_glow
                glow_layers = 3
            
            # Handle polygon parts (exterior ring + holes)
            parts = list(shape.parts) + [len(shape.points)]
            
            for i in range(len(parts) - 1):
                start, end = parts[i], parts[i + 1]
                coords = shape.points[start:end]
                
                if len(coords) < 2:
                    continue
                
                if crosses_antimeridian(coords):
                    segments = split_at_antimeridian(coords)
                    for seg in segments:
                        if len(seg) >= 2:
                            points = project_coords(seg, self.width, self.height)
                            self._draw_glowing_lines(points, color, glow, 1, glow_layers)
                else:
                    points = project_coords(coords, self.width, self.height)
                    self._draw_glowing_lines(points, color, glow, 1, glow_layers)
    
    def draw(self, screen):
        """Blit pre-rendered map to screen."""
        screen.blit(self.surface, (0, 0))

# ------------ overlay effects ------------
def make_scanlines(size):
    w, h = size
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    for y in range(0, h, 3):
        pygame.draw.line(surf, (0, 0, 0, SCANLINE_ALPHA), (0, y), (w, y))
    return surf

def make_vignette(size):
    w, h = size
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    cx, cy = w / 2, h / 2
    maxd = math.hypot(cx, cy)
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    d = np.hypot(xs - cx, ys - cy) / maxd
    v = np.clip((d ** 1.8) * VIGNETTE_STRENGTH, 0, 255).astype(np.uint8)
    pixels = pygame.surfarray.pixels_alpha(surf)
    pixels[:] = v.T
    del pixels
    return surf

def make_grid(size):
    w, h = size
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    grid_color = (0, 100, 120, GRID_ALPHA)
    # Latitude lines every 15°, longitude every 30°
    for lat in range(-75, 90, 15):
        y = int((90 - lat) / 180 * h)
        pygame.draw.line(surf, grid_color, (0, y), (w, y))
    for lon in range(-180, 181, 30):
        x = int((lon + 180) / 360 * w)
        pygame.draw.line(surf, grid_color, (x, 0), (x, h))
    return surf

# ------------ CRT filter effects ------------
def apply_chromatic_aberration(surface, offset=2):
    """Apply RGB channel offset for chromatic aberration effect."""
    w, h = surface.get_size()
    result = pygame.Surface((w, h))
    
    # Get pixel arrays
    src = pygame.surfarray.array3d(surface)
    dst = np.zeros_like(src)
    
    # Offset red channel left, blue channel right
    dst[offset:, :, 0] = src[:-offset, :, 0]  # Red shifted right
    dst[:, :, 1] = src[:, :, 1]                # Green stays
    dst[:-offset, :, 2] = src[offset:, :, 2]  # Blue shifted left
    
    pygame.surfarray.blit_array(result, dst)
    return result

def apply_barrel_distortion(surface, strength=0.1):
    """Apply barrel distortion for CRT screen curvature."""
    w, h = surface.get_size()
    result = pygame.Surface((w, h))
    result.fill(BLACK)
    
    src = pygame.surfarray.array3d(surface)
    dst = np.zeros_like(src)
    
    cx, cy = w / 2, h / 2
    
    # Create coordinate grids
    x = np.arange(w)
    y = np.arange(h)
    xx, yy = np.meshgrid(x, y, indexing='ij')
    
    # Normalize coordinates to -1 to 1
    nx = (xx - cx) / cx
    ny = (yy - cy) / cy
    
    # Calculate distance from center
    r = np.sqrt(nx**2 + ny**2)
    
    # Apply barrel distortion
    factor = 1 + strength * r**2
    
    # Map back to source coordinates
    src_x = (nx / factor * cx + cx).astype(int)
    src_y = (ny / factor * cy + cy).astype(int)
    
    # Clamp to valid range
    src_x = np.clip(src_x, 0, w - 1)
    src_y = np.clip(src_y, 0, h - 1)
    
    # Sample from source
    dst = src[src_x, src_y]
    
    pygame.surfarray.blit_array(result, dst)
    return result

def apply_phosphor_bloom(surface, intensity=1.5):
    """Apply bloom effect to simulate phosphor glow."""
    w, h = surface.get_size()
    
    # Downscale
    small_w, small_h = w // 4, h // 4
    small = pygame.transform.smoothscale(surface, (small_w, small_h))
    
    # Upscale back (creates blur)
    bloom = pygame.transform.smoothscale(small, (w, h))
    
    # Blend with original
    result = surface.copy()
    bloom.set_alpha(int(60 * intensity))
    result.blit(bloom, (0, 0), special_flags=pygame.BLEND_ADD)
    
    return result

def apply_screen_flicker(surface, time_val, intensity=0.03):
    """Apply subtle screen flicker."""
    # Subtle brightness variation
    flicker = 1.0 + math.sin(time_val * 120) * intensity + math.sin(time_val * 67) * intensity * 0.5
    if flicker < 0.95:
        dark = pygame.Surface(surface.get_size())
        dark.fill((0, 0, 0))
        dark.set_alpha(int((1 - flicker) * 50))
        result = surface.copy()
        result.blit(dark, (0, 0))
        return result
    return surface

def arc_points(lat1, lon1, lat2, lon2, w, h, n=160):
    """Great-circle arc samples -> screen points."""
    geod = Geodesic.WGS84
    inv = geod.Inverse(lat1, lon1, lat2, lon2)
    line = geod.Line(lat1, lon1, inv["azi1"])
    dist = inv["s12"]
    pts = []
    for i in range(n + 1):
        s = dist * (i / n)
        pos = line.Position(s)
        x, y = latlon_to_xy(pos["lat2"], pos["lon2"], w, h)
        pts.append((x, y))
    return pts

def split_path_at_wrap(points, screen_width):
    """Split a path into segments where it wraps around the screen edge."""
    if len(points) < 2:
        return [points] if points else []
    
    segments = []
    current = [points[0]]
    threshold = screen_width * 0.5  # Jump of more than half screen width = wrap
    
    for i in range(1, len(points)):
        prev_x = points[i - 1][0]
        curr_x = points[i][0]
        
        if abs(curr_x - prev_x) > threshold:
            # Screen wrap detected - start new segment
            if len(current) >= 2:
                segments.append(current)
            current = [points[i]]
        else:
            current.append(points[i])
    
    if len(current) >= 2:
        segments.append(current)
    
    return segments

# ------------ missile entity ------------
class Missile:
    def __init__(self, start, end, created, w, h):
        self.lat1, self.lon1 = start
        self.lat2, self.lon2 = end
        self.t0 = created
        self.path = arc_points(self.lat1, self.lon1, self.lat2, self.lon2, w, h, n=220)
        self.w = w
        self.h = h

    def progress(self, now):
        return (now - self.t0) / MISSILE_FLIGHT_SECONDS

    def alive(self, now):
        return self.progress(now) <= 1.05

    def draw(self, surf, now):
        p = max(0.0, min(1.0, self.progress(now)))
        k = max(2, int(p * (len(self.path) - 1)))
        
        # Draw arc with glow - split at screen wrap to avoid cross-screen lines
        trail_points = self.path[:k]
        segments = split_path_at_wrap(trail_points, self.w)
        
        for seg in segments:
            if len(seg) >= 2:
                # Glow layers
                for i, alpha in [(6, 30), (4, 50), (2, 80)]:
                    glow_surf = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
                    pygame.draw.lines(glow_surf, (0, alpha, alpha + 20), False, seg, ARC_THICKNESS + i)
                    surf.blit(glow_surf, (0, 0), special_flags=pygame.BLEND_ADD)
                # Bright core
                pygame.draw.lines(surf, CYAN, False, seg, ARC_THICKNESS)

        # Head blip with glow
        hx, hy = self.path[k - 1]
        for r, alpha in [(BLIP_RADIUS + 6, 40), (BLIP_RADIUS + 3, 80)]:
            pygame.draw.circle(surf, (0, alpha, alpha + 20), (hx, hy), r)
        pygame.draw.circle(surf, CYAN, (hx, hy), BLIP_RADIUS)

        # Start marker
        sx, sy = self.path[0]
        pygame.draw.circle(surf, CYAN_DIM, (sx, sy), 3)
        
        # End marker (appears near completion)
        if p > 0.85:
            ex, ey = self.path[-1]
            # Pulsing target
            pulse = int((math.sin(now * 8) + 1) * 2) + 2
            pygame.draw.circle(surf, CYAN, (ex, ey), pulse, 1)

# ------------ submarine missile entity ------------
class SubmarineMissile:
    """Submarine-launched missile with submarine icon. Color based on target."""
    
    def __init__(self, start, end, created, w, h, is_red=False):
        self.lat1, self.lon1 = start
        self.lat2, self.lon2 = end
        self.t0 = created
        self.path = arc_points(self.lat1, self.lon1, self.lat2, self.lon2, w, h, n=220)
        self.w = w
        self.h = h
        self.is_red = is_red
        
        # Set colors based on side
        if is_red:
            self.trail_color = RED
            self.glow_func = lambda alpha: (alpha + 20, alpha // 3, 0)
            self.blip_glow = lambda alpha: (alpha + 40, alpha // 4, 0)
            self.blip_color = RED_BRIGHT
            self.icon_color = RED_BRIGHT
            self.target_color = RED
        else:
            self.trail_color = CYAN
            self.glow_func = lambda alpha: (0, alpha, alpha + 20)
            self.blip_glow = lambda alpha: (0, alpha, alpha + 20)
            self.blip_color = CYAN
            self.icon_color = CYAN  # Bright cyan for visibility
            self.target_color = CYAN

    def progress(self, now):
        return (now - self.t0) / MISSILE_FLIGHT_SECONDS

    def alive(self, now):
        return self.progress(now) <= 1.05
    
    def _draw_submarine_icon(self, surf, x, y):
        """Draw a small submarine silhouette icon."""
        # Use icon color based on missile type (cyan or red)
        sub_color = self.icon_color
        
        # Submarine body (elongated ellipse shape)
        # Hull
        hull_points = [
            (x - 12, y),
            (x - 10, y - 3),
            (x - 6, y - 4),
            (x + 6, y - 4),
            (x + 10, y - 3),
            (x + 12, y),
            (x + 10, y + 2),
            (x - 10, y + 2),
        ]
        pygame.draw.polygon(surf, sub_color, hull_points, 1)
        
        # Conning tower
        tower_points = [
            (x - 2, y - 4),
            (x - 2, y - 7),
            (x + 2, y - 7),
            (x + 2, y - 4),
        ]
        pygame.draw.polygon(surf, sub_color, tower_points, 1)
        
        # Periscope
        pygame.draw.line(surf, sub_color, (x, y - 7), (x, y - 9), 1)

    def draw(self, surf, now):
        p = max(0.0, min(1.0, self.progress(now)))
        k = max(2, int(p * (len(self.path) - 1)))
        
        # Draw arc with glow - split at screen wrap
        trail_points = self.path[:k]
        segments = split_path_at_wrap(trail_points, self.w)
        
        for seg in segments:
            if len(seg) >= 2:
                # Glow layers
                for i, alpha in [(6, 30), (4, 50), (2, 80)]:
                    glow_surf = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
                    pygame.draw.lines(glow_surf, self.glow_func(alpha), False, seg, ARC_THICKNESS + i)
                    surf.blit(glow_surf, (0, 0), special_flags=pygame.BLEND_ADD)
                # Bright core
                pygame.draw.lines(surf, self.trail_color, False, seg, ARC_THICKNESS)

        # Head blip with glow
        hx, hy = self.path[k - 1]
        for r, alpha in [(BLIP_RADIUS + 6, 40), (BLIP_RADIUS + 3, 80)]:
            pygame.draw.circle(surf, self.blip_glow(alpha), (hx, hy), r)
        pygame.draw.circle(surf, self.blip_color, (hx, hy), BLIP_RADIUS)

        # Submarine icon at launch point (always red)
        sx, sy = self.path[0]
        self._draw_submarine_icon(surf, sx, sy)
        
        # End marker (appears near completion)
        if p > 0.85:
            ex, ey = self.path[-1]
            # Pulsing target
            pulse = int((math.sin(now * 8) + 1) * 2) + 2
            pygame.draw.circle(surf, self.target_color, (ex, ey), pulse, 1)

# ------------ explosion entity ------------
class Explosion:
    """Animated explosion effect when missile reaches target."""
    
    def __init__(self, x, y, created, w, h):
        self.x = x
        self.y = y
        self.t0 = created
        self.w = w
        self.h = h
        self.max_radius = 60
        self.num_rings = 4
    
    def progress(self, now):
        return (now - self.t0) / EXPLOSION_DURATION
    
    def alive(self, now):
        return self.progress(now) <= 1.0
    
    def draw(self, surf, now):
        p = self.progress(now)
        if p < 0 or p > 1:
            return
        
        # Fade out alpha over time
        alpha_mult = 1.0 - (p ** 0.5)
        
        # Draw multiple expanding rings
        for ring in range(self.num_rings):
            # Stagger ring start times
            ring_delay = ring * 0.15
            ring_p = max(0, (p - ring_delay) / (1 - ring_delay)) if p > ring_delay else 0
            
            if ring_p <= 0:
                continue
            
            # Ring expands outward
            radius = int(ring_p * self.max_radius * (1 + ring * 0.3))
            
            # Ring fades as it expands
            ring_alpha = int(255 * alpha_mult * (1 - ring_p ** 0.7))
            if ring_alpha <= 0:
                continue
            
            # Outer glow
            glow_surf = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
            for glow_r, glow_a in [(radius + 8, 20), (radius + 4, 40)]:
                if glow_r > 0:
                    glow_color = (int(180 * alpha_mult), int(20 * alpha_mult), int(20 * alpha_mult), int(glow_a * alpha_mult))
                    pygame.draw.circle(glow_surf, glow_color, (self.x, self.y), glow_r, 3)
            surf.blit(glow_surf, (0, 0), special_flags=pygame.BLEND_ADD)
            
            # Main ring
            ring_color = (min(255, int(255 * alpha_mult)), int(50 * alpha_mult), int(50 * alpha_mult))
            thickness = max(1, int(3 * (1 - ring_p)))
            if radius > thickness:
                pygame.draw.circle(surf, ring_color, (self.x, self.y), radius, thickness)
        
        # Central flash (bright at start, fades quickly)
        if p < 0.3:
            flash_p = p / 0.3
            flash_alpha = int(255 * (1 - flash_p))
            flash_radius = int(10 + flash_p * 20)
            flash_surf = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
            pygame.draw.circle(flash_surf, (255, 200, 200, flash_alpha), (self.x, self.y), flash_radius)
            surf.blit(flash_surf, (0, 0), special_flags=pygame.BLEND_ADD)
            # Bright center
            if flash_radius > 5:
                pygame.draw.circle(surf, RED_BRIGHT, (self.x, self.y), max(2, int(flash_radius * 0.3)))

# ------------ main ------------
def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='WarGames NORAD Display Simulation')
    parser.add_argument('-w', '--windowed', action='store_true', 
                        help='Run in windowed mode instead of fullscreen')
    parser.add_argument('--width', type=int, default=1280,
                        help='Window width in windowed mode (default: 1280)')
    parser.add_argument('--height', type=int, default=720,
                        help='Window height in windowed mode (default: 720)')
    parser.add_argument('--crt', type=int, choices=[0, 1, 2], default=1,
                        help='CRT filter mode: 0=off, 1=light, 2=full (default: 1)')
    args = parser.parse_args()
    
    pygame.init()
    info = pygame.display.Info()
    
    # Track fullscreen state
    is_fullscreen = not args.windowed
    
    if is_fullscreen:
        screen = pygame.display.set_mode((info.current_w, info.current_h), pygame.FULLSCREEN)
    else:
        screen = pygame.display.set_mode((args.width, args.height), pygame.RESIZABLE)
    
    pygame.display.set_caption("NORAD DEFENSE NETWORK")
    clock = pygame.time.Clock()

    w, h = screen.get_size()

    # Load vector map (pre-rendered)
    vector_map = VectorMap(w, h)

    # Overlay assets
    grid = make_grid((w, h))
    scanlines = make_scanlines((w, h))
    vignette = make_vignette((w, h))

    missiles = []
    sub_missiles = []
    explosions = []
    last_launch = 0.0
    last_sub_launch = 0.0
    rng = random.Random()
    
    # CRT filter mode
    crt_mode = args.crt
    
    # Intensity controls (adjustable at runtime)
    launch_interval = DEFAULT_LAUNCH_INTERVAL
    sub_launch_interval = DEFAULT_SUB_LAUNCH_INTERVAL

    # For noise overlay
    noise_surf = pygame.Surface((w, h), pygame.SRCALPHA)

    running = True
    while running:
        now = time.time()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    running = False
                # Intensity controls
                elif event.key == pygame.K_UP:
                    # Increase intensity (faster launches)
                    launch_interval = max(MIN_LAUNCH_INTERVAL, launch_interval * 0.7)
                    sub_launch_interval = max(MIN_LAUNCH_INTERVAL, sub_launch_interval * 0.7)
                    print(f"Intensity UP: land={launch_interval:.1f}s, sub={sub_launch_interval:.1f}s")
                elif event.key == pygame.K_DOWN:
                    # Decrease intensity (slower launches)
                    launch_interval = min(MAX_LAUNCH_INTERVAL, launch_interval * 1.4)
                    sub_launch_interval = min(MAX_LAUNCH_INTERVAL, sub_launch_interval * 1.4)
                    print(f"Intensity DOWN: land={launch_interval:.1f}s, sub={sub_launch_interval:.1f}s")
                elif event.key == pygame.K_r:
                    # Reset to defaults
                    launch_interval = DEFAULT_LAUNCH_INTERVAL
                    sub_launch_interval = DEFAULT_SUB_LAUNCH_INTERVAL
                    print(f"Intensity RESET: land={launch_interval:.1f}s, sub={sub_launch_interval:.1f}s")
                elif event.key == pygame.K_SPACE:
                    # Burst mode - launch multiple missiles at once
                    for _ in range(5):
                        start = rng.choice(POINTS)
                        end = rng.choice([p for p in POINTS if p != start])
                        missiles.append(Missile(start, end, now + rng.random() * 0.5, w, h))
                    for _ in range(3):
                        sub_pos = rng.choice(SUBMARINE_POINTS)
                        is_red = rng.random() < 0.5
                        target = rng.choice(WESTERN_TARGETS if is_red else EASTERN_TARGETS)
                        sub_missiles.append(SubmarineMissile(sub_pos, target, now + rng.random() * 0.5, w, h, is_red))
                    print("BURST MODE!")
                elif event.key == pygame.K_f:
                    # Toggle fullscreen/windowed
                    is_fullscreen = not is_fullscreen
                    if is_fullscreen:
                        screen = pygame.display.set_mode((info.current_w, info.current_h), pygame.FULLSCREEN)
                    else:
                        screen = pygame.display.set_mode((args.width, args.height), pygame.RESIZABLE)
                    # Rebuild assets for new size
                    w, h = screen.get_size()
                    vector_map = VectorMap(w, h)
                    grid = make_grid((w, h))
                    scanlines = make_scanlines((w, h))
                    vignette = make_vignette((w, h))
                    noise_surf = pygame.Surface((w, h), pygame.SRCALPHA)
                    # Update missile paths for new dimensions
                    for m in missiles:
                        m.path = arc_points(m.lat1, m.lon1, m.lat2, m.lon2, w, h, n=220)
                        m.w, m.h = w, h
                    for m in sub_missiles:
                        m.path = arc_points(m.lat1, m.lon1, m.lat2, m.lon2, w, h, n=220)
                        m.w, m.h = w, h
                    for e in explosions:
                        e.w, e.h = w, h
                    print(f"{'Fullscreen' if is_fullscreen else 'Windowed'} mode: {w}x{h}")
                elif event.key == pygame.K_c:
                    # Cycle CRT filter mode
                    crt_mode = (crt_mode + 1) % 3
                    print(f"CRT Filter: {CRT_MODE_NAMES[crt_mode]}")

        # Launch missiles periodically
        if now - last_launch > launch_interval:
            start = rng.choice(POINTS)
            end = rng.choice([p for p in POINTS if p != start])
            missiles.append(Missile(start, end, now, w, h))
            last_launch = now
        
        # Launch submarine missiles periodically
        if now - last_sub_launch > sub_launch_interval:
            sub_pos = rng.choice(SUBMARINE_POINTS)
            # Alternate between targeting East (cyan missiles) and West (red missiles)
            if rng.random() < 0.5:
                # Cyan submarine targets Russia/Eastern side
                target = rng.choice(EASTERN_TARGETS)
                is_red = False
            else:
                # Red submarine targets Americas/Western side
                target = rng.choice(WESTERN_TARGETS)
                is_red = True
            sub_missiles.append(SubmarineMissile(sub_pos, target, now, w, h, is_red))
            last_sub_launch = now

        # Check for missile impacts and spawn explosions
        for m in missiles:
            if m.progress(now) >= 1.0 and not hasattr(m, 'exploded'):
                ex, ey = m.path[-1]
                explosions.append(Explosion(ex, ey, now, w, h))
                m.exploded = True
        
        for m in sub_missiles:
            if m.progress(now) >= 1.0 and not hasattr(m, 'exploded'):
                ex, ey = m.path[-1]
                explosions.append(Explosion(ex, ey, now, w, h))
                m.exploded = True
        
        missiles = [m for m in missiles if m.alive(now)]
        sub_missiles = [m for m in sub_missiles if m.alive(now)]
        explosions = [e for e in explosions if e.alive(now)]

        # Render frame
        screen.fill(BLACK)
        vector_map.draw(screen)
        screen.blit(grid, (0, 0))

        # Draw missiles
        for m in missiles:
            m.draw(screen, now)
        
        # Draw submarine missiles
        for m in sub_missiles:
            m.draw(screen, now)
        
        # Draw explosions
        for e in explosions:
            e.draw(screen, now)

        # Apply CRT filter based on mode
        if crt_mode == CRT_LIGHT:
            # Light mode: just scanlines, vignette, subtle noise
            arr = (np.random.rand(h, w) * 255).astype(np.uint8)
            pixels_rgb = pygame.surfarray.pixels3d(noise_surf)
            pixels_rgb[..., 0] = arr.T
            pixels_rgb[..., 1] = arr.T
            pixels_rgb[..., 2] = arr.T
            del pixels_rgb
            pixels_a = pygame.surfarray.pixels_alpha(noise_surf)
            pixels_a[:] = NOISE_ALPHA
            del pixels_a
            screen.blit(noise_surf, (0, 0))
            screen.blit(scanlines, (0, 0))
            screen.blit(vignette, (0, 0))
            
        elif crt_mode == CRT_FULL:
            # Full mode: all effects including chromatic aberration, bloom, flicker
            # Apply phosphor bloom
            temp_surf = screen.copy()
            temp_surf = apply_phosphor_bloom(temp_surf, 1.2)
            
            # Apply chromatic aberration
            temp_surf = apply_chromatic_aberration(temp_surf, 2)
            
            # Apply screen flicker
            temp_surf = apply_screen_flicker(temp_surf, now, 0.02)
            
            screen.blit(temp_surf, (0, 0))
            
            # Noise overlay (heavier)
            arr = (np.random.rand(h, w) * 255).astype(np.uint8)
            pixels_rgb = pygame.surfarray.pixels3d(noise_surf)
            pixels_rgb[..., 0] = arr.T
            pixels_rgb[..., 1] = arr.T
            pixels_rgb[..., 2] = arr.T
            del pixels_rgb
            pixels_a = pygame.surfarray.pixels_alpha(noise_surf)
            pixels_a[:] = NOISE_ALPHA * 2
            del pixels_a
            screen.blit(noise_surf, (0, 0))
            
            # Heavier scanlines
            screen.blit(scanlines, (0, 0))
            screen.blit(scanlines, (0, 0))  # Double for stronger effect
            
            # Vignette
            screen.blit(vignette, (0, 0))
        
        # CRT_OFF: no effects applied

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()
