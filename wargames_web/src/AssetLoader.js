/**
 * AssetLoader - Handles loading of all external resources
 */

export class AssetLoader {
    constructor() {
        this.assets = {
            shaders: {},
            data: {},
            ready: false
        };
        this.loadProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadAll(onProgress) {
        const shaderFiles = [
            'basic.vert',
            'basic.frag',
            'fullscreen.vert',
            'barrel.frag',
            'chromatic.frag',
            'bloom.frag',
            'composite.frag'
        ];

        const dataFiles = [
            'ne_110m_coastline.json',
            'ne_110m_admin_0_countries.json',
            'targets.json',
            'screen-configs.json'
        ];

        this.totalAssets = shaderFiles.length + dataFiles.length;

        try {
            // Load shaders
            const shaderPromises = shaderFiles.map(async (file) => {
                const source = await this.loadText(`shaders/${file}`);
                this.assets.shaders[file] = source;
                this.loadedAssets++;
                if (onProgress) {
                    onProgress(this.loadedAssets / this.totalAssets, `Loading ${file}`);
                }
            });

            // Load data files
            const dataPromises = dataFiles.map(async (file) => {
                const data = await this.loadJSON(`data/${file}`);
                this.assets.data[file.replace('.json', '')] = data;
                this.loadedAssets++;
                if (onProgress) {
                    onProgress(this.loadedAssets / this.totalAssets, `Loading ${file}`);
                }
            });

            await Promise.all([...shaderPromises, ...dataPromises]);

            this.assets.ready = true;
            return this.assets;
        } catch (error) {
            console.error('Error loading assets:', error);
            throw error;
        }
    }

    async loadText(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        return await response.text();
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        return await response.json();
    }
}
