/**
 * Missile - Represents a missile with geodesic trajectory
 */

import { lonLatToXY, isInViewport, Colors, isRussiaOrJapanTarget } from './utils.js';

export class Missile {
    constructor(start, target, duration = 12.0) {
        this.start = start;  // { lat, lon, name }
        this.target = target; // { lat, lon, name }
        this.duration = duration;
        this.progress = 0.0;
        this.finished = false;
        this.path = [];
        
        // Determine color based on target
        this.color = isRussiaOrJapanTarget(target.lat, target.lon) ? Colors.RED : Colors.CYAN;
        
        // Calculate geodesic path using turf.js
        this.calculatePath();
    }

    calculatePath() {
        const numPoints = 220;
        
        // Use turf.js for great circle calculation
        const from = turf.point([this.start.lon, this.start.lat]);
        const to = turf.point([this.target.lon, this.target.lat]);
        
        const line = turf.greatCircle(from, to, { npoints: numPoints });
        
        this.path = line.geometry.coordinates.map(coord => ({
            lon: coord[0],
            lat: coord[1]
        }));
    }

    update(deltaTime) {
        if (this.finished) return;
        
        this.progress += deltaTime / this.duration;
        
        if (this.progress >= 1.0) {
            this.progress = 1.0;
            this.finished = true;
        }
    }

    render(renderer, viewport = null) {
        // Render progressive path based on progress
        const numPointsToRender = Math.floor(this.path.length * this.progress);
        if (numPointsToRender < 2) return;
        
        const screenPoints = [];
        for (let i = 0; i < numPointsToRender; i++) {
            const p = this.path[i];
            if (!viewport || isInViewport(p.lon, p.lat, viewport)) {
                const sp = lonLatToXY(p.lon, p.lat, renderer.canvas.width, renderer.canvas.height, viewport);
                screenPoints.push(sp);
            }
        }
        
        if (screenPoints.length < 2) return;
        
        // Multi-layer glow effect (3 passes)
        const baseColor = [...this.color];
        
        // Layer 1: Thick, very transparent
        baseColor[3] = 0.1;
        renderer.drawLineStrip(screenPoints, baseColor, 5.0);
        
        // Layer 2: Medium, semi-transparent
        baseColor[3] = 0.3;
        renderer.drawLineStrip(screenPoints, baseColor, 2.0);
        
        // Layer 3: Thin, opaque
        baseColor[3] = 0.8;
        renderer.drawLineStrip(screenPoints, baseColor, 1.0);
        
        // Render pulsing target marker at 85% progress
        if (this.progress >= 0.85) {
            const pulse= Math.sin(this.progress * 50.0) * 0.5 + 0.5;
            const radius = 5 + pulse * 3;
            
            if (!viewport || isInViewport(this.target.lon, this.target.lat, viewport)) {
                const targetPos = lonLatToXY(
                    this.target.lon,
                    this.target.lat,
                    renderer.canvas.width,
                    renderer.canvas.height,
                    viewport
                );
                
                const markerColor = [...this.color];
                markerColor[3] = 0.6 + pulse * 0.4;
                renderer.drawCircle(targetPos.x, targetPos.y, radius, markerColor, 16);
            }
        }
        
        // Render launch point marker
        if (!viewport || isInViewport(this.start.lon, this.start.lat, viewport)) {
            const startPos = lonLatToXY(
                this.start.lon,
                this.start.lat,
                renderer.canvas.width,
                renderer.canvas.height,
                viewport
            );
            
            const markerColor = [...this.color];
            markerColor[3] = 0.5;
            
            // Draw triangle marker (simple approach: small circle for now)
            renderer.drawCircle(startPos.x, startPos.y, 3, markerColor, 8);
        }
    }

    isInView(viewport) {
        if (!viewport) return true;
        
        // Check if any point in path is in viewport
        for (const p of this.path) {
            if (isInViewport(p.lon, p.lat, viewport)) {
                return true;
            }
        }
        return false;
    }
}
