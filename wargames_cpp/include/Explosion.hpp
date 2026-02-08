#pragma once

#include "Common.hpp"
#include "Renderer.hpp"

class Explosion {
public:
    Explosion(float x, float y, const Color& color);
    
    void update(float dt);
    void draw(Renderer* renderer);
    
    bool isFinished() const { return m_age >= m_duration; }
    
private:
    float m_x, m_y;
    Color m_color;
    float m_age;
    float m_duration;
    
    static constexpr int NUM_RINGS = 4;
    static constexpr float RING_DELAYS[NUM_RINGS] = {0.0f, 0.3f, 0.6f, 0.9f};
};
