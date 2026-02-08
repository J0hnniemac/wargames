#pragma once

#include <cmath>
#include <array>
#include <vector>
#include <memory>

// Screen dimensions
constexpr int SCREEN_WIDTH = 1920;
constexpr int SCREEN_HEIGHT = 1080;

// Colors (R, G, B, A)
struct Color {
    float r, g, b, a;
    
    constexpr Color(float r = 0.0f, float g = 0.0f, float b = 0.0f, float a = 1.0f)
        : r(r), g(g), b(b), a(a) {}
};

// Predefined colors matching Python version
namespace Colors {
    inline constexpr Color BLACK{0.0f, 0.0f, 0.0f, 1.0f};
    inline constexpr Color CYAN{0.0f, 1.0f, 1.0f, 1.0f};
    inline constexpr Color DIM_CYAN{0.0f, 0.4f, 0.4f, 1.0f};
    inline constexpr Color DARKER_CYAN{0.0f, 0.3f, 0.3f, 1.0f};
    inline constexpr Color RED{1.0f, 0.196f, 0.196f, 1.0f}; // 255, 50, 50
    inline constexpr Color WHITE{1.0f, 1.0f, 1.0f, 1.0f};
}

// 2D Point
struct Point {
    float x, y;
    
    Point() : x(0), y(0) {}
    Point(float x, float y) : x(x), y(y) {}
};

// Geographic coordinate
struct LatLon {
    double lat, lon;
    
    constexpr LatLon() : lat(0), lon(0) {}
    constexpr LatLon(double lat, double lon) : lat(lat), lon(lon) {}
};

// Target locations (matching Python list)
inline const std::array<LatLon, 20> TARGET_LOCATIONS = {{
    {55.7558, 37.6173},    // Moscow
    {39.9042, 116.4074},   // Beijing
    {35.6762, 139.6503},   // Tokyo
    {51.5074, -0.1278},    // London
    {48.8566, 2.3522},     // Paris
    {52.5200, 13.4050},    // Berlin
    {38.9072, -77.0369},   // Washington DC
    {40.7128, -74.0060},   // New York
    {34.0522, -118.2437},  // Los Angeles
    {41.8781, -87.6298},   // Chicago
    {29.7604, -95.3698},   // Houston
    {33.4484, -112.0740},  // Phoenix
    {37.7749, -122.4194},  // San Francisco
    {47.6062, -122.3321},  // Seattle
    {25.7617, -80.1918},   // Miami
    {32.7157, -117.1611},  // San Diego
    {42.3601, -71.0589},   // Boston
    {39.7392, -104.9903},  // Denver
    {45.5152, -122.6784},  // Portland
    {30.2672, -97.7431}    // Austin
}};

// Western targets (Americas) - lon < 0
inline const std::array<LatLon, 5> WESTERN_TARGETS = {{
    {38.9, -77.0},    // Washington DC
    {40.71, -74.0},   // NYC
    {34.05, -118.24}, // LA
    {64.13, -21.89},  // Reykjavik
    {-34.6, -58.38}   // Buenos Aires
}};

// Eastern targets (Russia/Asia/Europe) - lon > 0
inline const std::array<LatLon, 7> EASTERN_TARGETS = {{
    {55.75, 37.62},   // Moscow
    {51.5, -0.12},    // London
    {35.68, 139.76},  // Tokyo
    {39.9, 116.4},    // Beijing
    {-33.86, 151.2},  // Sydney
    {28.61, 77.21},   // Delhi
    {59.33, 18.07}    // Stockholm
}};

// Submarine launch positions (ocean coordinates)
inline const std::array<LatLon, 12> SUBMARINE_POINTS = {{
    {35.0, -45.0},   // North Atlantic
    {45.0, -30.0},   // Mid Atlantic
    {60.0, -20.0},   // North Atlantic (near Iceland)
    {40.0, 160.0},   // North Pacific
    {25.0, -155.0},  // Central Pacific
    {50.0, -140.0},  // Northeast Pacific
    {10.0, 65.0},    // Indian Ocean
    {-30.0, 40.0},   // South Indian Ocean
    {70.0, 40.0},    // Barents Sea
    {55.0, 170.0},   // Bering Sea
    {15.0, -60.0},   // Caribbean
    {-45.0, -60.0}   // South Atlantic
}};

// Utility functions
inline Point lonlat_to_xy(double lon, double lat, int width, int height) {
    float x = (lon + 180.0f) / 360.0f * width;
    float y = (90.0f - lat) / 180.0f * height;
    return Point(x, y);
}

inline float clamp(float value, float min, float max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

inline float distance(float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return std::sqrt(dx * dx + dy * dy);
}
