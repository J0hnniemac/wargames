// Gaussian blur shader for bloom - GLSL ES 100
precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uScreenTexture;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1, 0) for horizontal, (0, 1) for vertical

void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec4 result = vec4(0.0);
    
    // Gaussian blur weights
    float weights[5];
    weights[0] = 0.227027;
    weights[1] = 0.1945946;
    weights[2] = 0.1216216;
    weights[3] = 0.054054;
    weights[4] = 0.016216;
    
    result += texture2D(uScreenTexture, vTexCoord) * weights[0];
    
    for (int i = 1; i < 5; i++) {
        vec2 offset = uDirection * texelSize * float(i);
        result += texture2D(uScreenTexture, vTexCoord + offset) * weights[i];
        result += texture2D(uScreenTexture, vTexCoord - offset) * weights[i];
    }
    
    gl_FragColor = result;
}
