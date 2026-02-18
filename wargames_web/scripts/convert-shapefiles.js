#!/usr/bin/env node

/**
 * Convert ESRI Shapefiles to GeoJSON for web usage
 * Usage: node convert-shapefiles.js
 */

import shapefile from 'shapefile';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, '..', 'wargames_cpp', 'data');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data');

async function convertShapefile(name, simplify = true) {
    console.log(`Converting ${name}...`);
    
    const source = await shapefile.open(
        path.join(SOURCE_DIR, `${name}.shp`),
        path.join(SOURCE_DIR, `${name}.dbf`)
    );
    
    const features = [];
    let result = await source.read();
    
    while (!result.done) {
        if (result.value) {
            features.push(result.value);
        }
        result = await source.read();
    }
    
    const geojson = {
        type: 'FeatureCollection',
        features: features
    };
    
    // Simplify by removing unnecessary properties if needed
    if (simplify) {
        geojson.features = geojson.features.map(f => ({
            type: 'Feature',
            geometry: f.geometry,
            properties: {
                name: f.properties.NAME || f.properties.ADMIN || 'Unknown'
            }
        }));
    }
    
    const outputPath = path.join(OUTPUT_DIR, `${name}.json`);
    await fs.writeFile(outputPath, JSON.stringify(geojson, null, 2));
    console.log(`  ✓ Wrote ${outputPath}`);
}

async function generateTargetsData() {
    console.log('Generating targets.json...');
    
    const targets = {
        cities: [
            { lat: 55.7558, lon: 37.6173, name: "Moscow" },
            { lat: 39.9042, lon: 116.4074, name: "Beijing" },
            { lat: 35.6762, lon: 139.6503, name: "Tokyo" },
            { lat: 51.5074, lon: -0.1278, name: "London" },
            { lat: 48.8566, lon: 2.3522, name: "Paris" },
            { lat: 52.5200, lon: 13.4050, name: "Berlin" },
            { lat: 38.9072, lon: -77.0369, name: "Washington DC" },
            { lat: 40.7128, lon: -74.0060, name: "New York" },
            { lat: 34.0522, lon: -118.2437, name: "Los Angeles" },
            { lat: 41.8781, lon: -87.6298, name: "Chicago" },
            { lat: 29.7604, lon: -95.3698, name: "Houston" },
            { lat: 33.4484, lon: -112.0740, name: "Phoenix" },
            { lat: 37.7749, lon: -122.4194, name: "San Francisco" },
            { lat: 47.6062, lon: -122.3321, name: "Seattle" },
            { lat: 25.7617, lon: -80.1918, name: "Miami" },
            { lat: 32.7157, lon: -117.1611, name: "San Diego" },
            { lat: 42.3601, lon: -71.0589, name: "Boston" },
            { lat: 39.7392, lon: -104.9903, name: "Denver" },
            { lat: 45.5152, lon: -122.6784, name: "Portland" },
            { lat: 30.2672, lon: -97.7431, name: "Austin" }
        ],
        westernTargets: [
            { lat: 38.9, lon: -77.0, name: "Washington DC" },
            { lat: 40.71, lon: -74.0, name: "NYC" },
            { lat: 34.05, lon: -118.24, name: "LA" },
            { lat: 64.13, lon: -21.89, name: "Reykjavik" },
            { lat: -34.6, lon: -58.38, name: "Buenos Aires" }
        ],
        easternTargets: [
            { lat: 55.75, lon: 37.62, name: "Moscow" },
            { lat: 51.5, lon: -0.12, name: "London" },
            { lat: 35.68, lon: 139.76, name: "Tokyo" },
            { lat: 39.9, lon: 116.4, name: "Beijing" },
            { lat: -33.86, lon: 151.2, name: "Sydney" },
            { lat: 28.61, lon: 77.21, name: "Delhi" },
            { lat: 59.33, lon: 18.07, name: "Stockholm" }
        ],
        submarines: [
            { lat: 35.0, lon: -45.0, name: "North Atlantic" },
            { lat: 45.0, lon: -30.0, name: "Mid Atlantic" },
            { lat: 60.0, lon: -20.0, name: "North Atlantic (Iceland)" },
            { lat: 40.0, lon: 160.0, name: "North Pacific" },
            { lat: 25.0, lon: -155.0, name: "Central Pacific" },
            { lat: 50.0, lon: -140.0, name: "Northeast Pacific" },
            { lat: 10.0, lon: 65.0, name: "Indian Ocean" },
            { lat: -30.0, lon: 40.0, name: "South Indian Ocean" },
            { lat: 70.0, lon: 40.0, name: "Barents Sea" },
            { lat: 55.0, lon: 170.0, name: "Bering Sea" },
            { lat: 15.0, lon: -60.0, name: "Caribbean" },
            { lat: -45.0, lon: -60.0, name: "South Atlantic" }
        ]
    };
    
    const outputPath = path.join(OUTPUT_DIR, 'targets.json');
    await fs.writeFile(outputPath, JSON.stringify(targets, null, 2));
    console.log(`  ✓ Wrote ${outputPath}`);
}

async function generateScreenConfigs() {
    console.log('Generating screen-configs.json...');
    
    const configs = {
        screenTypes: {
            GLOBAL_MAP: "global",
            NORTH_AMERICA: "regional",
            EUROPE: "regional",
            ASIA: "regional",
            PACIFIC: "regional",
            STATUS_PANEL: "status",
            RADAR: "radar",
            TARGET_LIST: "targets"
        },
        layouts: {
            mobile: [
                { type: "GLOBAL_MAP", label: "GLOBAL MAP" }
            ],
            tablet: [
                { type: "GLOBAL_MAP", label: "GLOBAL MAP" },
                { type: "NORTH_AMERICA", label: "NORTH AMERICA", centerLat: 40, centerLon: -100, zoom: 2.5 },
                { type: "EUROPE", label: "EUROPE/RUSSIA", centerLat: 55, centerLon: 37, zoom: 3.0 },
                { type: "STATUS_PANEL", label: "SYSTEM STATUS" }
            ],
            desktop: [
                { type: "GLOBAL_MAP", label: "GLOBAL MAP" },
                { type: "NORTH_AMERICA", label: "NORTH AMERICA", centerLat: 40, centerLon: -100, zoom: 2.5 },
                { type: "EUROPE", label: "EUROPE/RUSSIA", centerLat: 55, centerLon: 37, zoom: 3.0 },
                { type: "ASIA", label: "ASIA-PACIFIC", centerLat: 35, centerLon: 140, zoom: 3.0 },
                { type: "PACIFIC", label: "PACIFIC OCEAN", centerLat: 0, centerLon: -160, zoom: 2.0 },
                { type: "STATUS_PANEL", label: "SYSTEM STATUS" },
                { type: "RADAR", label: "THREAT DETECTION" },
                { type: "TARGET_LIST", label: "TARGET STATUS" },
                { type: "GLOBAL_MAP", label: "MISSILE WARNING" }
            ],
            large: [
                { type: "GLOBAL_MAP", label: "GLOBAL MAP" },
                { type: "NORTH_AMERICA", label: "NORTH AMERICA", centerLat: 40, centerLon: -100, zoom: 2.5 },
                { type: "EUROPE", label: "EUROPE/RUSSIA", centerLat: 55, centerLon: 37, zoom: 3.0 },
                { type: "ASIA", label: "ASIA-PACIFIC", centerLat: 35, centerLon: 140, zoom: 3.0 },
                { type: "PACIFIC", label: "PACIFIC OCEAN", centerLat: 0, centerLon: -160, zoom: 2.0 },
                { type: "STATUS_PANEL", label: "SYSTEM STATUS" },
                { type: "RADAR", label: "THREAT DETECTION" },
                { type: "TARGET_LIST", label: "TARGET STATUS" },
                { type: "NORTH_AMERICA", label: "SUB-LAUNCH DETECTION", centerLat: 40, centerLon: -75, zoom: 4.0 },
                { type: "GLOBAL_MAP", label: "MISSILE WARNING" },
                { type: "STATUS_PANEL", label: "LAUNCH SEQUENCE" },
                { type: "RADAR", label: "EARLY WARNING" }
            ],
            ultrawide: [
                { type: "GLOBAL_MAP", label: "GLOBAL MAP" },
                { type: "NORTH_AMERICA", label: "NORTH AMERICA", centerLat: 40, centerLon: -100, zoom: 2.5 },
                { type: "EUROPE", label: "EUROPE/RUSSIA", centerLat: 55, centerLon: 37, zoom: 3.0 },
                { type: "ASIA", label: "ASIA-PACIFIC", centerLat: 35, centerLon: 140, zoom: 3.0 },
                { type: "PACIFIC", label: "PACIFIC OCEAN", centerLat: 0, centerLon: -160, zoom: 2.0 },
                { type: "STATUS_PANEL", label: "SYSTEM STATUS" },
                { type: "RADAR", label: "THREAT DETECTION" },
                { type: "TARGET_LIST", label: "TARGET STATUS" },
                { type: "NORTH_AMERICA", label: "SUB-LAUNCH DETECTION", centerLat: 40, centerLon: -75, zoom: 4.0 },
                { type: "GLOBAL_MAP", label: "MISSILE WARNING" },
                { type: "STATUS_PANEL", label: "LAUNCH SEQUENCE" },
                { type: "RADAR", label: "EARLY WARNING" },
                { type: "EUROPE", label: "EUROPEAN THEATER", centerLat: 50, centerLon: 10, zoom: 4.0 },
                { type: "ASIA", label: "EAST ASIA", centerLat: 40, centerLon: 120, zoom: 4.0 },
                { type: "TARGET_LIST", label: "DEFCON STATUS" },
                { type: "STATUS_PANEL", label: "WOPR ANALYSIS" }
            ]
        }
    };
    
    const outputPath = path.join(OUTPUT_DIR, 'screen-configs.json');
    await fs.writeFile(outputPath, JSON.stringify(configs, null, 2));
    console.log(`  ✓ Wrote ${outputPath}`);
}

async function main() {
    try {
        // Ensure output directory exists
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        
        // Convert shapefiles
        await convertShapefile('ne_110m_coastline');
        await convertShapefile('ne_110m_admin_0_countries');
        
        // Generate target data
        await generateTargetsData();
        
        // Generate screen configurations
        await generateScreenConfigs();
        
        console.log('\n✅ All data files generated successfully!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
