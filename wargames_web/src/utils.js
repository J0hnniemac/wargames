/**
 * Utility functions for coordinate transformations and helpers
 */

// Convert longitude/latitude to screen x/y coordinates
export function lonLatToXY(lon, lat, width, height, viewport = null) {
    if (viewport) {
        // Regional view with custom viewport
        const { centerLon, centerLat, zoom } = viewport;
        const zoomLevel = zoom || 1.0;
        
        // Calculate the visible range based on zoom level
        // At zoom=1, see full 360° lon, 180° lat
        // At zoom=2, see 180° lon, 90° lat
        const viewRangeX = 360.0 / zoomLevel;  // Longitude range visible
        const viewRangeY = 180.0 / zoomLevel;  // Latitude range visible
        
        // Calculate relative position from center
        const relLon = lon - centerLon;
        const relLat = lat - centerLat;
        
        // Normalize to [-1, 1] based on visible range
        const normX = relLon / (viewRangeX / 2.0);
        const normY = relLat / (viewRangeY / 2.0);
        
        // Map to screen space [0, width] and [0, height]
        const x = ((normX + 1.0) / 2.0) * width;
        const y = ((1.0 - normY) / 2.0) * height;
        
        return { x, y };
    } else {
        // Equirectangular projection for global view
        const x = ((lon + 180.0) / 360.0) * width;
        const y = ((90.0 - lat) / 180.0) * height;
        return { x, y };
    }
}

// Check if coordinates are within viewport bounds
export function isInViewport(lon, lat, viewport) {
    if (!viewport) return true; // Global view shows everything
    
    const { centerLon, centerLat, zoom } = viewport;
    const halfWidth = 180.0 / (zoom ||1.0);
    const halfHeight = 90.0 / (zoom || 1.0);
    
    return (
        lon >= centerLon - halfWidth &&
        lon <= centerLon + halfWidth &&
        lat >= centerLat - halfHeight &&
        lat <= centerLat + halfHeight
    );
}

// Handle antimeridian crossing for line segments
export function splitSegmentAtAntimeridian(lon1, lat1, lon2, lat2) {
    const lonDiff = Math.abs(lon2 - lon1);
    
    // If segment crosses antimeridian (large longitude jump)
    if (lonDiff > 180) {
        // Return two segments, one on each side
        return [
            { segments: [[lon1, lat1]], crossesAntimeridian: true },
            { segments: [[lon2, lat2]], crossesAntimeridian: true }
        ];
    }
    
    return [{ segments: [[lon1, lat1], [lon2, lat2]], crossesAntimeridian: false }];
}

// Random float between min and max
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Random integer between min and max (inclusive)
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random element from array
export function randomElement(array) {
    return array[randomInt(0, array.length - 1)];
}

// Format time as HH:MM:SS
export function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Color utilities
export const Colors = {
    BLACK: [0.0, 0.0, 0.0, 1.0],
    CYAN: [0.0, 1.0, 1.0, 1.0],
    DIM_CYAN: [0.0, 0.4, 0.4, 1.0],
    DARKER_CYAN: [0.0, 0.3, 0.3, 1.0],
    RED: [1.0, 0.196, 0.196, 1.0],
    WHITE: [1.0, 1.0, 1.0, 1.0]
};

// Check if target is Moscow or Tokyo (for red coloring)
export function isRussiaOrJapanTarget(lat, lon) {
    const MOSCOW_LAT = 55.7558;
    const MOSCOW_LON = 37.6173;
    const TOKYO_LAT = 35.6762;
    const TOKYO_LON = 139.6503;
    const EPSILON = 0.01;
    
    const isMoscow = Math.abs(lat - MOSCOW_LAT) < EPSILON && Math.abs(lon - MOSCOW_LON) < EPSILON;
    const isTokyo = Math.abs(lat - TOKYO_LAT) < EPSILON && Math.abs(lon - TOKYO_LON) < EPSILON;
    
    return isMoscow || isTokyo;
}

// Matrix multiplication for 4x4 matrices
export function mat4Multiply(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] = 
                a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return result;
}

// Create orthographic projection matrix
export function createOrthographicProjection(left, right, bottom, top) {
    const near = -1;
    const far = 1;
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    
    return new Float32Array([
        -2 * lr, 0, 0, 0,
        0, -2 * bt, 0, 0,
        0, 0, 2 * nf, 0,
        (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
    ]);
}
