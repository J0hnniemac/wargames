// Barrel distortion shader - GLSL ES 100
precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uScreenTexture;
uniform float uDistortion;
uniform vec2 uResolution;

void main() {
    vec2 uv = vTexCoord;
    vec2 center = vec2(0.5, 0.5);
    vec2 cc = uv - center;
    
    float dist = length(cc);
    float factor = 1.0 + dist * dist * uDistortion;
    vec2 distorted = center + cc * factor;
    
    if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(uScreenTexture, distorted);
    }
}
