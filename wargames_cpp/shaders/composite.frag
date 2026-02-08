#version 330 core
out vec4 FragColor;

in vec2 TexCoord;
uniform sampler2D screenTexture;
uniform sampler2D bloomTexture;
uniform sampler2D scanlineTexture;
uniform sampler2D vignetteTexture;
uniform float noiseIntensity;
uniform float bloomIntensity;
uniform float flickerIntensity;
uniform float time;
uniform vec2 resolution;

// Pseudo-random noise function
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 color = texture(screenTexture, TexCoord);
    vec4 bloom = texture(bloomTexture, TexCoord) * bloomIntensity;
    color += bloom;
    
    // Add scanlines
    vec4 scanline = texture(scanlineTexture, TexCoord);
    color *= mix(vec4(1.0), scanline, 0.5);
    
    // Add vignette
    vec4 vignette = texture(vignetteTexture, TexCoord);
    color *= vignette;
    
    // Add noise
    float noise = rand(TexCoord + time) * noiseIntensity;
    color.rgb += noise;

    float flicker = 1.0 + sin(time * 120.0) * flickerIntensity + sin(time * 67.0) * flickerIntensity * 0.5;
    color.rgb *= flicker;
    
    FragColor = color;
}
