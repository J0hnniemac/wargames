#version 330 core
out vec4 FragColor;

in vec2 TexCoord;
uniform sampler2D screenTexture;
uniform float distortion;
uniform vec2 resolution;

void main() {
    vec2 uv = TexCoord;
    vec2 center = vec2(0.5, 0.5);
    vec2 cc = uv - center;
    
    float dist = length(cc);
    float factor = 1.0 + dist * dist * distortion;
    vec2 distorted = center + cc * factor;
    
    if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
        FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        FragColor = texture(screenTexture, distorted);
    }
}
