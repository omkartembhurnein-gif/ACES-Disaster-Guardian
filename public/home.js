
const earth = document.getElementById("earth");
const scene3d = earth?.closest(".earth-scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Respect visitors who prefer reduced motion.
if (earth && reduceMotion) {
  earth.style.animation = "none";
}

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const TEXTURES = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/";

// Decorative pulse locations (lat, lon) — not verified disaster locations.
const PULSES = [
  { lat: 26.14, lon: 91.74, color: "#ff9f43" }, // Assam
  { lat: 23.7, lon: 90.4, color: "#347fff" },
  { lat: 19.8, lon: 85.8, color: "#ff5d67" },
];

const AXIAL_TILT = toRadians(23.4);
const START_LON = 88; // Face South Asia on load.

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Unit vector for a latitude/longitude on three.js's sphere UV layout.
function latLonToVector(THREE, lat, lon, radius) {
  const phi = toRadians(lat);
  const lambda = toRadians(lon);
  return new THREE.Vector3(
    Math.cos(phi) * Math.cos(lambda),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(lambda)
  ).multiplyScalar(radius);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadTexture(THREE, loader, file, srgb) {
  return new Promise((resolve, reject) => {
    loader.load(
      TEXTURES + file,
      texture => {
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

function makePulseTexture(THREE) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,1)");
  gradient.addColorStop(0.24, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const earthVertex = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPositionW;

  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const earthFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specularMap;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPositionW;

  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vPositionW);
    float sun = dot(normal, sunDirection);

    // Day side with soft terminator, night side with city lights.
    float dayMix = smoothstep(-0.18, 0.22, sun);
    vec3 day = texture2D(dayMap, vUv).rgb * (0.06 + 1.15 * max(sun, 0.0));
    vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.0, 0.78, 0.48) * 1.6;

    // Sun glint on oceans only.
    vec3 halfDir = normalize(sunDirection + viewDir);
    float ocean = texture2D(specularMap, vUv).r;
    float glint = pow(max(dot(normal, halfDir), 0.0), 90.0) * ocean * 0.45;

    vec3 color = mix(night, day + glint * vec3(1.0, 0.94, 0.82), dayMix);

    // Thin blue atmospheric scattering at the limb.
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    color += vec3(0.32, 0.62, 1.0) * fresnel * (0.15 + 0.85 * dayMix);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudFragment = `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPositionW;

  void main() {
    vec4 cloud = texture2D(cloudMap, vUv);
    float density = clamp(
      cloud.a * dot(cloud.rgb, vec3(0.299, 0.587, 0.114)) * 1.25,
      0.0, 1.0
    );
    float sun = dot(normalize(vNormalW), sunDirection);
    float light = 0.04 + 1.0 * smoothstep(-0.2, 0.6, sun);
    gl_FragColor = vec4(vec3(light), density * 0.85);
    #include <colorspace_fragment>
  }
`;

const atmosphereVertex = `
  varying vec3 vNormalV;

  void main() {
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = `
  varying vec3 vNormalV;

  void main() {
    float intensity = pow(0.68 - dot(vNormalV, vec3(0.0, 0.0, 1.0)), 5.0);
    gl_FragColor = vec4(0.30, 0.62, 1.0, 1.0) * intensity * 0.9;
  }
`;

async function initEarth3D() {
  if (!earth || !scene3d || !supportsWebGL()) return;

  const THREE = await import(THREE_URL);
  const loader = new THREE.TextureLoader();

  const [dayMap, nightMap, specularMap, cloudMap] = await Promise.all([
    loadTexture(THREE, loader, "earth_atmos_2048.jpg", true),
    loadTexture(THREE, loader, "earth_lights_2048.png", true),
    loadTexture(THREE, loader, "earth_specular_2048.jpg", false),
    loadTexture(THREE, loader, "earth_clouds_1024.png", true),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "earth-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4.18);

  // Sun from the upper-left front so the terminator and night lights show.
  const sunDirection = new THREE.Vector3(-1.0, 0.35, 0.75).normalize();

  // Tilted axis holder; the globe spins inside it.
  const tilt = new THREE.Group();
  tilt.rotation.z = AXIAL_TILT;
  scene.add(tilt);

  const globe = new THREE.Group();
  globe.rotation.y = toRadians(-90 - START_LON);
  tilt.add(globe);

  const sphere = new THREE.SphereGeometry(1, 128, 128);

  const earthMesh = new THREE.Mesh(
    sphere,
    new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayMap },
        nightMap: { value: nightMap },
        specularMap: { value: specularMap },
        sunDirection: { value: sunDirection },
      },
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
    })
  );
  globe.add(earthMesh);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: {
        cloudMap: { value: cloudMap },
        sunDirection: { value: sunDirection },
      },
      vertexShader: earthVertex,
      fragmentShader: cloudFragment,
      transparent: true,
      depthWrite: false,
    })
  );
  globe.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 96, 96),
    new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  scene.add(atmosphere);

  // Decorative pulses pinned to the surface; they rotate with the globe.
  const pulseTexture = makePulseTexture(THREE);
  const pulses = PULSES.map(({ lat, lon, color }, index) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pulseTexture,
        color,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    sprite.position.copy(latLonToVector(THREE, lat, lon, 1.02));
    sprite.userData.phase = index * 0.8;
    globe.add(sprite);
    return sprite;
  });

  scene3d.classList.add("is-3d");
  earth.appendChild(renderer.domElement);

  function resize() {
    const size = renderer.domElement.clientWidth;
    if (!size) return;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(renderer.domElement);
  resize();

  // Drag to spin, with gentle inertia.
  let dragging = false;
  let lastX = 0;
  let velocity = 0;
  const autoSpeed = reduceMotion ? 0 : 0.06; // radians per second

  renderer.domElement.addEventListener("pointerdown", event => {
    dragging = true;
    lastX = event.clientX;
    velocity = 0;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", event => {
    if (!dragging) return;
    const delta = (event.clientX - lastX) * 0.008;
    lastX = event.clientX;
    globe.rotation.y += delta;
    velocity = delta * 60;
  });
  const endDrag = () => { dragging = false; };
  renderer.domElement.addEventListener("pointerup", endDrag);
  renderer.domElement.addEventListener("pointercancel", endDrag);

  const worldPos = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const clock = new THREE.Clock();

  function render() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;

    if (!dragging) {
      globe.rotation.y += (autoSpeed + velocity) * dt;
      velocity *= Math.pow(0.04, dt); // inertia decay
    }
    clouds.rotation.y += (reduceMotion ? 0 : 0.012) * dt;

    // Pulse markers; fade them out as they rotate behind the globe.
    pulses.forEach(sprite => {
      sprite.getWorldPosition(worldPos);
      toCamera.copy(camera.position).sub(worldPos).normalize();
      const facing = worldPos.normalize().dot(toCamera);
      const visible = THREE.MathUtils.smoothstep(facing, 0.05, 0.3);
      const beat = reduceMotion
        ? 0.5
        : 0.5 + 0.5 * Math.sin(time * 2.6 + sprite.userData.phase);
      sprite.material.opacity = visible * (0.75 + 0.25 * beat);
      sprite.scale.setScalar(0.075 + 0.045 * beat);
    });

    renderer.render(scene, camera);
  }

  // Only animate while the globe is on screen and the tab is visible.
  let onScreen = true;
  const updateLoop = () => {
    renderer.setAnimationLoop(onScreen && !document.hidden ? render : null);
    if (onScreen && !document.hidden) clock.getDelta();
  };
  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    updateLoop();
  }).observe(scene3d);
  document.addEventListener("visibilitychange", updateLoop);
  updateLoop();
}

// Falls back to the CSS globe if WebGL, the library or textures fail.
initEarth3D().catch(error => {
  console.warn("3D Earth unavailable, using fallback globe:", error);
  scene3d?.classList.remove("is-3d");
});
