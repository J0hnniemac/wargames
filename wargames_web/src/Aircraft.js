/**
 * Aircraft - Represents circling aircraft with identification
 */

import { lonLatToXY, isInViewport, Colors } from './utils.js';

export class Aircraft {
    constructor(centerLat, centerLon, radius, speed, name) {
        this.centerLat = centerLat;
        this.centerLon = centerLon;
        this.radius = radius; // in degrees
        this.speed = speed; // radians per second
        this.name = name;
        this.angle = Math.random() * Math.PI * 2;
        this.color = Colors.CYAN;
    }

    update(deltaTime) {
        this.angle += this.speed * deltaTime;
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
    }

    getCurrentPosition() {
        return {
            lat: this.centerLat + Math.sin(this.angle) * this.radius,
            lon: this.centerLon + Math.cos(this.angle) * this.radius
        };
    }

    render(renderer, viewport = null) {
        const pos = this.getCurrentPosition();
        
        if (!viewport || isInViewport(pos.lon, pos.lat, viewport)) {
            const screenPos = lonLatToXY(
                pos.lon,
                pos.lat,
                renderer.canvas.width,
                renderer.canvas.height,
                viewport
            );
            
            // Draw aircraft icon (simple triangle pointing in direction of movement)
            const iconSize = 4;
            const color = [...this.color];
            color[3] = 0.7;
            
            // Simple circle for now (can be enhanced to triangle later)
            renderer.drawCircle(screenPos.x, screenPos.y, iconSize, color, 6);
            
            // Draw leader line to identification box
            const boxX = screenPos.x + 20;
            const boxY = screenPos.y - 20;
            
            color[3] = 0.4;
            renderer.drawLine(screenPos.x, screenPos.y, boxX, boxY, color, 1.0);
            
            // Draw ID box border (simplified - just a small rectangle outline)
            color[3] = 0.6;
            const boxWidth = 40;
            const boxHeight = 12;
            renderer.drawLine(boxX, boxY, boxX + boxWidth, boxY, color, 1.0);
            renderer.drawLine(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxHeight, color, 1.0);
            renderer.drawLine(boxX + boxWidth, boxY + boxHeight, boxX, boxY + boxHeight, color, 1.0);
            renderer.drawLine(boxX, boxY + boxHeight, boxX, boxY, color, 1.0);
        }
    }

    isInView(viewport) {
        if (!viewport) return true;
        const pos = this.getCurrentPosition();
        return isInViewport(pos.lon, pos.lat, viewport);
    }
}

// Factory function to create standard set of aircraft
export function createAircraftFleet() {
    return [
        new Aircraft(40.0, -100.0, 5.0, 0.3, "USAF-01"),
        new Aircraft(35.0, 140.0, 4.0, 0.25, "JASDF-02"),
        new Aircraft(55.0, 35.0, 6.0, 0.2, "RuAF-03"),
        new Aircraft(50.0, 10.0, 4.5, 0.28, "NATO-04"),
        new Aircraft(0.0, -30.0, 8.0, 0.15, "SAC-05"),
        new Aircraft(-30.0, 150.0, 5.5, 0.22, "RAAF-06"),
        new Aircraft(65.0, -25.0, 3.0, 0.35, "NORAD-07"),
        new Aircraft(25.0, 55.0, 4.0, 0.26, "IAF-08"),
        new Aircraft(45.0, 160.0, 5.0, 0.24, "PLAAF-09"),
        new Aircraft(10.0, -80.0, 6.0, 0.18, "CAP-10"),
        new Aircraft(-10.0, 100.0, 4.5, 0.27, "PATROL-11"),
        new Aircraft(60.0, 90.0, 5.5, 0.21, "ARCTIC-12")
    ];
}
