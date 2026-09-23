import * as THREE from 'three'

/**
 * Renders the scene at a low internal resolution and upscales it with nearest
 * filtering, adding depth/normal-based outlines so 3D geometry reads like
 * hand-drawn pixel art. Layer 0 = world geometry (gets normal outlines),
 * layer 1 = sprites & labels (colour pass only).
 */
export const LAYER_SPRITES = 1

const compositeVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const compositeFrag = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform vec4 resolution;        // w, h, 1/w, 1/h of the low-res target
  uniform vec2 subPixel;          // camera snap remainder, in low-res texels
  uniform float depthStrength;
  uniform float normalStrength;
  varying vec2 vUv;

  float depthAt(vec2 uv) { return texture2D(tDepth, uv).r; }
  vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

  float depthEdge(vec2 uv, float d) {
    float diff = 0.0;
    diff += clamp(depthAt(uv + vec2( 1.0, 0.0) * resolution.zw) - d, 0.0, 1.0);
    diff += clamp(depthAt(uv + vec2(-1.0, 0.0) * resolution.zw) - d, 0.0, 1.0);
    diff += clamp(depthAt(uv + vec2( 0.0, 1.0) * resolution.zw) - d, 0.0, 1.0);
    diff += clamp(depthAt(uv + vec2( 0.0,-1.0) * resolution.zw) - d, 0.0, 1.0);
    return floor(smoothstep(0.004, 0.008, diff) * 2.0) / 2.0;
  }

  float neighbourNormalEdge(vec2 uv, float d, vec3 n, vec2 o) {
    vec2 nuv = uv + o * resolution.zw;
    float dd = depthAt(nuv) - d;
    vec3 nn = normalAt(nuv);
    vec3 bias = vec3(1.0, 1.0, 1.0);
    float nd = dot(n - nn, bias);
    float nInd = clamp(smoothstep(-0.01, 0.01, nd), 0.0, 1.0);
    float dInd = clamp(sign(dd * 0.25 + 0.0025), 0.0, 1.0);
    return (1.0 - dot(n, nn)) * dInd * nInd;
  }

  float normalEdge(vec2 uv, float d, vec3 n) {
    float s = 0.0;
    s += neighbourNormalEdge(uv, d, n, vec2( 1.0, 0.0));
    s += neighbourNormalEdge(uv, d, n, vec2(-1.0, 0.0));
    s += neighbourNormalEdge(uv, d, n, vec2( 0.0, 1.0));
    s += neighbourNormalEdge(uv, d, n, vec2( 0.0,-1.0));
    return step(0.1, s);
  }

  void main() {
    // shift by the sub-texel camera remainder so motion stays smooth while texels stay locked
    vec2 uv = vUv + subPixel * resolution.zw;
    uv = (floor(uv * resolution.xy) + 0.5) * resolution.zw;
    vec4 color = texture2D(tColor, uv);
    float d = depthAt(uv);
    vec3 n = normalAt(uv);
    float de = depthEdge(uv, d);
    float ne = de > 0.0 ? 0.0 : normalEdge(uv, d, n);
    float k = de > 0.0 ? (1.0 - depthStrength * de) : (1.0 + normalStrength * ne);
    gl_FragColor = vec4(color.rgb * k, 1.0);
    #include <colorspace_fragment>
  }
`

export class PixelRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly canvas: HTMLCanvasElement
  /** screen pixels per low-res texel */
  pixelSize = 3
  width = 1
  height = 1
  /** Re-render the shadow map every N frames (2 on phones). */
  shadowEvery = 1
  private frameNo = 0

  private colorTarget: THREE.WebGLRenderTarget
  private normalTarget: THREE.WebGLRenderTarget
  private normalMaterial = new THREE.MeshNormalMaterial()
  private quadScene = new THREE.Scene()
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private composite: THREE.ShaderMaterial

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.BasicShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const opts: THREE.RenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
    }
    this.colorTarget = new THREE.WebGLRenderTarget(1, 1, {
      ...opts,
      depthTexture: new THREE.DepthTexture(1, 1),
    })
    // store the colour pass in sRGB so 8-bit targets don't band in the darks
    this.colorTarget.texture.colorSpace = THREE.SRGBColorSpace
    this.normalTarget = new THREE.WebGLRenderTarget(1, 1, opts)

    this.composite = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.colorTarget.texture },
        tDepth: { value: this.colorTarget.depthTexture },
        tNormal: { value: this.normalTarget.texture },
        resolution: { value: new THREE.Vector4() },
        subPixel: { value: new THREE.Vector2() },
        depthStrength: { value: 0.45 },
        normalStrength: { value: 0.35 },
      },
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite)
    quad.frustumCulled = false
    this.quadScene.add(quad)
  }

  /** `pixelSize` = screen pixels per low-res texel. */
  resize(viewportW: number, viewportH: number, pixelSize: number) {
    this.pixelSize = Math.max(2, Math.round(pixelSize))
    // even texel counts keep the frustum edges on the world texel grid (see snapQuad),
    // and the canvas is an exact multiple of the texel size (it may overhang the viewport by a few px)
    const even = (n: number) => Math.ceil(n / 2) * 2
    this.width = even(viewportW / this.pixelSize)
    this.height = even(viewportH / this.pixelSize)
    const cssW = this.width * this.pixelSize
    const cssH = this.height * this.pixelSize
    this.renderer.setSize(cssW, cssH, false)
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    this.colorTarget.setSize(this.width, this.height)
    this.normalTarget.setSize(this.width, this.height)
    this.composite.uniforms.resolution.value.set(this.width, this.height, 1 / this.width, 1 / this.height)
  }

  setSubPixel(x: number, y: number) {
    this.composite.uniforms.subPixel.value.set(x, y)
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    const r = this.renderer
    // 1. colour + depth (all layers); shadows refresh at a reduced rate on slow devices
    r.shadowMap.autoUpdate = this.frameNo++ % this.shadowEvery === 0
    camera.layers.enableAll()
    r.setRenderTarget(this.colorTarget)
    r.render(scene, camera)

    // 2. normals (world geometry only, no shadows needed)
    const bg = scene.background
    const shadows = r.shadowMap.autoUpdate
    camera.layers.set(0)
    scene.overrideMaterial = this.normalMaterial
    scene.background = null
    r.shadowMap.autoUpdate = false
    r.setRenderTarget(this.normalTarget)
    r.setClearColor(0x8080ff, 1)
    r.clear()
    r.render(scene, camera)
    scene.overrideMaterial = null
    scene.background = bg
    r.shadowMap.autoUpdate = shadows
    camera.layers.enableAll()

    // 3. composite to screen
    r.setRenderTarget(null)
    r.render(this.quadScene, this.quadCamera)
  }

  dispose() {
    this.colorTarget.dispose()
    this.normalTarget.dispose()
    this.composite.dispose()
    this.renderer.dispose()
  }
}
