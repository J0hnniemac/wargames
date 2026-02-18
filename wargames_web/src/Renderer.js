/**
 * Renderer - WebGL rendering engine for wargames visualization
 */

import { createOrthographicProjection } from './utils.js';

export class Renderer {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.assets = assets;
        this.gl = null;
        this.programs = {};
        this.framebuffers = {};
        this.textures = {};
        this.buffers = {};
        this.viewport = null; // For regional views: { centerLat, centerLon, zoom }
        
        this.initWebGL();
        this.compileShaders();
        this.createFramebuffers();
        this.createTextures();
        this.createBuffers();
    }

    initWebGL() {
        const gl = this.canvas.getContext('webgl', {
            alpha: false,
            preserveDrawingBuffer: false,
            antialias: false
        });

        if (!gl) {
            throw new Error('WebGL not supported');
        }

        this.gl = gl;
        
        // Set viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Enable blending for glow effects
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending
        
        // Disable depth test for 2D rendering
        gl.disable(gl.DEPTH_TEST);
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${info}`);
        }

        return shader;
    }

    createProgram(vertSource, fragSource) {
        const gl = this.gl;
        const vertShader = this.compileShader(vertSource, gl.VERTEX_SHADER);
        const fragShader = this.compileShader(fragSource, gl.FRAGMENT_SHADER);

        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            throw new Error(`Program linking error: ${info}`);
        }

        // Get attribute and uniform locations
        program.locations = {
            attributes: {},
            uniforms: {}
        };

        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(program, i);
            program.locations.attributes[info.name] = gl.getAttribLocation(program, info.name);
        }

        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            program.locations.uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }

        return program;
    }

    compileShaders() {
        const shaders = this.assets.shaders;
        
        // Basic rendering program
        this.programs.basic = this.createProgram(
            shaders['basic.vert'],
            shaders['basic.frag']
        );

        // Post-processing programs
        this.programs.barrel = this.createProgram(
            shaders['fullscreen.vert'],
            shaders['barrel.frag']
        );

        this.programs.chromatic = this.createProgram(
            shaders['fullscreen.vert'],
            shaders['chromatic.frag']
        );

        this.programs.bloom = this.createProgram(
            shaders['fullscreen.vert'],
            shaders['bloom.frag']
        );

        this.programs.composite = this.createProgram(
            shaders['fullscreen.vert'],
            shaders['composite.frag']
        );
    }

    createFramebuffers() {
        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Main scene framebuffer
        this.framebuffers.scene = this.createFramebuffer(width, height);
        
        // Post-processing framebuffers
        this.framebuffers.temp1 = this.createFramebuffer(width, height);
        this.framebuffers.temp2 = this.createFramebuffer(width, height);
        this.framebuffers.bloomH = this.createFramebuffer(width, height);
        this.framebuffers.bloomV = this.createFramebuffer(width, height);
    }

    createFramebuffer(width, height) {
        const gl = this.gl;
        
        const fbo = gl.createFramebuffer();
        const texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Framebuffer not complete');
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        return { fbo, texture, width, height };
    }

    createTextures() {
        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Scanline texture
        this.textures.scanline = this.createScanlineTexture(width, height);
        
        // Vignette texture
        this.textures.vignette = this.createVignetteTexture(width, height);
    }

    createScanlineTexture(width, height) {
        const gl = this.gl;
        const data = new Uint8Array(width * height * 4);
        
        for (let y = 0; y < height; y++) {
            const v = (y % 3 === 0) ? 200 : 255;
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                data[idx + 0] = v;
                data[idx + 1] = v;
                data[idx + 2] = v;
                data[idx + 3] = 255;
            }
        }
        
        return this.createTexture2D(width, height, data);
    }

    createVignetteTexture(width, height) {
        const gl = this.gl;
        const data = new Uint8Array(width * height * 4);
        const cx = width * 0.5;
        const cy = height * 0.5;
        const maxd = Math.sqrt(cx * cx + cy * cy);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const d = Math.sqrt(dx * dx + dy * dy) / maxd;
                let v = 1.0 - Math.pow(d, 1.8) * 0.6;
                v = Math.max(0, Math.min(1, v));
                const c = Math.floor(v * 255);
                
                const idx = (y * width + x) * 4;
                data[idx + 0] = c;
                data[idx + 1] = c;
                data[idx + 2] = c;
                data[idx + 3] = 255;
            }
        }
        
        return this.createTexture2D(width, height, data);
    }

    createTexture2D(width, height, data) {
        const gl = this.gl;
        const texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        return texture;
    }

    createBuffers() {
        const gl = this.gl;
        
        // Fullscreen quad for post-processing
        const quadVertices = new Float32Array([
            -1.0, -1.0,  0.0, 0.0,
             1.0, -1.0,  1.0, 0.0,
            -1.0,  1.0,  0.0, 1.0,
             1.0,  1.0,  1.0, 1.0
        ]);
        
        this.buffers.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    setViewport(viewport) {
        this.viewport = viewport;
    }

getProjectionMatrix() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // Always use full canvas dimensions - lonLatToXY already handles viewport/zoom
        return createOrthographicProjection(0, width, height, 0);
    }

    clear(r = 0, g = 0, b = 0, a = 1) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    beginScene() {
        const gl = this.gl;
        // Render directly to screen canvas (bypass FBO for debugging)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.clear(0, 0.02, 0, 1); // Slightly green-black so we can see it
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow
    }

    endScene() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    drawLine(x1, y1, x2, y2, color, width = 1.0) {
        const gl = this.gl;
        const program = this.programs.basic;
        
        gl.useProgram(program);
        
        const vertices = new Float32Array([x1, y1, x2, y2]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const aPos = program.locations.attributes.aPos;
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        
        const projection = this.getProjectionMatrix();
        gl.uniformMatrix4fv(program.locations.uniforms.uProjection, false, projection);
        gl.uniform4fv(program.locations.uniforms.uColor, color);
        gl.uniform1i(program.locations.uniforms.uUseTexture, 0);
        
        gl.lineWidth(width);
        gl.drawArrays(gl.LINES, 0, 2);
        
        gl.deleteBuffer(buffer);
    }

    drawLineStrip(points, color, width = 1.0) {
        if (points.length < 2) return;
        
        const gl = this.gl;
        const program = this.programs.basic;
        
        gl.useProgram(program);
        
        const vertices = new Float32Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            vertices[i * 2] = points[i].x;
            vertices[i * 2 + 1] = points[i].y;
        }
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const aPos = program.locations.attributes.aPos;
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        
        const projection = this.getProjectionMatrix();
        gl.uniformMatrix4fv(program.locations.uniforms.uProjection, false, projection);
        gl.uniform4fv(program.locations.uniforms.uColor, color);
        gl.uniform1i(program.locations.uniforms.uUseTexture, 0);
        
        gl.lineWidth(width);
        gl.drawArrays(gl.LINE_STRIP, 0, points.length);
        
        gl.deleteBuffer(buffer);
    }

    drawCircle(centerX, centerY, radius, color, segments = 32) {
        const gl = this.gl;
        const program = this.programs.basic;
        
        gl.useProgram(program);
        
        const vertices = new Float32Array((segments + 1) * 2);
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices[i * 2] = centerX + Math.cos(angle) * radius;
            vertices[i * 2 + 1] = centerY + Math.sin(angle) * radius;
        }
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const aPos = program.locations.attributes.aPos;
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        
        const projection = this.getProjectionMatrix();
        gl.uniformMatrix4fv(program.locations.uniforms.uProjection, false, projection);
        gl.uniform4fv(program.locations.uniforms.uColor, color);
        gl.uniform1i(program.locations.uniforms.uUseTexture, 0);
        
        gl.drawArrays(gl.LINE_STRIP, 0, segments + 1);
        
        gl.deleteBuffer(buffer);
    }

    applyPostProcessing(time) {
        const gl = this.gl;
        
        // 1. Barrel distortion
        this.renderFullscreenQuad(
            this.programs.barrel,
            this.framebuffers.scene.texture,
            this.framebuffers.temp1.fbo,
            (program) => {
                gl.uniform1f(program.locations.uniforms.uDistortion, 0.12);
                gl.uniform2f(program.locations.uniforms.uResolution, this.canvas.width, this.canvas.height);
            }
        );

        // 2. Chromatic aberration
        this.renderFullscreenQuad(
            this.programs.chromatic,
            this.framebuffers.temp1.texture,
            this.framebuffers.temp2.fbo,
            (program) => {
                gl.uniform1f(program.locations.uniforms.uIntensity, 1.5);
                gl.uniform2f(program.locations.uniforms.uResolution, this.canvas.width, this.canvas.height);
            }
        );

        // 3. Bloom - horizontal pass
        this.renderFullscreenQuad(
            this.programs.bloom,
            this.framebuffers.temp2.texture,
            this.framebuffers.bloomH.fbo,
            (program) => {
                gl.uniform2f(program.locations.uniforms.uDirection, 1.0, 0.0);
                gl.uniform2f(program.locations.uniforms.uResolution, this.canvas.width, this.canvas.height);
            }
        );

        // 4. Bloom - vertical pass
        this.renderFullscreenQuad(
            this.programs.bloom,
            this.framebuffers.bloomH.texture,
            this.framebuffers.bloomV.fbo,
            (program) => {
                gl.uniform2f(program.locations.uniforms.uDirection, 0.0, 1.0);
                gl.uniform2f(program.locations.uniforms.uResolution, this.canvas.width, this.canvas.height);
            }
        );

        // 5. Final composite to screen
        this.renderFullscreenQuad(
            this.programs.composite,
            this.framebuffers.temp2.texture,
            null, // Render to screen
            (program) => {
                // Bind bloom texture
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this.framebuffers.bloomV.texture);
                gl.uniform1i(program.locations.uniforms.uBloomTexture, 1);
                
                // Bind scanline texture
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, this.textures.scanline);
                gl.uniform1i(program.locations.uniforms.uScanlineTexture, 2);
                
                // Bind vignette texture
                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, this.textures.vignette);
                gl.uniform1i(program.locations.uniforms.uVignetteTexture, 3);
                
                // Set uniforms
                gl.uniform1f(program.locations.uniforms.uNoiseIntensity, 0.03);
                gl.uniform1f(program.locations.uniforms.uBloomIntensity, 0.4);
                gl.uniform1f(program.locations.uniforms.uFlickerIntensity, 0.01);
                gl.uniform1f(program.locations.uniforms.uTime, time);
                gl.uniform2f(program.locations.uniforms.uResolution, this.canvas.width, this.canvas.height);
                
                // Reset to texture unit 0
                gl.activeTexture(gl.TEXTURE0);
            }
        );
    }

    renderFullscreenQuad(program, inputTexture, outputFBO, setUniforms) {
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO);
        if (outputFBO) {
            this.clear(0, 0, 0, 1);
        }
        
        gl.useProgram(program);
        
        // Bind quad buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        
        const aPos = program.locations.attributes.aPos;
        const aTexCoord = program.locations.attributes.aTexCoord;
        
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
        
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
        
        // Bind input texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        gl.uniform1i(program.locations.uniforms.uScreenTexture, 0);
        
        // Set additional uniforms
        if (setUniforms) {
            setUniforms(program);
        }
        
        // Disable blending for post-processing
        gl.disable(gl.BLEND);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Re-enable blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        const gl = this.gl;
        gl.viewport(0, 0, width, height);
        
        // Recreate framebuffers and textures with new size
        this.createFramebuffers();
        this.createTextures();
    }

    dispose() {
        const gl = this.gl;
        
        // Delete programs
        for (const key in this.programs) {
            gl.deleteProgram(this.programs[key]);
        }
        
        // Delete framebuffers
        for (const key in this.framebuffers) {
            gl.deleteFramebuffer(this.framebuffers[key].fbo);
            gl.deleteTexture(this.framebuffers[key].texture);
        }
        
        // Delete textures
        for (const key in this.textures) {
            gl.deleteTexture(this.textures[key]);
        }
        
        // Delete buffers
        for (const key in this.buffers) {
            gl.deleteBuffer(this.buffers[key]);
        }
    }
}
