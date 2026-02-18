// Basic fragment shader - GLSL ES 100
precision mediump float;

varying vec2 vTexCoord;

uniform vec4 uColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;

void main() {
    if (uUseTexture) {
        gl_FragColor = texture2D(uTexture, vTexCoord) * uColor;
    } else {
        gl_FragColor = uColor;
    }
}
