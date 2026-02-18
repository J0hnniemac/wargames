/**
 * Main entry point for Wargames WebGL visualization
 */

import { AssetLoader } from './AssetLoader.js';
import { ScreenManager } from './ScreenManager.js';
import { SimulationState } from './SimulationState.js';
import { formatTime } from './utils.js';

class WargamesApp {
    constructor() {
        this.assets = null;
        this.screenManager = null;
        this.simulationState = null;
        this.lastTime = 0;
        this.running = false;
    }

    async init() {
        try {
            console.log('🎮 Initializing Wargames visualization...');
            
            // Check if turf.js is loaded
            if (typeof turf === 'undefined') {
                throw new Error('turf.js library not loaded. Please ensure lib/turf.min.js is accessible.');
            }
            console.log('✓ turf.js loaded');
            
            // Show loading screen
            const loadingScreen = document.getElementById('loading-screen');
            const loadingProgress = document.getElementById('loading-progress');
            const loadingStatus = document.getElementById('loading-status');
            
            // Load all assets
            const loader = new AssetLoader();
            this.assets = await loader.loadAll((progress, status) => {
                loadingProgress.style.width = `${progress * 100}%`;
                loadingStatus.textContent = status;
            });
            
            console.log('✓ All assets loaded');
            console.log('  - Shaders:', Object.keys(this.assets.shaders).length);
            console.log('  - Data files:', Object.keys(this.assets.data).length);
            
            // Hide loading screen
            loadingScreen.classList.add('hidden');
            
            // Initialize simulation state
            this.simulationState = new SimulationState(this.assets.data['targets']);
            this.simulationState.initializeSimulation();
            console.log('✓ Simulation initialized with', this.simulationState.missiles.length, 'missiles');
            
            // Initialize screen manager
            const container = document.getElementById('screen-grid');
            this.screenManager = new ScreenManager(container, this.assets, this.simulationState);
            console.log('✓ Screen manager initialized with', this.screenManager.screens.length, 'screens');
            
            // Start game loop
            this.running = true;
            this.lastTime = performance.now() / 1000.0;
            requestAnimationFrame((t) => this.gameLoop(t));
            
            // Setup keyboard controls
            this.setupControls();
            
            console.log('✅ Wargames visualization initialized successfully');
            console.log('Controls: R=Reset, P/Space=Pause, F=Fullscreen');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            const loadingStatus = document.getElementById('loading-status');
            loadingStatus.textContent = `Error: ${error.message}`;
            loadingStatus.style.color = '#f00';
        }
    }

    gameLoop(timestamp) {
        if (!this.running) return;
        
        const currentTime = timestamp / 1000.0;
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Cap delta time to avoid large jumps
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        // Update simulation
        this.simulationState.update(cappedDelta);
        
        // Render all screens
        this.screenManager.render(currentTime);
        
        // Update timestamp display
        this.updateTimestamp();
        
        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateTimestamp() {
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement) {
            timestampElement.textContent = formatTime(this.simulationState.time);
        }
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case 'r':
                    // Reset simulation
                    this.simulationState.reset();
                    console.log('Simulation reset');
                    break;
                    
                case 'p':
                case ' ':
                    // Pause/resume
                    if (this.simulationState.running) {
                        this.simulationState.pause();
                        console.log('Simulation paused');
                    } else {
                        this.simulationState.resume();
                        console.log('Simulation resumed');
                    }
                    break;
                    
                case 'f':
                    // Toggle fullscreen
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen();
                    } else {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
    }

    dispose() {
        this.running = false;
        if (this.screenManager) {
            this.screenManager.dispose();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new WargamesApp();
        app.init();
        
        // Make app accessible for debugging
        window.wargamesApp = app;
    });
} else {
    const app = new WargamesApp();
    app.init();
    window.wargamesApp = app;
}
