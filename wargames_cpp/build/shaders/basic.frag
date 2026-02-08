#version 330 core
out vec4 FragColor;

in vec2 TexCoord;
uniform vec4 color;
uniform sampler2D tex;
uniform bool useTexture;

void main() {
    if (useTexture) {
        FragColor = texture(tex, TexCoord) * color;
    } else {
        FragColor = color;
    }
}
