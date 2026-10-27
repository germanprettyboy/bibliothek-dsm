/* Punkte on the GPU (WebGL 1): the same picture as `dots` in scenes.js, but each dot is computed in the vertex shader
   (landscape, lens, ring waves, color) and drawn as a round point with a one-pixel soft edge – sharp at the full device
   resolution, while the main thread only sets a few uniforms per frame and issues one draw call. The grid (dot indices)
   is uploaded once per size. library/backdrop.jsx uses it wherever WebGL works, otherwise `dots` (canvas 2D).
   Contract: setup(gl) → resources or null (no shaders: canvas 2D); init(S, R) → state; draw(R, S, st).
   3D simplex noise in the shader: webgl-noise by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT license. */
import { GRID, PARALLAX, WAVE } from "@/library/scenes";

const VS = `attribute vec2 aIdx;
uniform vec2 uView;uniform vec4 uGrid;uniform float uZ,uBase,uK,uDpr,uMax;uniform vec4 uLens;
uniform vec4 uWave[6];uniform float uWaveC[6];uniform vec3 uFg;uniform vec3 uPal[6];
varying vec4 vCol;varying float vR,vSize;
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx),g=step(x0.yzx,x0.xyz),l=1.-g,i1=min(g.xyz,l.zxy),i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-D.yyy;i=m289(i);
vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
vec3 ns=.142857142857*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z),x_=floor(j*ns.z),y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy,y=y_*ns.x+ns.yyyy,h=1.-abs(x)-abs(y),b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.,sh=-step(h,vec4(0.)),a0=b0.xzyw+s0.xzyw*sh.xxyy,a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y),p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
vec4 n=1.79284291400159-.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));p0*=n.x;p1*=n.y;p2*=n.z;p3*=n.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
void main(){float g=uGrid.x;vec2 home=vec2(uGrid.y+aIdx.x*g,aIdx.y*g+uGrid.z-g),p=home;float wy=home.y+uGrid.w;
float v=(snoise(vec3(home.x/260.,wy/260.,uZ))+1.)*.5,r=uBase*(.45+1.9*v*v),acc=smoothstep(.7,.95,v)*.45,hue=-1.;
if(uLens.z>.01){vec2 d=home-uLens.xy;float dist=length(d);if(dist<uLens.w){float q=1.-dist/uLens.w;q=q*q*uLens.z;
p+=d*(q*g*.9/max(dist,1.));r*=1.+1.5*q;acc=max(acc,q*1.1);}}
float wq=0.,wc=0.;for(int k=0;k<6;k++){vec4 w=uWave[k];if(w.w>0.){float q=max(0.,1.-abs(distance(p,w.xy)-w.z)/56.)*w.w;
if(q>wq){wq=q;wc=uWaveC[k];}}}
if(wq>0.){r*=1.+2.4*wq;if(wq>acc){acc=wq;hue=wc;}}
vec3 col=uFg;float a=.2;
if(acc>.12){if(hue<0.){float t=atan(snoise(vec3(home.x/700.,wy/700.,uZ*.5)),snoise(vec3(home.x/700.+31.,wy/700.-17.,uZ*.5)));
hue=mod(floor((t/6.2831853+.5)*6.),6.);}col=uPal[int(hue+.5)];a=.4+min(acc,1.)*.56;}
a=clamp(a*uK,0.,1.);vR=r*uDpr;vSize=min(2.*vR+2.,uMax);vCol=vec4(col*a,a);
gl_PointSize=vSize;gl_Position=r<.35?vec4(2.,2.,2.,1.):vec4(p.x/uView.x*2.-1.,1.-p.y/uView.y*2.,0.,1.);}`;

// The dot: its radius in device pixels against the distance from the middle, one pixel of soft edge (premultiplied)
const FS = `precision mediump float;varying vec4 vCol;varying float vR,vSize;
void main(){float a=clamp(min(vR,vSize*.5-1.)-length(gl_PointCoord-.5)*vSize+.5,0.,1.);if(a<=0.)discard;gl_FragColor=vCol*a;}`;

const UNIFORMS = ["uView", "uGrid", "uZ", "uBase", "uK", "uDpr", "uMax", "uLens", "uWave", "uWaveC", "uFg", "uPal"];
const rgb = hex => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); return m ? [m[1], m[2], m[3]].map(v => parseInt(v, 16) / 255) : [.2, .2, .2]; };
const mod = (x, m) => ((x % m) + m) % m;

export const dotsGL = {
  gl: true,
  setup(gl) {
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.bindAttribLocation(prog, 0, "aIdx"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const u = {};
    for (const n of UNIFORMS) u[n] = gl.getUniformLocation(prog, n);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
    return { gl, u, max: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64, waves: new Float32Array(24), waveC: new Float32Array(6), P: null };
  },
  // The same grid as `dots`; the GPU affords every dot even on a big screen (cap only for 4K and beyond)
  init({ w, h }, R) {
    let g = GRID;
    while ((w / g + 1) * (h / g + 2) > 30000) g *= 1.1;
    const nx = Math.ceil(w / g) + 1, ny = Math.ceil(h / g) + 2, idx = new Float32Array(nx * ny * 2);
    for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++) { idx[k++] = i; idx[k++] = j; }
    R.gl.bufferData(R.gl.ARRAY_BUFFER, idx, R.gl.STATIC_DRAW);
    return { g, n: nx * ny, x0: (w - (nx - 1) * g) / 2 };
  },
  draw(R, S, { g, n, x0 }) {
    const { gl, u } = R, { w, h, lens } = S, shift = S.sy * PARALLAX;
    if (R.P !== S.P) { // colors: after a theme switch
      R.P = S.P;
      gl.uniform3fv(u.uFg, rgb(S.P.fg)); gl.uniform3fv(u.uPal, S.P.logo.flatMap(rgb));
    }
    const W = R.waves;
    for (let i = 0, o = 0; i < 6; i++, o += 4) {
      const wv = S.waves[i], age = wv ? S.now - wv.t0 : WAVE.life;
      if (age < WAVE.life) { W[o] = wv.x; W[o + 1] = wv.y; W[o + 2] = age * WAVE.v; W[o + 3] = 1 - age / WAVE.life; R.waveC[i] = wv.c; } else W[o + 3] = 0;
    }
    // noise time as a slow back and forth: float precision on the GPU stays fine on a PC that runs for days
    const z = S.t * 6e-5, zz = 1000 - Math.abs(mod(z, 2000) - 1000);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uView, w, h);
    gl.uniform4f(u.uGrid, g, x0, mod(-shift, g), shift);
    gl.uniform1f(u.uZ, zz); gl.uniform1f(u.uBase, g * .085); gl.uniform1f(u.uK, S.k); gl.uniform1f(u.uDpr, S.dpr);
    gl.uniform1f(u.uMax, R.max);
    gl.uniform4f(u.uLens, lens.x, lens.y, lens.a, Math.max(110, Math.min(220, Math.min(w, h) * .3)));
    gl.uniform4fv(u.uWave, R.waves); gl.uniform1fv(u.uWaveC, R.waveC);
    gl.drawArrays(gl.POINTS, 0, n);
  },
};
