/**
 * SimulationState - Manages all simulation entities and state
 */

import { Missile } from './Missile.js';
import { Explosion } from './Explosion.js';
import { createAircraftFleet } from './Aircraft.js';
import { randomElement, randomInt } from './utils.js';

export class SimulationState {
    constructor(targetsData) {
        this.targetsData = targetsData;
        this.missiles = [];
        this.explosions = [];
        this.aircraft = createAircraftFleet();
        this.time = 0;
        this.missileSpawnInterval = 2.0; // seconds between missile launches
        this.timeSinceLastSpawn = 0;
        this.running = true;
    }

    update(deltaTime) {
        if (!this.running) return;
        
        this.time += deltaTime;
        this.timeSinceLastSpawn += deltaTime;
        
        // Update all missiles
        for (const missile of this.missiles) {
            missile.update(deltaTime);
            
            // Spawn explosion when missile finishes
            if (missile.finished && !missile.exploded) {
                missile.exploded = true;
                this.explosions.push(new Explosion(
                    missile.target.lat,
                    missile.target.lon,
                    this.time
                ));
            }
        }
        
        // Update all explosions
        for (const explosion of this.explosions) {
            explosion.update(this.time);
        }
        
        // Update all aircraft
        for (const aircraft of this.aircraft) {
            aircraft.update(deltaTime);
        }
        
        // Spawn new missiles periodically
        if (this.timeSinceLastSpawn >= this.missileSpawnInterval) {
            this.spawnMissile();
            this.timeSinceLastSpawn = 0;
        }
        
        // Clean up finished entities
        this.missiles = this.missiles.filter(m => !m.finished || !m.exploded);
        this.explosions = this.explosions.filter(e => !e.finished);
    }

    spawnMissile() {
        // Randomly choose between land-based and submarine launches
        const useSub = Math.random() < 0.4;
        
        let start, target;
        
        if (useSub) {
            // Submarine launch
            start = randomElement(this.targetsData.submarines);
            
            // Randomly target east or west
            if (start.lon < 0) {
                // Western hemisphere sub targets eastern cities
                target = randomElement(this.targetsData.easternTargets);
            } else {
                // Eastern hemisphere sub targets western cities
                target = randomElement(this.targetsData.westernTargets);
            }
        } else {
            // Land-based launch between major cities
            const cities = this.targetsData.cities;
            const startIdx = randomInt(0, cities.length - 1);
            let targetIdx = randomInt(0, cities.length - 1);
            
            // Make sure target is different from start
            while (targetIdx === startIdx) {
                targetIdx = randomInt(0, cities.length - 1);
            }
            
            start = cities[startIdx];
            target = cities[targetIdx];
        }
        
        this.missiles.push(new Missile(start, target));
    }

    // Initialize with some missiles
    initializeSimulation() {
        // Spawn initial batch of missiles
        for (let i = 0; i < 15; i++) {
            this.spawnMissile();
            // Stagger their progress
            const lastMissile = this.missiles[this.missiles.length - 1];
            lastMissile.progress = Math.random() * 0.8;
        }
    }

    getStats() {
        return {
            missiles: this.missiles.length,
            explosions: this.explosions.length,
            aircraft: this.aircraft.length,
            time: this.time
        };
    }

    reset() {
        this.missiles = [];
        this.explosions = [];
        this.aircraft = createAircraftFleet();
        this.time = 0;
        this.timeSinceLastSpawn = 0;
        this.initializeSimulation();
    }

    pause() {
        this.running = false;
    }

    resume() {
        this.running = true;
    }
}
