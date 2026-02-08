#version 330 core
out vec4 FragColor;

in vec2 TexCoord;
uniform sampler2D screenTexture;
uniform float intensity;
uniform vec2 resolution;

void main() {
    vec2 uv = TexCoord;
    vec2 center = vec2(0.5, 0.5);
    vec2 offset = (uv - center) * intensity * 0.01;
    
    // Sample each color channel with slight offset
    float r = texture(screenTexture, uv + offset).r;
    float g = texture(screenTexture, uv).g;
    float b = texture(screenTexture, uv - offset).b;
    
    FragColor = vec4(r, g, b, 1.0);
}
