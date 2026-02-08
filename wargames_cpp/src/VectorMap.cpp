#include "VectorMap.hpp"
#include <shapefil.h>
#include <iostream>
#include <cmath>

VectorMap::VectorMap(Renderer* renderer)
    : m_renderer(renderer)
{
}

VectorMap::~VectorMap() {
}

bool VectorMap::loadShapefiles(const std::string& coastlinePath, const std::string& countriesPath) {
    bool success = true;
    
    if (!loadCoastlines(coastlinePath)) {
        std::cerr << "Failed to load coastlines from: " << coastlinePath << "\n";
        success = false;
    }
    
    if (!loadCountries(countriesPath)) {
        std::cerr << "Failed to load countries from: " << countriesPath << "\n";
        success = false;
    }
    
    return success;
}

bool VectorMap::loadCoastlines(const std::string& path) {
    SHPHandle hSHP = SHPOpen(path.c_str(), "rb");
    if (!hSHP) {
        return false;
    }
    
    int nEntities, nShapeType;
    double adfMinBound[4], adfMaxBound[4];
    SHPGetInfo(hSHP, &nEntities, &nShapeType, adfMinBound, adfMaxBound);
    
    std::cout << "Loading coastlines: " << nEntities << " entities\n";
    
    for (int i = 0; i < nEntities; i++) {
        SHPObject* psShape = SHPReadObject(hSHP, i);
        if (!psShape) continue;
        
        // Process each part of the shape
        for (int part = 0; part < psShape->nParts; part++) {
            int startIdx = psShape->panPartStart[part];
            int endIdx = (part + 1 < psShape->nParts) ? psShape->panPartStart[part + 1] : psShape->nVertices;
            
            std::vector<Point> points;
            for (int j = startIdx; j < endIdx; j++) {
                double lon = psShape->padfX[j];
                double lat = psShape->padfY[j];
                points.push_back(lonlat_to_xy(lon, lat, SCREEN_WIDTH, SCREEN_HEIGHT));
            }
            
            if (!points.empty()) {
                 splitAtAntimeridian(points, m_coastlines, Colors::DIM_CYAN);
            }
        }
        
        SHPDestroyObject(psShape);
    }
    
    SHPClose(hSHP);
    return true;
}

bool VectorMap::loadCountries(const std::string& path) {
    SHPHandle hSHP = SHPOpen(path.c_str(), "rb");
    DBFHandle hDBF = DBFOpen(path.c_str(), "rb");
    
    if (!hSHP || !hDBF) {
        if (hSHP) SHPClose(hSHP);
        if (hDBF) DBFClose(hDBF);
        return false;
    }
    
    int nEntities, nShapeType;
    double adfMinBound[4], adfMaxBound[4];
    SHPGetInfo(hSHP, &nEntities, &nShapeType, adfMinBound, adfMaxBound);
    
    std::cout << "Loading countries: " << nEntities << " entities\n";
    
    // Find NAME field
    int nameFieldIdx = DBFGetFieldIndex(hDBF, "NAME");
    if (nameFieldIdx < 0) {
        nameFieldIdx = DBFGetFieldIndex(hDBF, "ADMIN");
    }
    
    for (int i = 0; i < nEntities; i++) {
        SHPObject* psShape = SHPReadObject(hSHP, i);
        if (!psShape) continue;
        
        // Check if this is Russia or Japan
        bool isRedCountry = false;
        if (nameFieldIdx >= 0) {
            const char* name = DBFReadStringAttribute(hDBF, i, nameFieldIdx);
            std::string countryName(name ? name : "");
            if (countryName.find("Russia") != std::string::npos ||
                countryName.find("RUSSIA") != std::string::npos ||
                countryName.find("Japan") != std::string::npos ||
                countryName.find("JAPAN") != std::string::npos) {
                isRedCountry = true;
            }
        }
        
        Color borderColor = isRedCountry ? Colors::RED : Colors::DARKER_CYAN;
        auto& targetVector = isRedCountry ? m_russiaBorders : m_borders;
        
        // Process each part of the shape
        for (int part = 0; part < psShape->nParts; part++) {
            int startIdx = psShape->panPartStart[part];
            int endIdx = (part + 1 < psShape->nParts) ? psShape->panPartStart[part + 1] : psShape->nVertices;
            
            std::vector<Point> points;
            for (int j = startIdx; j < endIdx; j++) {
                double lon = psShape->padfX[j];
                double lat = psShape->padfY[j];
                points.push_back(lonlat_to_xy(lon, lat, SCREEN_WIDTH, SCREEN_HEIGHT));
            }
            
            if (!points.empty()) {
                splitAtAntimeridian(points, targetVector, borderColor);
            }
        }
        
        SHPDestroyObject(psShape);
    }
    
    DBFClose(hDBF);
    SHPClose(hSHP);
    return true;
}

void VectorMap::splitAtAntimeridian(const std::vector<Point>& points, std::vector<LineSegment>& output, const Color& color) {
    if (points.empty()) return;
    
    std::vector<Point> currentSegment;
    currentSegment.push_back(points[0]);
    
    for (size_t i = 1; i < points.size(); i++) {
        if (crossesAntimeridian(points[i-1], points[i])) {
            // Save current segment
            if (currentSegment.size() > 1) {
                output.push_back({currentSegment, color});
            }
            // Start new segment
            currentSegment.clear();
            currentSegment.push_back(points[i]);
        } else {
            currentSegment.push_back(points[i]);
        }
    }
    
    // Save final segment
    if (currentSegment.size() > 1) {
        output.push_back({currentSegment, color});
    }
}

bool VectorMap::crossesAntimeridian(const Point& p1, const Point& p2) {
    // Check if the distance between points is more than half the screen width
    // This indicates a wrap around the antimeridian
    float dx = std::abs(p2.x - p1.x);
    return dx > SCREEN_WIDTH * 0.5f;
}

void VectorMap::draw() {
    // Draw coastlines
    for (const auto& segment : m_coastlines) {
        m_renderer->drawPathWithGlow(segment.points, segment.color, 3);
    }
    
    // Draw country borders (excluding Russia)
    for (const auto& segment : m_borders) {
        m_renderer->drawPathWithGlow(segment.points, segment.color, 3);
    }
    
    // Draw Russia last in red
    for (const auto& segment : m_russiaBorders) {
        m_renderer->drawPathWithGlow(segment.points, segment.color, 3);
    }
}
