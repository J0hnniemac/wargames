/**
 * Explosion - Represents expanding ring explosion effect
 */

import { lonLatToXY, isInViewport, Colors } from './utils.js';

export class Explosion {
    constructor(lat, lon, startTime) {
        this.lat = lat;
        this.lon = lon;
        this.startTime = startTime;
        this.duration = 2.5; // seconds
        this.finished = false;
        
        // 4 ring waves with staggered timing
        this.rings = [
            { delay: 0.0, maxRadius: 80 },
            { delay: 0.3, maxRadius: 100 },
            { delay: 0.6, maxRadius: 120 },
            { delay: 0.9, maxRadius: 140 }
        ];
    }

    update(currentTime) {
        const elapsed = currentTime - this.startTime;
        
        if (elapsed >= this.duration) {
            this.finished = true;
        }
    }

    render(renderer, currentTime, viewport = null) {
        if (!viewport || isInViewport(this.lon, this.lat, viewport)) {
            const elapsed = currentTime - this.startTime;
            const centerPos = lonLatToXY(
                this.lon,
                this.lat,
                renderer.canvas.width,
                renderer.canvas.height,
                viewport
            );
            
            // Render each ring
            for (const ring of this.rings) {
                const ringElapsed = elapsed - ring.delay;
                if (ringElapsed < 0) continue;
                if (ringElapsed > this.duration - ring.delay) continue;
                
                const ringProgress = ringElapsed / (this.duration - ring.delay);
                const radius = ringProgress * ring.maxRadius;
                const alpha = 1.0 - ringProgress;
                
                // Red explosion color with fade
                const color = [...Colors.RED];
                color[3] = alpha * 0.8;
                
                // Multiple glow layers
                color[3] = alpha * 0.2;
                renderer.drawCircle(centerPos.x, centerPos.y, radius + 4, color, 32);
                
                color[3] = alpha * 0.5;
                renderer.drawCircle(centerPos.x, centerPos.y, radius + 2, color, 32);
                
                color[3] = alpha * 0.8;
                renderer.drawCircle(centerPos.x, centerPos.y, radius, color, 32);
                
                // Central flash for early rings
                if (ringElapsed < 0.3) {
                    const flashAlpha = (1.0 - ringElapsed / 0.3) * 0.6;
                    const flashColor = [1.0, 1.0, 1.0, flashAlpha];
                    renderer.drawCircle(centerPos.x, centerPos.y, 10, flashColor, 16);
                }
            }
        }
    }

    isInView(viewport) {
        if (!viewport) return true;
        return isInViewport(this.lon, this.lat, viewport);
    }
}
