// The hall shader -- the thing that makes the entrance's room LIVE rather than
// a photograph of a room. Torch flame, drifting mist, light shafts, and a slow
// parallax on the architecture, all computed per pixel over the still hall
// plate.
//
// This is a COPY of the shader in public/royal-welcome-2/index.html, for the
// same reason src/data/realmArt.js repeats the hall rotation: that file is
// static HTML which Vite never bundles, so its <script id="fs"> cannot be
// imported. The two must agree -- change one, change both.
//
// Uniform meanings are documented in the shader source below; the per-hall
// values that drive them are in HALL_LOOK.

export const HALL_VERT = `attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`

export const HALL_FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTex;
uniform vec2  uRes;
uniform vec2  uTexRes;
uniform vec2  uMouse;
uniform float uTime;
uniform float uExposure;   // 0 = black, 1 = fully lit
uniform float uBlur;       // 1 = soft dream blur (opening)
uniform float uZoom;       // camera push
uniform float uFire;       // strength of flame animation
uniform float uMist;       // ground mist amount
uniform float uRain;       // rain curtain strength
uniform float uStorm;      // lightning strength
uniform float uAurora;     // celestial aurora strength
uniform vec3  uRayCol;     // colour of the light shafts
uniform float uRayAmt;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

/* cover-fit the texture to the viewport */
vec2 coverUV(vec2 uv){
  float ta = uTexRes.x / uTexRes.y;
  float sa = uRes.x / uRes.y;
  if (sa > ta) uv.y = (uv.y - 0.5) * (ta / sa) + 0.5;
  else         uv.x = (uv.x - 0.5) * (sa / ta) + 0.5;
  return uv;
}

vec3 grab(vec2 uv){ return texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb; }

/* soft blur used during the opening reveal */
vec3 grabBlur(vec2 uv, float r){
  if (r < 0.001) return grab(uv);
  vec3 c = vec3(0.0);
  c += grab(uv + vec2( r,  0.0));
  c += grab(uv + vec2(-r,  0.0));
  c += grab(uv + vec2(0.0,  r));
  c += grab(uv + vec2(0.0, -r));
  c += grab(uv + vec2( r,  r) * 0.7);
  c += grab(uv + vec2(-r,  r) * 0.7);
  c += grab(uv + vec2( r, -r) * 0.7);
  c += grab(uv + vec2(-r, -r) * 0.7);
  return c / 8.0;
}

/* how "flame-like" a pixel is: warm + bright */
float warmMask(vec3 c){
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float warm = clamp((c.r - c.b) * 1.9, 0.0, 1.0);
  return warm * smoothstep(0.18, 0.72, l);
}

void main(){
  vec2 frag = gl_FragCoord.xy / uRes;
  float t = uTime;

  /* --- living camera: slow push + breathing drift + parallax --- */
  vec2 uv = coverUV(frag);
  vec2 drift = vec2(sin(t * 0.045) * 0.004, cos(t * 0.037) * 0.003);
  uv = (uv - 0.5) / uZoom + 0.5 + drift + uMouse * 0.012;

  /* --- atmospheric warp: haze breathing through the hall --- */
  vec2 w = vec2(fbm(uv * 3.1 + vec2(t * 0.035, -t * 0.05)),
                fbm(uv * 3.4 + 7.3 + vec2(-t * 0.04, t * 0.033))) - 0.5;
  vec2 uvw = uv + w * 0.0035;

  /* --- heat shimmer rising off the flames --- */
  vec3 probe = grab(uvw);
  float wm = warmMask(probe);
  float below = warmMask(grab(uvw - vec2(0.0, 0.06)));
  float heat = max(wm, below * 0.9);
  float shimmer = sin(uv.x * 190.0 + t * 5.0) * 0.5 + fbm(vec2(uv.x * 24.0, uv.y * 12.0 - t * 1.6)) - 0.5;
  uvw += vec2(shimmer * 0.0022, abs(shimmer) * 0.0016) * heat * uFire;

  /* --- base plate --- */
  vec3 col = grabBlur(uvw, uBlur * 0.010);

  /* subtle chromatic separation towards the edges (anamorphic feel) */
  float edge = length(frag - 0.5);
  float ca = 0.0016 * edge * edge;
  col.r = grabBlur(uvw + vec2(ca, 0.0), uBlur * 0.010).r;
  col.b = grabBlur(uvw - vec2(ca, 0.0), uBlur * 0.010).b;

  /* --- LIVE FIRE: flicker + bloom on every warm pixel --- */
  float m = warmMask(col);
  float flick = fbm(vec2(uv.x * 7.0, uv.y * 3.0 - t * 2.4)) * 0.9
              + fbm(vec2(uv.x * 21.0, -t * 5.2)) * 0.5
              + sin(t * 11.0 + uv.x * 30.0) * 0.10;
  flick = (flick - 0.72);
  col += vec3(1.0, 0.52, 0.16) * m * flick * 0.85 * uFire;

  /* warm bloom bleeding into the air around the flames */
  float bloom = 0.0;
#ifdef LOW_TIER
  for (int i = 0; i < 4; i++){
    float a = float(i) * 1.5707963;
    bloom += warmMask(grab(uvw + vec2(cos(a), sin(a)) * 0.022));
  }
  bloom /= 4.0;
#else
  for (int i = 0; i < 8; i++){
    float a = float(i) * 0.7853981;
    bloom += warmMask(grab(uvw + vec2(cos(a), sin(a)) * 0.022));
  }
  bloom /= 8.0;
#endif
  col += vec3(1.0, 0.55, 0.20) * bloom * (0.22 + 0.16 * flick) * uFire;

  /* --- LIVE GOD RAYS drifting across the hall --- */
  float shafts = fbm(vec2(uv.x * 5.0 - t * 0.035, uv.y * 0.8 + t * 0.02));
  shafts = pow(max(shafts - 0.34, 0.0), 1.6) * 3.2;
  shafts *= smoothstep(0.05, 0.85, 1.0 - frag.y) * (0.65 + 0.35 * sin(t * 0.4));
  col += uRayCol * shafts * uRayAmt;

  /* --- LIVE GROUND MIST rolling forward --- */
  float mist = fbm(vec2(uv.x * 2.3 - t * 0.025, uv.y * 5.0 + t * 0.05));
  mist *= smoothstep(0.42, 0.0, frag.y) * uMist;
  col = mix(col, col * 0.75 + vec3(0.36, 0.44, 0.60) * 0.55, clamp(mist * 0.55, 0.0, 0.55));

  /* --- STORM PROFILE: diagonal rain + intermittent lightning --- */
  vec2 rp = frag * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  rp.x += rp.y * 0.32;
  float rainCell = hash(vec2(floor(rp.x * 180.0), floor((rp.y + t * 1.8) * 90.0)));
  float rainLine = smoothstep(0.945, 1.0, rainCell) * smoothstep(0.0, 0.16, fract((rp.y + t * 1.8) * 90.0));
  col += vec3(0.48, 0.64, 0.82) * rainLine * uRain * 0.7;
  float strike = pow(max(sin(t * 0.43 - 1.1), 0.0), 40.0) + 0.5 * pow(max(sin(t * 1.17 + 2.5), 0.0), 80.0);
  col += vec3(0.66, 0.78, 1.0) * strike * uStorm;

  /* --- CELESTIAL PROFILE: living violet-blue aurora ribbons --- */
  float ribbon = sin(uv.x * 8.0 + fbm(vec2(uv.x * 2.0 - t * 0.025, t * 0.035)) * 5.0 + t * 0.12);
  ribbon = pow(max(ribbon * 0.5 + 0.5 - uv.y * 0.22, 0.0), 3.0);
  ribbon *= smoothstep(0.32, 0.95, frag.y) * uAurora;
  col += mix(vec3(0.12,0.48,0.82), vec3(0.52,0.20,0.82), fbm(uv * 2.0 + t * 0.02)) * ribbon * 0.55;

  /* --- dark-to-light cinematic reveal --- */
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum) * 0.35, col, clamp(uExposure * 1.15, 0.0, 1.0));
  col *= mix(0.12, 1.0, uExposure);
  col = pow(max(col, 0.0), vec3(mix(1.35, 1.0, uExposure)));

  /* filmic contrast + gentle vignette (the CSS layer adds the rest) */
  col = (col - 0.5) * 1.06 + 0.5;
  col *= 1.0 - 0.35 * edge * edge;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`

// Per-hall lighting, copied from THEMES in the welcome page. Keys match
// REALM_HALLS in src/data/realmArt.js.
export const HALL_LOOK = {
  sapphire:   { ray: [0.58, 0.74, 1.00], rayAmt: .85,  fire: .85,  mist: .55,  rain: 0, storm: 0,   aurora: 0 },
  coronation: { ray: [1.00, 0.84, 0.58], rayAmt: .45,  fire: 1.35, mist: .40,  rain: 0, storm: 0,   aurora: 0 },
  moonlit:    { ray: [0.72, 0.84, 1.00], rayAmt: .70,  fire: .55,  mist: .85,  rain: 0, storm: 0,   aurora: 0 },
  embers:     { ray: [1.00, 0.42, 0.12], rayAmt: .20,  fire: 1.80, mist: .62,  rain: 0, storm: 0,   aurora: 0 },
  cathedral:  { ray: [1.00, 0.88, 0.58], rayAmt: 1.05, fire: .38,  mist: .42,  rain: 0, storm: 0,   aurora: 0 },
  storm:      { ray: [0.48, 0.65, 1.00], rayAmt: .35,  fire: .82,  mist: 1.00, rain: 0, storm: .22, aurora: 0 },
  dragongate: { ray: [1.00, 0.62, 0.24], rayAmt: .30,  fire: 1.55, mist: 1.12, rain: 0, storm: 0,   aurora: 0 },
  warcamp:    { ray: [1.00, 0.55, 0.20], rayAmt: .48,  fire: 1.45, mist: .72,  rain: 0, storm: 0,   aurora: 0 },
  celestial:  { ray: [0.45, 0.68, 1.00], rayAmt: .62,  fire: .24,  mist: .52,  rain: 0, storm: 0,   aurora: 1.0 },
}
