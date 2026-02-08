#include "Common.hpp"
#include "Renderer.hpp"
#include "VectorMap.hpp"
#include "Missile.hpp"
#include "Explosion.hpp"
#include "Aircraft.hpp"

#include <SDL2/SDL.h>
#include <iostream>
#include <random>
#include <chrono>
#include <filesystem>
#include <vector>
#include <cmath>
#include <glad/gl.h>

// CRT mode
enum class CRTMode {
    OFF,
    LIGHT,
    FULL
};

// Global random number generator
std::random_device rd;
std::mt19937 gen(rd());

// Random utility functions
int randomInt(int min, int max) {
    std::uniform_int_distribution<> dis(min, max);
    return dis(gen);
}

float randomFloat(float min, float max) {
    std::uniform_real_distribution<float> dis(min, max);
    return dis(gen);
}

std::string findDataFile(const std::string& filename) {
    namespace fs = std::filesystem;
    const std::array<std::string, 4> bases = {{
        "data",
        "wargames_cpp/data",
        "../data",
        "../../data"
    }};

    for (const auto& base : bases) {
        fs::path path = fs::path(base) / filename;
        if (fs::exists(path)) {
            return path.string();
        }
    }

    return filename;
}

LatLon randomTarget() {
    int idx = randomInt(0, TARGET_LOCATIONS.size() - 1);
    return TARGET_LOCATIONS[idx];
}

LatLon randomSubmarineStart() {
    int idx = randomInt(0, SUBMARINE_POINTS.size() - 1);
    return SUBMARINE_POINTS[idx];
}

LatLon randomWesternTarget() {
    int idx = randomInt(0, WESTERN_TARGETS.size() - 1);
    return WESTERN_TARGETS[idx];
}

LatLon randomEasternTarget() {
    int idx = randomInt(0, EASTERN_TARGETS.size() - 1);
    return EASTERN_TARGETS[idx];
}

GLuint createTexture2D(int width, int height, const std::vector<unsigned char>& data) {
    GLuint tex = 0;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE,
        data.empty() ? nullptr : data.data());
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glBindTexture(GL_TEXTURE_2D, 0);
    return tex;
}

GLuint createScanlineTexture(int width, int height) {
    std::vector<unsigned char> data(width * height * 4, 255);
    for (int y = 0; y < height; y++) {
        float v = (y % 3 == 0) ? 200.0f : 255.0f;
        for (int x = 0; x < width; x++) {
            size_t idx = (y * width + x) * 4;
            data[idx + 0] = static_cast<unsigned char>(v);
            data[idx + 1] = static_cast<unsigned char>(v);
            data[idx + 2] = static_cast<unsigned char>(v);
            data[idx + 3] = 255;
        }
    }
    return createTexture2D(width, height, data);
}

GLuint createVignetteTexture(int width, int height) {
    std::vector<unsigned char> data(width * height * 4, 255);
    float cx = width * 0.5f;
    float cy = height * 0.5f;
    float maxd = std::sqrt(cx * cx + cy * cy);
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            float dx = x - cx;
            float dy = y - cy;
            float d = std::sqrt(dx * dx + dy * dy) / maxd;
            float v = 1.0f - std::pow(d, 1.8f) * 0.6f;
            if (v < 0.0f) v = 0.0f;
            if (v > 1.0f) v = 1.0f;
            unsigned char c = static_cast<unsigned char>(v * 255.0f);
            size_t idx = (y * width + x) * 4;
            data[idx + 0] = c;
            data[idx + 1] = c;
            data[idx + 2] = c;
            data[idx + 3] = 255;
        }
    }
    return createTexture2D(width, height, data);
}

bool isRussiaOrJapanTarget(const LatLon& target) {
    // Moscow check
    const double MOSCOW_LAT = 55.7558;
    const double MOSCOW_LON = 37.6173;
    // Tokyo check
    const double TOKYO_LAT = 35.6762;
    const double TOKYO_LON = 139.6503;
    const double EPSILON = 0.01;
    
    bool isMoscow = std::abs(target.lat - MOSCOW_LAT) < EPSILON && 
                    std::abs(target.lon - MOSCOW_LON) < EPSILON;
    bool isTokyo = std::abs(target.lat - TOKYO_LAT) < EPSILON && 
                   std::abs(target.lon - TOKYO_LON) < EPSILON;
    
    return isMoscow || isTokyo;
}

Color getColorForTarget(const LatLon& target) {
    // Red for Russian and Japanese targets only
    if (isRussiaOrJapanTarget(target)) {
        return Colors::RED;
    }
    // Cyan for all other targets
    return Colors::CYAN;
}

int main(int argc, char* argv[]) {
    std::cout << "WarGames Map Visualization (C++ Version)\n";
    std::cout << "=========================================\n\n";
    std::cout << "Controls:\n";
    std::cout << "  UP/DOWN  : Adjust launch intensity\n";
    std::cout << "  SPACE    : Burst mode (5 missiles + 3 submarines)\n";
    std::cout << "  R        : Reset intensity\n";
    std::cout << "  C        : Cycle CRT mode (OFF -> LIGHT -> FULL)\n";
    std::cout << "  F        : Toggle fullscreen\n";
    std::cout << "  ESC/Q    : Quit\n\n";
    
    // Initialize SDL
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        std::cerr << "Failed to initialize SDL: " << SDL_GetError() << "\n";
        return 1;
    }
    
    // Create renderer
    Renderer renderer(SCREEN_WIDTH, SCREEN_HEIGHT);
    if (!renderer.initialize()) {
        std::cerr << "Failed to initialize renderer\n";
        SDL_Quit();
        return 1;
    }
    
    // Load vector map
    VectorMap vectorMap(&renderer);
    std::string coastlinePath = findDataFile("ne_110m_coastline.shp");
    std::string countriesPath = findDataFile("ne_110m_admin_0_countries.shp");
    if (!vectorMap.loadShapefiles(coastlinePath, countriesPath)) {
        std::cerr << "Warning: Failed to load shapefiles. Make sure data files are in data/ directory\n";
    }
    
    // Post-processing resources
    GLuint sceneTex = 0;
    GLuint sceneFbo = renderer.createFramebuffer(SCREEN_WIDTH, SCREEN_HEIGHT, sceneTex);
    GLuint postTexA = 0;
    GLuint postFboA = renderer.createFramebuffer(SCREEN_WIDTH, SCREEN_HEIGHT, postTexA);
    GLuint postTexB = 0;
    GLuint postFboB = renderer.createFramebuffer(SCREEN_WIDTH, SCREEN_HEIGHT, postTexB);

    GLuint pingpongTex[2] = {0, 0};
    GLuint pingpongFbo[2] = {0, 0};
    pingpongFbo[0] = renderer.createFramebuffer(SCREEN_WIDTH, SCREEN_HEIGHT, pingpongTex[0]);
    pingpongFbo[1] = renderer.createFramebuffer(SCREEN_WIDTH, SCREEN_HEIGHT, pingpongTex[1]);

    GLuint scanlineTex = createScanlineTexture(SCREEN_WIDTH, SCREEN_HEIGHT);
    GLuint vignetteTex = createVignetteTexture(SCREEN_WIDTH, SCREEN_HEIGHT);

    GLuint screenShader = renderer.loadShader("wargames_cpp/shaders/basic.vert", "wargames_cpp/shaders/basic.frag");
    GLuint barrelShader = renderer.loadShader("wargames_cpp/shaders/basic.vert", "wargames_cpp/shaders/barrel.frag");
    GLuint chromaticShader = renderer.loadShader("wargames_cpp/shaders/basic.vert", "wargames_cpp/shaders/chromatic.frag");
    GLuint bloomShader = renderer.loadShader("wargames_cpp/shaders/basic.vert", "wargames_cpp/shaders/bloom.frag");
    GLuint compositeShader = renderer.loadShader("wargames_cpp/shaders/basic.vert", "wargames_cpp/shaders/composite.frag");

    const float identity[16] = {
        1.0f, 0.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f, 0.0f,
        0.0f, 0.0f, 1.0f, 0.0f,
        0.0f, 0.0f, 0.0f, 1.0f
    };

    for (GLuint program : {screenShader, barrelShader, chromaticShader, bloomShader, compositeShader}) {
        if (program == 0) continue;
        glUseProgram(program);
        GLint projLoc = glGetUniformLocation(program, "projection");
        if (projLoc >= 0) {
            glUniformMatrix4fv(projLoc, 1, GL_FALSE, identity);
        }
    }

    // Entity containers
    std::vector<Aircraft> aircraft;
    std::vector<std::unique_ptr<Missile>> missiles;
    std::vector<std::unique_ptr<Explosion>> explosions;

    const int aircraftCount = 12;
    aircraft.reserve(aircraftCount);
    for (int i = 0; i < aircraftCount; i++) {
        float lat = randomFloat(-60.0f, 60.0f);
        float lon = randomFloat(-180.0f, 180.0f);
        float radius = randomFloat(3.0f, 12.0f);
        float loopSeconds = randomFloat(20.0f, 60.0f);
        aircraft.emplace_back(LatLon{lat, lon}, radius, loopSeconds, Colors::DIM_CYAN);
    }
    
    // Game state
    bool running = true;
    bool fullscreen = false;
    CRTMode crtMode = CRTMode::OFF;
    float launchInterval = 2.0f;  // seconds between launches
    float timeSinceLastLaunch = launchInterval;
    
    // Timing
    auto lastTime = std::chrono::high_resolution_clock::now();
    const float targetFrameTime = 1.0f / 60.0f;
    
    // Main loop
    while (running) {
        auto currentTime = std::chrono::high_resolution_clock::now();
        float deltaTime = std::chrono::duration<float>(currentTime - lastTime).count();
        lastTime = currentTime;
        
        // Cap delta time to prevent spiral of death
        if (deltaTime > 0.1f) deltaTime = 0.1f;
        
        // Handle events
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_QUIT) {
                running = false;
            } else if (event.type == SDL_KEYDOWN) {
                switch (event.key.keysym.sym) {
                    case SDLK_ESCAPE:
                    case SDLK_q:
                        running = false;
                        break;
                        
                    case SDLK_UP:
                        launchInterval = std::max(0.3f, launchInterval - 0.5f);
                        std::cout << "Launch interval: " << launchInterval << "s\n";
                        break;
                        
                    case SDLK_DOWN:
                        launchInterval = std::min(10.0f, launchInterval + 0.5f);
                        std::cout << "Launch interval: " << launchInterval << "s\n";
                        break;
                        
                    case SDLK_r:
                        launchInterval = 2.0f;
                        std::cout << "Reset to default intensity\n";
                        break;
                        
                    case SDLK_SPACE: {
                        // Burst mode: 5 regular missiles + 3 submarine missiles
                        std::cout << "BURST MODE!\n";
                        for (int i = 0; i < 5; i++) {
                            auto start = randomTarget();
                            auto end = randomTarget();
                            auto color = getColorForTarget(end);
                            missiles.push_back(std::make_unique<Missile>(start, end, color));
                        }
                        for (int i = 0; i < 3; i++) {
                            auto start = randomSubmarineStart();
                            auto end = (randomInt(0, 1) == 0) ? randomEasternTarget() : randomWesternTarget();
                            auto color = getColorForTarget(end);
                            missiles.push_back(std::make_unique<SubmarineMissile>(start, end, color));
                        }
                        break;
                    }
                        
                    case SDLK_c:
                        // Cycle CRT mode
                        switch (crtMode) {
                            case CRTMode::OFF:
                                crtMode = CRTMode::LIGHT;
                                std::cout << "CRT Mode: LIGHT\n";
                                break;
                            case CRTMode::LIGHT:
                                crtMode = CRTMode::FULL;
                                std::cout << "CRT Mode: FULL\n";
                                break;
                            case CRTMode::FULL:
                                crtMode = CRTMode::OFF;
                                std::cout << "CRT Mode: OFF\n";
                                break;
                        }
                        break;
                        
                    case SDLK_f:
                        fullscreen = !fullscreen;
                        SDL_SetWindowFullscreen(renderer.getWindow(), 
                            fullscreen ? SDL_WINDOW_FULLSCREEN_DESKTOP : 0);
                        std::cout << (fullscreen ? "Fullscreen ON\n" : "Fullscreen OFF\n");
                        break;
                }
            }
        }
        
        // Spawn missiles
        timeSinceLastLaunch += deltaTime;
        if (timeSinceLastLaunch >= launchInterval) {
            timeSinceLastLaunch = 0.0f;
            
            // Randomly choose between regular missile and submarine missile
            auto start = randomTarget();
            auto end = randomTarget();
            
            if (randomInt(0, 3) == 0) {
                // Submarine missile (25% chance)
                auto subStart = randomSubmarineStart();
                auto subEnd = (randomInt(0, 1) == 0) ? randomEasternTarget() : randomWesternTarget();
                auto color = getColorForTarget(subEnd);
                missiles.push_back(std::make_unique<SubmarineMissile>(subStart, subEnd, color));
            } else {
                // Regular missile
                auto color = getColorForTarget(end);
                missiles.push_back(std::make_unique<Missile>(start, end, color));
            }
        }
        
        // Update missiles
        for (auto& craft : aircraft) {
            craft.update(deltaTime);
        }

        for (auto& missile : missiles) {
            missile->update(deltaTime);
            
            // Spawn explosion if missile finished
            if (missile->isFinished()) {
                auto pos = missile->getPosition();
                explosions.push_back(std::make_unique<Explosion>(pos.x, pos.y, Colors::CYAN));
            }
        }
        
        // Remove finished missiles
        missiles.erase(
            std::remove_if(missiles.begin(), missiles.end(),
                [](const auto& m) { return m->isFinished(); }),
            missiles.end()
        );
        
        // Update explosions
        for (auto& explosion : explosions) {
            explosion->update(deltaTime);
        }
        
        // Remove finished explosions
        explosions.erase(
            std::remove_if(explosions.begin(), explosions.end(),
                [](const auto& e) { return e->isFinished(); }),
            explosions.end()
        );
        
        // Render scene to framebuffer
        renderer.bindFramebuffer(sceneFbo);
        renderer.clear();
        renderer.setAdditiveBlending(true);
        
        // Draw vector map
        vectorMap.draw();
        
        // Draw aircraft
        for (const auto& craft : aircraft) {
            craft.draw(&renderer);
        }

        // Draw missiles
        for (auto& missile : missiles) {
            missile->draw(&renderer);
        }
        
        // Draw explosions
        for (auto& explosion : explosions) {
            explosion->draw(&renderer);
        }
        
        renderer.setAdditiveBlending(false);
        renderer.unbindFramebuffer();

        glDisable(GL_BLEND);

        if (crtMode == CRTMode::OFF) {
            glUseProgram(screenShader);
            glUniform1i(glGetUniformLocation(screenShader, "useTexture"), 1);
            glUniform4f(glGetUniformLocation(screenShader, "color"), 1.0f, 1.0f, 1.0f, 1.0f);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, sceneTex);
            glUniform1i(glGetUniformLocation(screenShader, "tex"), 0);
            renderer.renderFullscreenQuad();
        } else if (crtMode == CRTMode::LIGHT) {
            glUseProgram(compositeShader);
            glUniform1f(glGetUniformLocation(compositeShader, "noiseIntensity"), 0.02f);
            glUniform1f(glGetUniformLocation(compositeShader, "bloomIntensity"), 0.0f);
            glUniform1f(glGetUniformLocation(compositeShader, "flickerIntensity"), 0.0f);
            glUniform1f(glGetUniformLocation(compositeShader, "time"), static_cast<float>(SDL_GetTicks()) / 1000.0f);
            glUniform2f(glGetUniformLocation(compositeShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);

            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, sceneTex);
            glUniform1i(glGetUniformLocation(compositeShader, "screenTexture"), 0);

            glActiveTexture(GL_TEXTURE1);
            glBindTexture(GL_TEXTURE_2D, scanlineTex);
            glUniform1i(glGetUniformLocation(compositeShader, "scanlineTexture"), 1);

            glActiveTexture(GL_TEXTURE2);
            glBindTexture(GL_TEXTURE_2D, vignetteTex);
            glUniform1i(glGetUniformLocation(compositeShader, "vignetteTexture"), 2);

            glActiveTexture(GL_TEXTURE3);
            glBindTexture(GL_TEXTURE_2D, sceneTex);
            glUniform1i(glGetUniformLocation(compositeShader, "bloomTexture"), 3);

            renderer.renderFullscreenQuad();
        } else {
            // Barrel distortion
            renderer.bindFramebuffer(postFboA);
            glUseProgram(barrelShader);
            glUniform1f(glGetUniformLocation(barrelShader, "distortion"), 0.08f);
            glUniform2f(glGetUniformLocation(barrelShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, sceneTex);
            glUniform1i(glGetUniformLocation(barrelShader, "screenTexture"), 0);
            renderer.renderFullscreenQuad();
            renderer.unbindFramebuffer();

            // Chromatic aberration
            renderer.bindFramebuffer(postFboB);
            glUseProgram(chromaticShader);
            glUniform1f(glGetUniformLocation(chromaticShader, "intensity"), 1.8f);
            glUniform2f(glGetUniformLocation(chromaticShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, postTexA);
            glUniform1i(glGetUniformLocation(chromaticShader, "screenTexture"), 0);
            renderer.renderFullscreenQuad();
            renderer.unbindFramebuffer();

            // Bloom blur (two-pass)
            renderer.bindFramebuffer(pingpongFbo[0]);
            glUseProgram(bloomShader);
            glUniform2f(glGetUniformLocation(bloomShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);
            glUniform2f(glGetUniformLocation(bloomShader, "direction"), 1.0f, 0.0f);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, postTexB);
            glUniform1i(glGetUniformLocation(bloomShader, "screenTexture"), 0);
            renderer.renderFullscreenQuad();
            renderer.unbindFramebuffer();

            renderer.bindFramebuffer(pingpongFbo[1]);
            glUseProgram(bloomShader);
            glUniform2f(glGetUniformLocation(bloomShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);
            glUniform2f(glGetUniformLocation(bloomShader, "direction"), 0.0f, 1.0f);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, pingpongTex[0]);
            glUniform1i(glGetUniformLocation(bloomShader, "screenTexture"), 0);
            renderer.renderFullscreenQuad();
            renderer.unbindFramebuffer();

            // Composite
            glUseProgram(compositeShader);
            glUniform1f(glGetUniformLocation(compositeShader, "noiseIntensity"), 0.03f);
            glUniform1f(glGetUniformLocation(compositeShader, "bloomIntensity"), 0.35f);
            glUniform1f(glGetUniformLocation(compositeShader, "flickerIntensity"), 0.02f);
            glUniform1f(glGetUniformLocation(compositeShader, "time"), static_cast<float>(SDL_GetTicks()) / 1000.0f);
            glUniform2f(glGetUniformLocation(compositeShader, "resolution"), SCREEN_WIDTH, SCREEN_HEIGHT);

            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, postTexB);
            glUniform1i(glGetUniformLocation(compositeShader, "screenTexture"), 0);

            glActiveTexture(GL_TEXTURE1);
            glBindTexture(GL_TEXTURE_2D, scanlineTex);
            glUniform1i(glGetUniformLocation(compositeShader, "scanlineTexture"), 1);

            glActiveTexture(GL_TEXTURE2);
            glBindTexture(GL_TEXTURE_2D, vignetteTex);
            glUniform1i(glGetUniformLocation(compositeShader, "vignetteTexture"), 2);

            glActiveTexture(GL_TEXTURE3);
            glBindTexture(GL_TEXTURE_2D, pingpongTex[1]);
            glUniform1i(glGetUniformLocation(compositeShader, "bloomTexture"), 3);

            renderer.renderFullscreenQuad();
        }

        glEnable(GL_BLEND);
        renderer.present();
        
        // Frame rate limiting
        auto frameTime = std::chrono::high_resolution_clock::now() - currentTime;
        float frameSeconds = std::chrono::duration<float>(frameTime).count();
        if (frameSeconds < targetFrameTime) {
            int delayMs = static_cast<int>((targetFrameTime - frameSeconds) * 1000.0f);
            SDL_Delay(delayMs);
        }
    }
    
    // Cleanup
    renderer.shutdown();
    SDL_Quit();
    
    std::cout << "\nShutdown complete.\n";
    return 0;
}
