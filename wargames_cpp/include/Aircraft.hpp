#pragma once

#include "Common.hpp"
#include "Renderer.hpp"
#include <vector>

class Aircraft {
public:
    Aircraft(const LatLon& center, double radiusDeg, float loopSeconds, const Color& color);

    void update(float dt);
    void draw(Renderer* renderer) const;

private:
    std::vector<Point> m_path;
    Color m_color;
    float m_progress;
    float m_duration;
    int m_trailLength;

    void buildLoop(const LatLon& center, double radiusDeg, int samples = 240);
};
