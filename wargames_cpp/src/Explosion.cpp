#include "Explosion.hpp"
#include <cmath>

constexpr float Explosion::RING_DELAYS[NUM_RINGS];

Explosion::Explosion(float x, float y, const Color& color)
    : m_x(x)
    , m_y(y)
    , m_color(color)
    , m_age(0.0f)
    , m_duration(2.5f)
{
}

void Explosion::update(float dt) {
    m_age += dt;
}

void Explosion::draw(Renderer* renderer) {
    const float maxRadius = 50.0f;
    const float ringDuration = m_duration - RING_DELAYS[NUM_RINGS - 1];
    
    // Draw each ring
    for (int i = 0; i < NUM_RINGS; i++) {
        float ringAge = m_age - RING_DELAYS[i];
        if (ringAge < 0.0f) continue;
        
        float t = ringAge / ringDuration;
        if (t > 1.0f) continue;
        
        // Expanding radius
        float radius = t * maxRadius;
        
        // Fading alpha
        float alpha = 1.0f - t;
        
        Color ringColor(m_color.r, m_color.g, m_color.b, alpha * m_color.a);
        renderer->drawCircleWithGlow(m_x, m_y, radius, ringColor, 4);
    }
    
    // Central flash (brightest at start)
    if (m_age < 0.5f) {
        float flashAlpha = 1.0f - (m_age / 0.5f);
        float flashRadius = 5.0f + m_age * 10.0f;
        
        Color flashColor(m_color.r, m_color.g, m_color.b, flashAlpha);
        renderer->drawCircleWithGlow(m_x, m_y, flashRadius, flashColor, 5);
    }
}
