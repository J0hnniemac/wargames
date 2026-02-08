#include "Renderer.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <vector>

Renderer::Renderer(int width, int height)
    : m_width(width)
    , m_height(height)
    , m_window(nullptr)
    , m_glContext(nullptr)
    , m_vao(0)
    , m_vbo(0)
    , m_basicShader(0)
    , m_quadVao(0)
    , m_quadVbo(0)
    , m_quadEbo(0)
    , m_initialized(false)
{
}

Renderer::~Renderer() {
    shutdown();
}

bool Renderer::initialize() {
    // Set OpenGL attributes
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
    
    // Create window
    m_window = SDL_CreateWindow(
        "WarGames Map",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        m_width,
        m_height,
        SDL_WINDOW_OPENGL | SDL_WINDOW_SHOWN
    );
    
    if (!m_window) {
        std::cerr << "Failed to create window: " << SDL_GetError() << "\n";
        return false;
    }
    
    // Create OpenGL context
    m_glContext = SDL_GL_CreateContext(m_window);
    if (!m_glContext) {
        std::cerr << "Failed to create OpenGL context: " << SDL_GetError() << "\n";
        return false;
    }
    
    // Enable vsync
    SDL_GL_SetSwapInterval(1);
    
    // Initialize GLAD
    if (!gladLoadGL((GLADloadfunc)SDL_GL_GetProcAddress)) {
        std::cerr << "Failed to initialize GLAD\n";
        return false;
    }
    
    std::cout << "OpenGL Version: " << glGetString(GL_VERSION) << "\n";
    std::cout << "GLSL Version: " << glGetString(GL_SHADING_LANGUAGE_VERSION) << "\n";
    
    setupGL();
    
    m_initialized = true;
    return true;
}

void Renderer::setupGL() {
    // Set viewport
    glViewport(0, 0, m_width, m_height);
    
    // Enable blending
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    
    // Create VAO and VBO for line rendering
    glGenVertexArrays(1, &m_vao);
    glGenBuffers(1, &m_vbo);
    
    glBindVertexArray(m_vao);
    glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
    
    // Position attribute
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);
    
    glBindVertexArray(0);

    setupScreenQuad();
    
    // Load basic shader (we'll create a simple one inline for now)
    const char* vertexShaderSource = R"(
        #version 330 core
        layout (location = 0) in vec2 aPos;
        uniform mat4 projection;
        void main() {
            gl_Position = projection * vec4(aPos, 0.0, 1.0);
        }
    )";
    
    const char* fragmentShaderSource = R"(
        #version 330 core
        out vec4 FragColor;
        uniform vec4 color;
        void main() {
            FragColor = color;
        }
    )";
    
    // Compile vertex shader
    GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
    glCompileShader(vertexShader);
    
    // Check for errors
    int success;
    char infoLog[512];
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        std::cerr << "Vertex shader compilation failed:\n" << infoLog << "\n";
    }
    
    // Compile fragment shader
    GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
    glCompileShader(fragmentShader);
    
    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        std::cerr << "Fragment shader compilation failed:\n" << infoLog << "\n";
    }
    
    // Link shader program
    m_basicShader = glCreateProgram();
    glAttachShader(m_basicShader, vertexShader);
    glAttachShader(m_basicShader, fragmentShader);
    glLinkProgram(m_basicShader);
    
    glGetProgramiv(m_basicShader, GL_LINK_STATUS, &success);
    if (!success) {
        glGetProgramInfoLog(m_basicShader, 512, NULL, infoLog);
        std::cerr << "Shader linking failed:\n" << infoLog << "\n";
    }
    
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);
    
    // Set up orthographic projection
    glUseProgram(m_basicShader);
    
    // Create orthographic projection matrix
    float left = 0.0f;
    float right = static_cast<float>(m_width);
    float bottom = static_cast<float>(m_height);
    float top = 0.0f;
    float near = -1.0f;
    float far = 1.0f;
    
    float ortho[16] = {
        2.0f / (right - left), 0.0f, 0.0f, 0.0f,
        0.0f, 2.0f / (top - bottom), 0.0f, 0.0f,
        0.0f, 0.0f, -2.0f / (far - near), 0.0f,
        -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1.0f
    };
    
    GLint projLoc = glGetUniformLocation(m_basicShader, "projection");
    glUniformMatrix4fv(projLoc, 1, GL_FALSE, ortho);
}

void Renderer::shutdown() {
    if (m_basicShader) {
        glDeleteProgram(m_basicShader);
    }
    if (m_vbo) {
        glDeleteBuffers(1, &m_vbo);
    }
    if (m_vao) {
        glDeleteVertexArrays(1, &m_vao);
    }
    if (m_quadEbo) {
        glDeleteBuffers(1, &m_quadEbo);
    }
    if (m_quadVbo) {
        glDeleteBuffers(1, &m_quadVbo);
    }
    if (m_quadVao) {
        glDeleteVertexArrays(1, &m_quadVao);
    }
    if (m_glContext) {
        SDL_GL_DeleteContext(m_glContext);
    }
    if (m_window) {
        SDL_DestroyWindow(m_window);
    }
    m_initialized = false;
}

void Renderer::clear(const Color& color) {
    glClearColor(color.r, color.g, color.b, color.a);
    glClear(GL_COLOR_BUFFER_BIT);
}

void Renderer::present() {
    SDL_GL_SwapWindow(m_window);
}

void Renderer::setAdditiveBlending(bool enabled) {
    if (enabled) {
        glBlendFunc(GL_ONE, GL_ONE);
    } else {
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }
}

void Renderer::drawLine(float x1, float y1, float x2, float y2, const Color& color, float width) {
    glUseProgram(m_basicShader);
    glLineWidth(width);
    
    float vertices[] = { x1, y1, x2, y2 };
    
    glBindVertexArray(m_vao);
    glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_DYNAMIC_DRAW);
    
    GLint colorLoc = glGetUniformLocation(m_basicShader, "color");
    glUniform4f(colorLoc, color.r, color.g, color.b, color.a);
    
    glDrawArrays(GL_LINES, 0, 2);
}

void Renderer::drawLineWithGlow(float x1, float y1, float x2, float y2, const Color& color, int layers) {
    // Draw multiple layers with decreasing alpha and increasing width
    for (int i = layers - 1; i >= 0; i--) {
        float layerAlpha = (i == 0) ? 1.0f : 0.3f / layers;
        float layerWidth = 1.0f + (layers - i) * 0.8f;
        
        Color layerColor(color.r, color.g, color.b, color.a * layerAlpha);
        drawLine(x1, y1, x2, y2, layerColor, layerWidth);
    }
}

void Renderer::drawCircle(float x, float y, float radius, const Color& color, float width) {
    glUseProgram(m_basicShader);
    glLineWidth(width);
    
    const int segments = 32;
    std::vector<float> vertices;
    vertices.reserve(segments * 2 + 2);
    
    for (int i = 0; i <= segments; i++) {
        float angle = (i / static_cast<float>(segments)) * 2.0f * M_PI;
        vertices.push_back(x + std::cos(angle) * radius);
        vertices.push_back(y + std::sin(angle) * radius);
    }
    
    glBindVertexArray(m_vao);
    glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), vertices.data(), GL_DYNAMIC_DRAW);
    
    GLint colorLoc = glGetUniformLocation(m_basicShader, "color");
    glUniform4f(colorLoc, color.r, color.g, color.b, color.a);
    
    glDrawArrays(GL_LINE_STRIP, 0, segments + 1);
}

void Renderer::drawCircleWithGlow(float x, float y, float radius, const Color& color, int layers) {
    for (int i = layers - 1; i >= 0; i--) {
        float layerAlpha = (i == 0) ? 1.0f : 0.3f / layers;
        float layerWidth = 1.0f + (layers - i) * 0.8f;
        
        Color layerColor(color.r, color.g, color.b, color.a * layerAlpha);
        drawCircle(x, y, radius, layerColor, layerWidth);
    }
}

void Renderer::drawPath(const std::vector<Point>& points, const Color& color, float width) {
    if (points.size() < 2) return;
    
    glUseProgram(m_basicShader);
    glLineWidth(width);
    
    std::vector<float> vertices;
    vertices.reserve(points.size() * 2);
    
    for (const auto& p : points) {
        vertices.push_back(p.x);
        vertices.push_back(p.y);
    }
    
    glBindVertexArray(m_vao);
    glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), vertices.data(), GL_DYNAMIC_DRAW);
    
    GLint colorLoc = glGetUniformLocation(m_basicShader, "color");
    glUniform4f(colorLoc, color.r, color.g, color.b, color.a);
    
    glDrawArrays(GL_LINE_STRIP, 0, points.size());
}

void Renderer::drawPathWithGlow(const std::vector<Point>& points, const Color& color, int layers) {
    for (int i = layers - 1; i >= 0; i--) {
        float layerAlpha = (i == 0) ? 1.0f : 0.3f / layers;
        float layerWidth = 1.0f + (layers - i) * 0.8f;
        
        Color layerColor(color.r, color.g, color.b, color.a * layerAlpha);
        drawPath(points, layerColor, layerWidth);
    }
}

GLuint Renderer::loadShader(const std::string& vertexPath, const std::string& fragmentPath) {
    std::string vertSource = loadShaderSource(vertexPath);
    std::string fragSource = loadShaderSource(fragmentPath);

    if (vertSource.empty() || fragSource.empty()) {
        return 0;
    }

    const char* vertCode = vertSource.c_str();
    const char* fragCode = fragSource.c_str();

    GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertexShader, 1, &vertCode, NULL);
    glCompileShader(vertexShader);

    int success;
    char infoLog[512];
    glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(vertexShader, 512, NULL, infoLog);
        std::cerr << "Vertex shader compilation failed:\n" << infoLog << "\n";
        glDeleteShader(vertexShader);
        return 0;
    }

    GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragmentShader, 1, &fragCode, NULL);
    glCompileShader(fragmentShader);

    glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
    if (!success) {
        glGetShaderInfoLog(fragmentShader, 512, NULL, infoLog);
        std::cerr << "Fragment shader compilation failed:\n" << infoLog << "\n";
        glDeleteShader(vertexShader);
        glDeleteShader(fragmentShader);
        return 0;
    }

    GLuint program = glCreateProgram();
    glAttachShader(program, vertexShader);
    glAttachShader(program, fragmentShader);
    glLinkProgram(program);

    glGetProgramiv(program, GL_LINK_STATUS, &success);
    if (!success) {
        glGetProgramInfoLog(program, 512, NULL, infoLog);
        std::cerr << "Shader linking failed:\n" << infoLog << "\n";
        glDeleteShader(vertexShader);
        glDeleteShader(fragmentShader);
        glDeleteProgram(program);
        return 0;
    }

    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    return program;
}

void Renderer::useShader(GLuint program) {
    glUseProgram(program);
}

void Renderer::renderFullscreenQuad() {
    glBindVertexArray(m_quadVao);
    glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
    glBindVertexArray(0);
}

GLuint Renderer::createFramebuffer(int width, int height, GLuint& textureOut) {
    GLuint fbo, texture;
    
    glGenFramebuffers(1, &fbo);
    glBindFramebuffer(GL_FRAMEBUFFER, fbo);
    
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
    
    if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
        std::cerr << "Framebuffer is not complete!\n";
    }
    
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    
    textureOut = texture;
    return fbo;
}

void Renderer::bindFramebuffer(GLuint fbo) {
    glBindFramebuffer(GL_FRAMEBUFFER, fbo);
}

void Renderer::unbindFramebuffer() {
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
}

void Renderer::setupScreenQuad() {
    float vertices[] = {
        // positions    // texcoords
        -1.0f, -1.0f,   0.0f, 0.0f,
         1.0f, -1.0f,   1.0f, 0.0f,
         1.0f,  1.0f,   1.0f, 1.0f,
        -1.0f,  1.0f,   0.0f, 1.0f
    };

    unsigned int indices[] = { 0, 1, 2, 2, 3, 0 };

    glGenVertexArrays(1, &m_quadVao);
    glGenBuffers(1, &m_quadVbo);
    glGenBuffers(1, &m_quadEbo);

    glBindVertexArray(m_quadVao);
    glBindBuffer(GL_ARRAY_BUFFER, m_quadVbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_quadEbo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)(2 * sizeof(float)));
    glEnableVertexAttribArray(1);

    glBindVertexArray(0);
}

std::string Renderer::loadShaderSource(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        std::cerr << "Failed to open shader file: " << path << "\n";
        return "";
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}
