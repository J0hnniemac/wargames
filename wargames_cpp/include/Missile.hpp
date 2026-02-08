#pragma once

#include "Common.hpp"
#include "Renderer.hpp"
#include <vector>

class Missile {
public:
    Missile(const LatLon& start, const LatLon& end, const Color& color);
    virtual ~Missile() = default;
    
    virtual void update(float dt);
    virtual void draw(Renderer* renderer);
    
    bool isFinished() const { return m_progress >= 1.0f; }
    Point getPosition() const;
    
protected:
    std::vector<Point> m_path;
    Point m_basePos;
    Color m_color;
    float m_progress;
    float m_duration;
    
    void calculatePath(const LatLon& start, const LatLon& end, int samples = 220);
    void drawBase(Renderer* renderer, const Point& pos) const;
};

class SubmarineMissile : public Missile {
public:
    SubmarineMissile(const LatLon& start, const LatLon& end, const Color& color);
    
    void draw(Renderer* renderer) override;
    
private:
    Point m_submarinePos;
    
    void drawSubmarine(Renderer* renderer, const Point& pos);
};
