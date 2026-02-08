#include "Aircraft.hpp"
#include <cmath>
#include <algorithm>

namespace {
    double wrapLongitude(double lon) {
        while (lon > 180.0) lon -= 360.0;
        while (lon < -180.0) lon += 360.0;
        return lon;
    }
}

Aircraft::Aircraft(const LatLon& center, double radiusDeg, float loopSeconds, const Color& color)
    : m_color(color)
    , m_progress(0.0f)
    , m_duration(loopSeconds)
    , m_trailLength(18)
{
    buildLoop(center, radiusDeg);
}

void Aircraft::buildLoop(const LatLon& center, double radiusDeg, int samples) {
    m_path.clear();
    m_path.reserve(samples);

    for (int i = 0; i < samples; i++) {
        double t = static_cast<double>(i) / samples;
        double angle = t * 2.0 * M_PI;
        double lat = center.lat + radiusDeg * std::sin(angle);
        double lon = center.lon + radiusDeg * std::cos(angle);
        lon = wrapLongitude(lon);

        m_path.push_back(lonlat_to_xy(lon, lat, SCREEN_WIDTH, SCREEN_HEIGHT));
    }
}

void Aircraft::update(float dt) {
    if (m_duration <= 0.0f || m_path.empty()) return;

    m_progress += dt / m_duration;
    if (m_progress >= 1.0f) {
        m_progress -= std::floor(m_progress);
    }
}

void Aircraft::draw(Renderer* renderer) const {
    if (m_path.size() < 2) return;

    int count = static_cast<int>(m_path.size());
    int idx = static_cast<int>(m_progress * (count - 1));
    if (idx < 0) idx = 0;
    if (idx >= count) idx = count - 1;

    const Point head = m_path[idx];
    renderer->drawCircleWithGlow(head.x, head.y, 3.0f, m_color, 3);

    // Tag: short leader line + small box
    const float tagOffsetX = 10.0f;
    const float tagOffsetY = -8.0f;
    const float tagW = 10.0f;
    const float tagH = 6.0f;
    const float tagX = head.x + tagOffsetX;
    const float tagY = head.y + tagOffsetY;

    Color tagColor(m_color.r, m_color.g, m_color.b, 0.8f);
    renderer->drawLineWithGlow(head.x, head.y, tagX, tagY, tagColor, 2);
    renderer->drawLineWithGlow(tagX, tagY, tagX + tagW, tagY, tagColor, 2);
    renderer->drawLineWithGlow(tagX + tagW, tagY, tagX + tagW, tagY + tagH, tagColor, 2);
    renderer->drawLineWithGlow(tagX + tagW, tagY + tagH, tagX, tagY + tagH, tagColor, 2);
    renderer->drawLineWithGlow(tagX, tagY + tagH, tagX, tagY, tagColor, 2);
}
