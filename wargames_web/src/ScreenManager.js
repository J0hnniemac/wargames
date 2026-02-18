/**
 * ScreenManager - Manages multi-screen grid layout
 */

import { Renderer } from './Renderer.js';
import { VectorMap } from './VectorMap.js';
import { TicTacToeGame } from './TicTacToeGame.js';

export class ScreenManager {
    constructor(containerElement, assets, simulationState) {
        this.container = containerElement;
        this.assets = assets;
        this.simulationState = simulationState;
        this.screens = [];
        this.screenConfigs = assets.data['screen-configs'];
        this.vectorMap = null;
        this.ticTacToeGame = new TicTacToeGame();
        
        // Initialize vector map (shared across all screens)
        this.vectorMap = new VectorMap(
            assets.data['ne_110m_coastline'],
            assets.data['ne_110m_admin_0_countries']
        );
        
        this.createScreens();
        this.setupResizeHandler();
    }

    getLayoutForViewport() {
        const width = window.innerWidth;
        
        if (width < 768) {
            return 'mobile';
        } else if (width < 1280) {
            return 'tablet';
        } else if (width < 1920) {
            return 'desktop';
        } else if (width < 2560) {
            return 'large';
        } else {
            return 'ultrawide';
        }
    }

   createScreens() {
        // Clear existing screens
        this.disposeScreens();
        this.container.innerHTML = '';
        
        const layout = this.getLayoutForViewport();
        const screenConfigs = this.screenConfigs.layouts[layout] || this.screenConfigs.layouts.desktop;
        
        for (let i = 0; i < screenConfigs.length; i++) {
            const config = screenConfigs[i];
            this.createScreen(config, i);
        }
    }

    createScreen(config, index) {
        // Create container div
        const screenDiv = document.createElement('div');
        screenDiv.className = 'screen-container';
        screenDiv.dataset.screenIndex = index;
        
        // Add special class for certain types
        if (config.type === 'RADAR') {
            screenDiv.classList.add('radar');
        } else if (config.type === 'TARGET_LIST') {
            screenDiv.classList.add('target-list');
        }
        
        // Create label
        const label = document.createElement('div');
        label.className = 'screen-label';
        label.textContent = config.label;
        screenDiv.appendChild(label);
        
        // For text-based screens (status panels, target lists, defcon), create text overlay  
        if (config.type === 'STATUS_PANEL' || 
            config.type === 'TARGET_LIST' ||
            config.type === 'DEFCON_STATUS') {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'screen-status';
            statusDiv.dataset.screenType = config.type;
            screenDiv.appendChild(statusDiv);
            
            this.container.appendChild(screenDiv);
            
            this.screens.push({
                element: screenDiv,
                config: config,
                type: config.type,
                statusDiv: statusDiv,
                renderer: null,
                canvas: null
            });
            
            return;
        }
        
        // For tic-tac-toe, create a canvas-based screen
        if (config.type === 'TICTACTOE') {
            // Hide CSS label — the canvas draws its own title
            label.style.display = 'none';
            
            const canvas = document.createElement('canvas');
            const rect = this.container.getBoundingClientRect();
            
            // Estimate canvas size based on grid layout
            const layout = this.getLayoutForViewport();
            let cols, rows;
            
            if (layout === 'mobile') {
                cols = 1; rows = 1;
            } else if (layout === 'tablet') {
                cols = 2; rows = 2;
            } else if (layout === 'desktop') {
                cols = 3; rows = 3;
            } else if (layout === 'large') {
                cols = 4; rows = 3;
            } else {
                cols = 4; rows = 4;
            }
            
            const gap = 16;
            canvas.width = Math.floor((window.innerWidth - gap * cols) / cols);
            canvas.height = Math.floor((window.innerHeight - gap * rows) / rows);
            
            screenDiv.appendChild(canvas);
            this.container.appendChild(screenDiv);
            
            this.screens.push({
                element: screenDiv,
                config: config,
                type: config.type,
                statusDiv: null,
                renderer: null,
                canvas: canvas
            });
            
            return;
        }
        
        // Create canvas for graphical screens
        const canvas = document.createElement('canvas');
        const rect = this.container.getBoundingClientRect();
        
        // Estimate canvas size based on grid layout
        const layout = this.getLayoutForViewport();
        let cols, rows;
        
        if (layout === 'mobile') {
            cols = 1; rows = 1;
        } else if (layout === 'tablet') {
            cols = 2; rows = 2;
        } else if (layout === 'desktop') {
            cols = 3; rows = 3;
        } else if (layout === 'large') {
            cols = 4; rows = 3;
        } else {
            cols = 4; rows = 4;
        }
        
        const gap = 16; // 8px gap on each side
        canvas.width = Math.floor((window.innerWidth - gap * cols) / cols);
        canvas.height = Math.floor((window.innerHeight - gap * rows) / rows);
        
        screenDiv.appendChild(canvas);
        this.container.appendChild(screenDiv);
        
        // Create renderer for this screen
        const renderer = new Renderer(canvas, this.assets);
        
        // Set viewport if this is a regional view
        if (config.type === 'NORTH_AMERICA' || 
            config.type === 'EUROPE' || 
            config.type === 'ASIA' || 
            config.type === 'PACIFIC') {
            renderer.setViewport({
                centerLat: config.centerLat || 0,
                centerLon: config.centerLon || 0,
                zoom: config.zoom || 1.0
            });
        }
        
        this.screens.push({
            element: screenDiv,
            canvas: canvas,
            renderer: renderer,
            config: config,
            type: config.type,
            statusDiv: null
        });
    }

    render(time) {
        // Update tic-tac-toe game
        this.ticTacToeGame.update(1/60, time); // Assume 60 FPS for delta time
        
        // Get current stats from simulation
        const stats = this.simulationState.getStats();
        
        for (const screen of this.screens) {
            if (screen.type === 'STATUS_PANEL') {
                this.renderStatusPanel(screen, stats);
            } else if (screen.type === 'TARGET_LIST') {
                this.renderTargetList(screen, stats);
            } else if (screen.type === 'TICTACTOE') {
                if (screen.canvas) {
                    this.ticTacToeGame.renderToCanvas(screen.canvas);
                }
            } else if (screen.type === 'DEFCON_STATUS') {
                this.renderDefconStatus(screen, stats);
            } else if (screen.renderer) {
                this.renderGraphicalScreen(screen, time);
            }
        }
    }

    renderGraphicalScreen(screen, time) {
        const renderer = screen.renderer;
        const viewport = renderer.viewport;
        
        // Begin scene rendering
        renderer.beginScene();
        
        // Render vector map
        this.vectorMap.render(renderer, viewport);
        
        // Render missiles (with viewport culling)
        for (const missile of this.simulationState.missiles) {
            if (!viewport || missile.isInView(viewport)) {
                missile.render(renderer, viewport);
            }
        }
        
        // Render explosions
        for (const explosion of this.simulationState.explosions) {
            if (!viewport || explosion.isInView(viewport)) {
                explosion.render(renderer, time, viewport);
            }
        }
        
        // Render aircraft
        for (const aircraft of this.simulationState.aircraft) {
            if (!viewport || aircraft.isInView(viewport)) {
                aircraft.render(renderer, viewport);
            }
        }
        
        // End scene (skip post-processing for now to debug map rendering)
        renderer.endScene();
        //renderer.applyPostProcessing(time);
    }

    renderStatusPanel(screen, stats) {
        if (!screen.statusDiv) return;
        
        const lines = [
            `WOPR SYSTEM STATUS`,
            ``,
            `ACTIVE MISSILES: ${stats.missiles}`,
            `ACTIVE EXPLOSIONS: ${stats.explosions}`,
            `AIRCRAFT TRACKED: ${stats.aircraft}`,
            ``,
            `SIMULATION TIME: ${Math.floor(stats.time)}s`,
            `DEFCON LEVEL: 1`,
            ``,
            `STATUS: ACTIVE`,
            `MODE: THERMONUCLEAR WAR`,
            ``
        ];
        
        screen.statusDiv.innerHTML = lines.join('<br>');
    }

    renderTargetList(screen, stats) {
        if (!screen.statusDiv) return;
        
        const lines = [
            `TARGET STATUS REPORT`,
            ``,
        ];
        
        // Show first several missiles
        const missilesToShow = Math.min(15, this.simulationState.missiles.length);
        for (let i = 0; i < missilesToShow; i++) {
            const missile = this.simulationState.missiles[i];
            const progress = Math.floor(missile.progress * 100);
            const status = missile.progress >= 1.0 ? 'IMPACT' : 'TRACKING';
            const startName = missile.start.name || 'UNKNOWN';
            const targetName = missile.target.name || 'UNKNOWN';
            lines.push(`${i + 1}. ${startName} → ${targetName} [${progress}%] ${status}`);
        }
        
        if (this.simulationState.missiles.length === 0) {
            lines.push(`NO ACTIVE TARGETS`);
        }
        
        screen.statusDiv.innerHTML = lines.join('<br>');
    }

    renderDefconStatus(screen, stats) {
        if (!screen.statusDiv) return;
        
        const defconLevel = Math.min(5, Math.max(1, 6 - Math.floor(stats.missiles / 3)));
        const threatLevel = stats.missiles > 10 ? 'CRITICAL' : stats.missiles > 5 ? 'HIGH' : 'MODERATE';
        
        const lines = [
            `╔═══════════════════════╗`,
            `║   DEFCON LEVEL: ${defconLevel}     ║`,
            `╚═══════════════════════╝`,
            ``,
            `THREAT ASSESSMENT: ${threatLevel}`,
            ``,
            `ACTIVE THREATS:`,
            `  MISSILES.......: ${stats.missiles}`,
            `  EXPLOSIONS.....: ${stats.explosions}`,
            `  AIRCRAFT.......: ${stats.aircraft}`,
            ``,
            `ALERT STATUS:`,
            defconLevel === 1 ? `  ⚠ MAXIMUM READINESS` : '',
            defconLevel === 2 ? `  ⚠ ARMED FORCES READY` : '',
            defconLevel === 3 ? `  ○ INCREASE READINESS` : '',
            defconLevel === 4 ? `  ○ NORMAL READINESS` : '',
            defconLevel === 5 ? `  ○ PEACETIME` : '',
            ``,
            `TIME ELAPSED: ${Math.floor(stats.time)}s`,
            ``,
            defconLevel <= 2 ? `>>> STRATEGIC COMMAND <<<` : '',
            defconLevel <= 2 ? `>>> LAUNCH AUTHORIZED <<<` : ''
        ].filter(line => line !== ''); // Remove empty conditional lines
        
        screen.statusDiv.innerHTML = lines.join('<br>');
        screen.statusDiv.style.fontFamily = "'Courier New', monospace";
        screen.statusDiv.style.fontSize = '11px';
        screen.statusDiv.style.lineHeight = '1.5';
        screen.statusDiv.style.color = defconLevel <= 2 ? '#ff3333' : '#00ffff';
    }

    resize() {
        this.createScreens();
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
            }, 250);
        });
    }

    disposeScreens() {
        for (const screen of this.screens) {
            if (screen.renderer) {
                screen.renderer.dispose();
            }
        }
        this.screens = [];
    }

    dispose() {
        this.disposeScreens();
    }
}
