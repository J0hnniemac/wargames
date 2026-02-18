/**
 * VectorMap - Renders world map from GeoJSON data
 */

import { lonLatToXY, isInViewport, Colors, isRussiaOrJapanTarget } from './utils.js';

export class VectorMap {
    constructor(coastlineData, countriesData) {
        this.coastlines = this.processGeoJSON(coastlineData);
        this.countries = this.processGeoJSON(countriesData);
    }

    processGeoJSON(geojson) {
        const features = [];
        
        for (const feature of geojson.features) {
            const geometry = feature.geometry;
            const name = feature.properties.name || '';
            
            if (geometry.type === 'LineString') {
                features.push({
                    coordinates: geometry.coordinates,
                    name: name,
                    type: 'LineString'
                });
            } else if (geometry.type === 'MultiLineString') {
                for (const line of geometry.coordinates) {
                    features.push({
                        coordinates: line,
                        name: name,
                        type: 'LineString'
                    });
                }
            } else if (geometry.type === 'Polygon') {
                for (const ring of geometry.coordinates) {
                    features.push({
                        coordinates: ring,
                        name: name,
                        type: 'Polygon'
                    });
                }
            } else if (geometry.type === 'MultiPolygon') {
                for (const polygon of geometry.coordinates) {
                    for (const ring of polygon) {
                        features.push({
                            coordinates: ring,
                            name: name,
                            type: 'Polygon'
                        });
                    }
                }
            }
        }
        
        return features;
    }

    render(renderer, viewport = null) {
        // Render coastlines with bright cyan
        const coastDrawn = this.renderFeatures(renderer, this.coastlines, Colors.CYAN, viewport);
        
        // Render country borders with dimmer cyan (or red for Russia/Japan)
        const countryDrawn = this.renderFeatures(renderer, this.countries, Colors.DIM_CYAN, viewport, true);
        
        // Debug: log once
        if (!this._debugLogged) {
            this._debugLogged = true;
            console.log(`VectorMap: ${this.coastlines.length} coastline features, ${this.countries.length} country features`);
            console.log(`VectorMap: drew ${coastDrawn} coastline segments, ${countryDrawn} country segments`);
            console.log(`VectorMap: viewport =`, viewport);
            console.log(`VectorMap: canvas = ${renderer.canvas.width}x${renderer.canvas.height}`);
        }
    }

    renderFeatures(renderer, features, defaultColor, viewport = null, checkSpecialCountries = false) {
        let segmentsDrawn = 0;
        for (const feature of features) {
            // Determine color
            let color = defaultColor;
            
            if (checkSpecialCountries && (
                feature.name === 'Russia' ||
                feature.name === 'Japan' ||
                feature.name === 'Russian Federation'
            )) {
                color = Colors.RED;
            }
            
            // Convert coordinates to screen space
            const screenPoints = [];
            let prevLon = null;
            
            for (const coord of feature.coordinates) {
                const lon = coord[0];
                const lat = coord[1];
                
                // Check for antimeridian crossing (large longitude jump)
                if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
                    // Render current segment before the jump
                    if (screenPoints.length > 1) {
                        this.renderLineSegment(renderer, screenPoints, color, viewport);
                        segmentsDrawn++;
                    }
                    screenPoints.length = 0; // Clear for new segment
                }
                
                // Only add point if it's potentially visible
                if (!viewport || this.isRoughlyInViewport(lon, lat, viewport)) {
                    const sp = lonLatToXY(lon, lat, renderer.canvas.width, renderer.canvas.height, viewport);
                    screenPoints.push(sp);
                }
                
                prevLon = lon;
            }
            
            // Render final segment
            if (screenPoints.length > 1) {
                this.renderLineSegment(renderer, screenPoints, color, viewport);
                segmentsDrawn++;
            }
        }
        return segmentsDrawn;
    }

    renderLineSegment(renderer, points, baseColor, viewport) {
        if (points.length < 2) return;
        
        // Note: WebGL lineWidth > 1.0 is not widely supported.
        // Use a single solid line pass for maximum visibility.
        const color = [...baseColor];
        color[3] = 1.0;
        renderer.drawLineStrip(points, color, 1.0);
    }

    isRoughlyInViewport(lon, lat, viewport) {
        if (!viewport) return true;
        
        const { centerLon, centerLat, zoom } = viewport;
        const margin = 20; // degrees of margin for culling
        const halfWidth = 180.0 / (zoom || 1.0) + margin;
        const halfHeight = 90.0 / (zoom || 1.0) + margin;
        
        return (
            lon >= centerLon - halfWidth &&
            lon <= centerLon + halfWidth &&
            lat >= centerLat - halfHeight &&
            lat <= centerLat + halfHeight
        );
    }
}
