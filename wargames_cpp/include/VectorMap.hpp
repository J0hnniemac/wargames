#pragma once

#include "Common.hpp"
#include "Renderer.hpp"
#include <vector>
#include <string>

class VectorMap {
public:
    VectorMap(Renderer* renderer);
    ~VectorMap();
    
    bool loadShapefiles(const std::string& coastlinePath, const std::string& countriesPath);
    void draw();
    
private:
    struct LineSegment {
        std::vector<Point> points;
        Color color;
    };
    
    Renderer* m_renderer;
    std::vector<LineSegment> m_coastlines;
    std::vector<LineSegment> m_borders;
    std::vector<LineSegment> m_russiaBorders;
    
    bool loadCoastlines(const std::string& path);
    bool loadCountries(const std::string& path);
    void splitAtAntimeridian(const std::vector<Point>& points, std::vector<LineSegment>& output, const Color& color);
    bool crossesAntimeridian(const Point& p1, const Point& p2);
};
