precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
const int u_pixelSize = 3;

void main() {
  vec2 xy = gl_FragCoord.xy;
  xy.y = u_resolution.y - xy.y;
  vec2 xyPixel = floor(xy / float(u_pixelSize)) * float(u_pixelSize);
  vec4 color = vec4(0.0);
  for (int dx = 0; dx < u_pixelSize; dx++) {
    for (int dy = 0; dy < u_pixelSize; dy++) {
      vec2 offset = vec2(dx, dy);
      vec2 uv = (xyPixel + offset) / u_resolution;
      vec4 sampleColor = texture2D(u_texture, uv);
      color += sampleColor;
    }
  }
  gl_FragColor = color / float(u_pixelSize * u_pixelSize);
}

// vim: set ft=glsl sw=2 ts=2 et:
