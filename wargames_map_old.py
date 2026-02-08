import math
import random
import time
import pygame
import numpy as np
from PIL import Image
from geographiclib.geodesic import Geodesic

# ------------ config ------------
MAP_IMAGE = "world_2to1.png"  # equirectangular (2:1) map image
FPS = 60
LAUNCH_EVERY_SECONDS = 2.5
MISSILE_FLIGHT_SECONDS = 12.0

# Visual style (tweak to taste)
ARC_THICKNESS = 2
BLIP_RADIUS = 3
GRID_ALPHA = 35
SCANLINE_ALPHA = 35
NOISE_ALPHA = 18
VIGNETTE_STRENGTH = 140  # higher = darker edges

# A few fun launch/destination points (lat, lon)
POINTS = [
    (38.9, -77.0),   # Washington DC
    (55.75, 37.62),  # Moscow
    (51.5, -0.12),   # London
    (35.68, 139.76), # Tokyo
    (39.9, 116.4),   # Beijing
    (-33.86, 151.2), # Sydney
    (28.61, 77.21),  # Delhi
    (40.71, -74.0),  # NYC
    (34.05, -118.24) # LA
]

# ------------ helpers ------------
def load_image(path):
    """Load image using PIL to avoid pygame SDL_image limitations."""
    pil_image = Image.open(path).convert("RGB")
    return pygame.image.fromstring(pil_image.tobytes(), pil_image.size, "RGB")

def latlon_to_xy(lat, lon, w, h):
    """Equirectangular projection."""
    x = (lon + 180.0) / 360.0 * w
    y = (90.0 - lat) / 180.0 * h
    return int(x), int(y)

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
    # Smooth edge darkening
    v = np.clip((d ** 1.8) * VIGNETTE_STRENGTH, 0, 255).astype(np.uint8)
    # Build RGBA array (black with varying alpha) transposed for pygame (w, h, 4)
    rgba = np.zeros((w, h, 4), dtype=np.uint8)
    rgba[..., 3] = v.T  # alpha channel (transposed to match w,h)
    # Use make_surface and set alpha from array
    pixels = pygame.surfarray.pixels_alpha(surf)
    pixels[:] = rgba[..., 3]
    del pixels  # release surface lock
    return surf

def make_grid(size):
    w, h = size
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    # Latitude lines every 15°, longitude every 30°
    for lat in range(-75, 90, 15):
        y = int((90 - lat) / 180 * h)
        pygame.draw.line(surf, (0, 255, 0, GRID_ALPHA), (0, y), (w, y))
    for lon in range(-180, 181, 30):
        x = int((lon + 180) / 360 * w)
        pygame.draw.line(surf, (0, 255, 0, GRID_ALPHA), (x, 0), (x, h))
    return surf

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

# ------------ missile entity ------------
class Missile:
    def __init__(self, start, end, created, w, h):
        self.lat1, self.lon1 = start
        self.lat2, self.lon2 = end
        self.t0 = created
        self.path = arc_points(self.lat1, self.lon1, self.lat2, self.lon2, w, h, n=220)

    def progress(self, now):
        return (now - self.t0) / MISSILE_FLIGHT_SECONDS

    def alive(self, now):
        return self.progress(now) <= 1.05

    def draw(self, surf, now):
        p = max(0.0, min(1.0, self.progress(now)))
        # Draw partial arc (up to progress)
        k = max(2, int(p * (len(self.path) - 1)))
        color = (0, 255, 0)
        pygame.draw.lines(surf, color, False, self.path[:k], ARC_THICKNESS)

        # Head blip
        hx, hy = self.path[k - 1]
        pygame.draw.circle(surf, color, (hx, hy), BLIP_RADIUS)

        # Start/end markers
        sx, sy = self.path[0]
        ex, ey = self.path[-1]
        pygame.draw.circle(surf, color, (sx, sy), 2)
        if p > 0.9:
            pygame.draw.circle(surf, color, (ex, ey), 2)

# ------------ main ------------
def main():
    pygame.init()
    info = pygame.display.Info()
    screen = pygame.display.set_mode((info.current_w, info.current_h), pygame.FULLSCREEN)
    pygame.display.set_caption("WAR GAMES-STYLE MAP")
    clock = pygame.time.Clock()

    w, h = screen.get_size()

    # Load & scale map to screen
    bg = load_image(MAP_IMAGE)
    bg = pygame.transform.smoothscale(bg, (w, h))

    # Overlay assets
    grid = make_grid((w, h))
    scanlines = make_scanlines((w, h))
    vignette = make_vignette((w, h))

    missiles = []
    last_launch = 0.0
    rng = random.Random()

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

        # Launch missiles periodically
        if now - last_launch > LAUNCH_EVERY_SECONDS:
            start = rng.choice(POINTS)
            end = rng.choice([p for p in POINTS if p != start])
            missiles.append(Missile(start, end, now, w, h))
            last_launch = now

        missiles = [m for m in missiles if m.alive(now)]

        # Base render
        screen.blit(bg, (0, 0))

        # Optional: tint map green-ish by blending a translucent green layer
        tint = pygame.Surface((w, h), pygame.SRCALPHA)
        tint.fill((0, 80, 0, 70))
        screen.blit(tint, (0, 0))

        screen.blit(grid, (0, 0))

        # Draw missiles
        for m in missiles:
            m.draw(screen, now)

        # Noise overlay
        arr = (np.random.rand(h, w) * 255).astype(np.uint8)
        # Set RGB channels (transposed for pygame w,h,3 format)
        pixels_rgb = pygame.surfarray.pixels3d(noise_surf)
        pixels_rgb[..., 0] = arr.T
        pixels_rgb[..., 1] = arr.T
        pixels_rgb[..., 2] = arr.T
        del pixels_rgb
        # Set alpha channel
        pixels_a = pygame.surfarray.pixels_alpha(noise_surf)
        pixels_a[:] = NOISE_ALPHA
        del pixels_a
        screen.blit(noise_surf, (0, 0))

        # CRT overlays
        screen.blit(scanlines, (0, 0))
        screen.blit(vignette, (0, 0))

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()