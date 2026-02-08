#include "Missile.hpp"
#include <GeographicLib/Geodesic.hpp>
#include <GeographicLib/GeodesicLine.hpp>
#include <cmath>

using namespace GeographicLib;

Missile::Missile(const LatLon& start, const LatLon& end, const Color& color)
    : m_basePos(lonlat_to_xy(start.lon, start.lat, SCREEN_WIDTH, SCREEN_HEIGHT))
    , m_color(color)
    , m_progress(0.0f)
    , m_duration(12.0f)
{
    calculatePath(start, end);
}

void Missile::calculatePath(const LatLon& start, const LatLon& end, int samples) {
    const Geodesic& geod = Geodesic::WGS84();
    
    // Calculate geodesic line
    double s12, azi1, azi2;
    geod.Inverse(start.lat, start.lon, end.lat, end.lon, s12, azi1, azi2);
    
    GeodesicLine line = geod.Line(start.lat, start.lon, azi1);
    
    m_path.clear();
    m_path.reserve(samples);
    
    for (int i = 0; i < samples; i++) {
        double t = static_cast<double>(i) / (samples - 1);
        double lat, lon;
        line.Position(t * s12, lat, lon);
        
        m_path.push_back(lonlat_to_xy(lon, lat, SCREEN_WIDTH, SCREEN_HEIGHT));
    }
}

void Missile::update(float dt) {
    m_progress += dt / m_duration;
    if (m_progress > 1.0f) {
        m_progress = 1.0f;
    }
}

void Missile::draw(Renderer* renderer) {
    if (m_path.empty()) return;
    
    // Draw base icon at launch point
    drawBase(renderer, m_basePos);
    
    // Calculate how many points to draw based on progress
    int numPoints = static_cast<int>(m_progress * m_path.size());
    if (numPoints < 2) return;
    
    std::vector<Point> visiblePath(m_path.begin(), m_path.begin() + numPoints);

    // Split trail at antimeridian to avoid straight-line wrap artifacts.
    std::vector<Point> currentSegment;
    currentSegment.reserve(visiblePath.size());
    currentSegment.push_back(visiblePath[0]);

    for (size_t i = 1; i < visiblePath.size(); i++) {
        float dx = std::abs(visiblePath[i].x - visiblePath[i - 1].x);
        if (dx > SCREEN_WIDTH * 0.5f) {
            if (currentSegment.size() > 1) {
                renderer->drawPathWithGlow(currentSegment, m_color, 5);
            }
            currentSegment.clear();
            currentSegment.push_back(visiblePath[i]);
        } else {
            currentSegment.push_back(visiblePath[i]);
        }
    }

    if (currentSegment.size() > 1) {
        renderer->drawPathWithGlow(currentSegment, m_color, 5);
    }
    
    // Draw pulsing target marker at 85% progress
    if (m_progress >= 0.85f && m_progress < 1.0f) {
        Point targetPos = m_path.back();
        
        // Pulsing effect
        float pulse = 0.5f + 0.5f * std::sin(m_progress * 20.0f);
        float radius = 10.0f + pulse * 5.0f;
        
        Color pulseColor(m_color.r, m_color.g, m_color.b, 0.5f + pulse * 0.5f);
        renderer->drawCircleWithGlow(targetPos.x, targetPos.y, radius, pulseColor, 3);
    }
}

void Missile::drawBase(Renderer* renderer, const Point& pos) const {
    const float size = 12.0f;
    
    // Triangle pointing upward
    Point p1(pos.x, pos.y - size);           // top point
    Point p2(pos.x - size * 0.866f, pos.y + size * 0.5f);  // bottom left
    Point p3(pos.x + size * 0.866f, pos.y + size * 0.5f);  // bottom right
    
    renderer->drawLineWithGlow(p1.x, p1.y, p2.x, p2.y, m_color, 3);
    renderer->drawLineWithGlow(p2.x, p2.y, p3.x, p3.y, m_color, 3);
    renderer->drawLineWithGlow(p3.x, p3.y, p1.x, p1.y, m_color, 3);
}

Point Missile::getPosition() const {
    if (m_path.empty()) return Point(0, 0);
    
    int idx = static_cast<int>(m_progress * (m_path.size() - 1));
    if (idx >= m_path.size()) idx = m_path.size() - 1;
    
    return m_path[idx];
}

SubmarineMissile::SubmarineMissile(const LatLon& start, const LatLon& end, const Color& color)
    : Missile(start, end, color)
    , m_submarinePos(m_basePos)
{
}

void SubmarineMissile::draw(Renderer* renderer) {
    if (m_path.empty()) return;
    
    // Draw submarine icon at start position instead of base
    drawSubmarine(renderer, m_submarinePos);
    
    // Calculate how many points to draw based on progress
    int numPoints = static_cast<int>(m_progress * m_path.size());
    if (numPoints < 2) return;
    
    std::vector<Point> visiblePath(m_path.begin(), m_path.begin() + numPoints);

    // Split trail at antimeridian to avoid straight-line wrap artifacts.
    std::vector<Point> currentSegment;
    currentSegment.reserve(visiblePath.size());
    currentSegment.push_back(visiblePath[0]);

    for (size_t i = 1; i < visiblePath.size(); i++) {
        float dx = std::abs(visiblePath[i].x - visiblePath[i - 1].x);
        if (dx > SCREEN_WIDTH * 0.5f) {
            if (currentSegment.size() > 1) {
                renderer->drawPathWithGlow(currentSegment, m_color, 5);
            }
            currentSegment.clear();
            currentSegment.push_back(visiblePath[i]);
        } else {
            currentSegment.push_back(visiblePath[i]);
        }
    }

    if (currentSegment.size() > 1) {
        renderer->drawPathWithGlow(currentSegment, m_color, 5);
    }
    
    // Draw pulsing target marker at 85% progress
    if (m_progress >= 0.85f && m_progress < 1.0f) {
        Point targetPos = m_path.back();
        
        // Pulsing effect
        float pulse = 0.5f + 0.5f * std::sin(m_progress * 20.0f);
        float radius = 10.0f + pulse * 5.0f;
        
        Color pulseColor(m_color.r, m_color.g, m_color.b, 0.5f + pulse * 0.5f);
        renderer->drawCircleWithGlow(targetPos.x, targetPos.y, radius, pulseColor, 3);
    }
}

void SubmarineMissile::drawSubmarine(Renderer* renderer, const Point& pos) {
    const float size = 8.0f;

    // Submarine silhouette (outline)
    const Point hull[] = {
        Point(pos.x - 12.0f, pos.y),
        Point(pos.x - 10.0f, pos.y - 3.0f),
        Point(pos.x - 6.0f, pos.y - 4.0f),
        Point(pos.x + 6.0f, pos.y - 4.0f),
        Point(pos.x + 10.0f, pos.y - 3.0f),
        Point(pos.x + 12.0f, pos.y),
        Point(pos.x + 10.0f, pos.y + 2.0f),
        Point(pos.x - 10.0f, pos.y + 2.0f)
    };

    const int hullCount = static_cast<int>(sizeof(hull) / sizeof(hull[0]));
    for (int i = 0; i < hullCount; i++) {
        const Point& a = hull[i];
        const Point& b = hull[(i + 1) % hullCount];
        renderer->drawLineWithGlow(a.x, a.y, b.x, b.y, m_color, 3);
    }

    // Conning tower
    Point t1(pos.x - size * 0.25f, pos.y - size * 0.5f);
    Point t2(pos.x - size * 0.25f, pos.y - size * 1.1f);
    Point t3(pos.x + size * 0.25f, pos.y - size * 1.1f);
    Point t4(pos.x + size * 0.25f, pos.y - size * 0.5f);
    renderer->drawLineWithGlow(t1.x, t1.y, t2.x, t2.y, m_color, 3);
    renderer->drawLineWithGlow(t2.x, t2.y, t3.x, t3.y, m_color, 3);
    renderer->drawLineWithGlow(t3.x, t3.y, t4.x, t4.y, m_color, 3);
    renderer->drawLineWithGlow(t4.x, t4.y, t1.x, t1.y, m_color, 3);

    // Periscope
    renderer->drawLineWithGlow(pos.x, pos.y - size * 1.1f, pos.x, pos.y - size * 1.4f, m_color, 3);
}
