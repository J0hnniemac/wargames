// Final composite shader - GLSL ES 100
precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uScreenTexture;
uniform sampler2D uBloomTexture;
uniform sampler2D uScanlineTexture;
uniform sampler2D uVignetteTexture;
uniform float uNoiseIntensity;
uniform float uBloomIntensity;
uniform float uFlickerIntensity;
uniform float uTime;
uniform vec2 uResolution;

// Pseudo-random noise function
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 color = texture2D(uScreenTexture, vTexCoord);
    vec4 bloom = texture2D(uBloomTexture, vTexCoord) * uBloomIntensity;
    color += bloom;
    
    // Add scanlines
    vec4 scanline = texture2D(uScanlineTexture, vTexCoord);
    color *= mix(vec4(1.0), scanline, 0.5);
    
    // Add vignette
    vec4 vignette = texture2D(uVignetteTexture, vTexCoord);
    color *= vignette;
    
    // Add noise
    float noise = rand(vTexCoord + uTime) * uNoiseIntensity;
    color.rgb += noise;
    
    // Flicker effect
    float flicker = 1.0 + sin(uTime * 120.0) * uFlickerIntensity + sin(uTime * 67.0) * uFlickerIntensity * 0.5;
    color.rgb *= flicker;
    
    gl_FragColor = color;
}
