#pragma once

#include "Common.hpp"
#include <SDL2/SDL.h>
#include <glad/gl.h>
#include <string>

class Renderer {
public:
    Renderer(int width, int height);
    ~Renderer();
    
    bool initialize();
    void shutdown();
    
    // Basic drawing
    void clear(const Color& color = Colors::BLACK);
    void present();
    
    // Line drawing with glow
    void drawLine(float x1, float y1, float x2, float y2, const Color& color, float width = 1.0f);
    void drawLineWithGlow(float x1, float y1, float x2, float y2, const Color& color, int layers = 5);
    
    // Circle drawing
    void drawCircle(float x, float y, float radius, const Color& color, float width = 1.0f);
    void drawCircleWithGlow(float x, float y, float radius, const Color& color, int layers = 5);
    
    // Path drawing
    void drawPath(const std::vector<Point>& points, const Color& color, float width = 1.0f);
    void drawPathWithGlow(const std::vector<Point>& points, const Color& color, int layers = 5);
    
    // Shader management
    GLuint loadShader(const std::string& vertexPath, const std::string& fragmentPath);
    void useShader(GLuint program);
    void renderFullscreenQuad();
    
    // Framebuffer management
    GLuint createFramebuffer(int width, int height, GLuint& textureOut);
    void bindFramebuffer(GLuint fbo);
    void unbindFramebuffer();
    
    // Accessors
    int getWidth() const { return m_width; }
    int getHeight() const { return m_height; }
    SDL_Window* getWindow() { return m_window; }
    
    // Blend mode control
    void setAdditiveBlending(bool enabled);
    
private:
    int m_width;
    int m_height;
    SDL_Window* m_window;
    SDL_GLContext m_glContext;
    
    GLuint m_vao;
    GLuint m_vbo;
    GLuint m_basicShader;
    GLuint m_quadVao;
    GLuint m_quadVbo;
    GLuint m_quadEbo;
    
    bool m_initialized;
    
    void setupGL();
    void setupScreenQuad();
    std::string loadShaderSource(const std::string& path);
};
