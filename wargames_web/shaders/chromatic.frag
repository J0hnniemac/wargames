// Chromatic aberration shader - GLSL ES 100
precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uScreenTexture;
uniform float uIntensity;
uniform vec2 uResolution;

void main() {
    vec2 uv = vTexCoord;
    vec2 center = vec2(0.5, 0.5);
    vec2 offset = (uv - center) * uIntensity * 0.01;
    
    // Sample each color channel with slight offset
    float r = texture2D(uScreenTexture, uv + offset).r;
    float g = texture2D(uScreenTexture, uv).g;
    float b = texture2D(uScreenTexture, uv - offset).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
}
