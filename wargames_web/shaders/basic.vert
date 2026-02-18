// Basic vertex shader - GLSL ES 100
attribute vec2 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

uniform mat4 uProjection;

void main() {
    gl_Position = uProjection * vec4(aPos, 0.0, 1.0);
    vTexCoord = aTexCoord;
}
