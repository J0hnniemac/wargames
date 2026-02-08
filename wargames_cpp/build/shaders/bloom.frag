#version 330 core
out vec4 FragColor;

in vec2 TexCoord;
uniform sampler2D screenTexture;
uniform vec2 resolution;
uniform vec2 direction; // (1, 0) for horizontal, (0, 1) for vertical

void main() {
    vec2 texelSize = 1.0 / resolution;
    vec4 result = vec4(0.0);
    
    // Gaussian blur
    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    
    result += texture(screenTexture, TexCoord) * weights[0];
    
    for (int i = 1; i < 5; i++) {
        vec2 offset = direction * texelSize * float(i);
        result += texture(screenTexture, TexCoord + offset) * weights[i];
        result += texture(screenTexture, TexCoord - offset) * weights[i];
    }
    
    FragColor = result;
}
