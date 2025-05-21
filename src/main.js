import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;
let tubeMesh, extrudeMesh, torusMesh;
let controls;
let particles; // Special Effect
let hue = 0;

// Стани анімацій
let rotationEnabled = true;
let pulseMoveEnabled = true;
let colorEmitEnabled = true;
let speedMode = "normal";
let texturesEnabled = true;
let rotationDirection = 1; // 1: Вперед; -1: Назад
let specialEffectActive = false;
let specialEffectTimer = 0;

// Матеріали з текстурами та без текстур
let tubeMaterial, tubeMaterialNoTexture;
let torusMaterial, torusMeshMaterialNoTexture;
let extrudeMeshMaterial, extrudeMeshMaterialNoTexture;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  // Сцена
  scene = new THREE.Scene();

  // Камера
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

  // Рендеринг
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.xr.enabled = true; // Життєво важливий рядок коду для вашого застосунку!
  container.appendChild(renderer.domElement);

  // Світло
  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(3, 3, 3);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 10, 10);
  pointLight.position.set(-2, 2, 2);
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  // Завантаження текстур
  const textureLoader = new THREE.TextureLoader();
  const glassTexture = textureLoader.load(
    "https://as1.ftcdn.net/v2/jpg/01/61/23/82/1000_F_161238202_GbkRIC1lSjG7lZCLLPfQ7wAaEQyw9UsG.jpg"
  );
  const metalTexture = textureLoader.load(
    "https://images.unsplash.com/photo-1501166222995-ff31c7e93cef?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWV0YWwlMjB0ZXh0dXJlc3xlbnwwfHwwfHx8MA%3D%3D"
  );
  const lavaTexture = textureLoader.load(
    "https://t4.ftcdn.net/jpg/01/83/14/47/360_F_183144766_dbGaN37u6a4VCliXQ6wcarerpYmuLAto.jpg"
  );

  const tubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1, -1, 0),
          new THREE.Vector3(1, 1, 0),
          new THREE.Vector3(1, -1, 0),
          new THREE.Vector3(-1, 1, 0),
          new THREE.Vector3(-1, -1, 0)
      ]), 20, 0.2, 8, false);
tubeMaterial = new THREE.MeshPhysicalMaterial({
    map: glassTexture,
    transparent: true,
    opacity: 0.7,
    roughness: 0.5,
    metalness: 0.3,
    transmission: 0.6,
});
      
  tubeMaterialNoTexture = new THREE.MeshPhysicalMaterial({
      color: 0x00ff00,
    transparent: true,
    opacity: 0.7,
    roughness: 0.5,
    metalness: 0.3,
    transmission: 0.6,
  });
  tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  tubeMesh.position.set(-2.5, 0, -5);
  tubeMesh.scale.set(0.1, 0.1, 0.1);
  scene.add(tubeMesh);

  // 2. Torus Knot
  const torusGeometry = new THREE.TorusKnotGeometry(0.25, 0.15, 50, 16);
  torusMaterial = new THREE.MeshStandardMaterial({
    map: metalTexture,
    metalness: 0.8,
    roughness: 0.2,
  })
  torusMeshMaterialNoTexture = new THREE.MeshStandardMaterial({
    color: 0xff4500, 
    emissive: 0xff4500, 
    emissiveIntensity: 3, 
    metalness: 0.5,
    roughness: 0.2,
  });
  torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
  torusMesh.position.set(0, 0, -5);
  scene.add(torusMesh);

  const extrudeShape = new THREE.Shape();
  extrudeShape.moveTo(0, 0);
  extrudeShape.lineTo(1, 0);
  extrudeShape.lineTo(1, 1);
  extrudeShape.lineTo(0, 1);
  extrudeShape.lineTo(0, 0);
  const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 };
  const extrudeGeometry = new THREE.ExtrudeGeometry(extrudeShape, extrudeSettings);

  extrudeMeshMaterial = new THREE.MeshStandardMaterial({
    map: lavaTexture,
    emissive: 0xff0000,
    emissiveIntensity: 1.5,
    metalness: 0.5,
    roughness: 0.4,
  });
  extrudeMeshMaterialNoTexture = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1.5,
    metalness: 0.5,
    roughness: 0.4,
  });
  extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudeMeshMaterial);
  extrudeMesh.position.set(1.5, 0, -5);
  scene.add(extrudeMesh);

  // Special Effect
  createParticles();

  // Позиція камери
  camera.position.z = 3;

  // Контролери для 360 огляду на вебсторінці
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Налаштування AR-режиму
  const button = ARButton.createButton(renderer, {
    onSessionStarted: () => {
      renderer.domElement.style.background = "transparent";
      document.getElementById("controls").style.display = "flex";
    },
    onSessionEnded: () => {
      document.getElementById("controls").style.display = "flex";
    },
  });
  document.body.appendChild(button);
  renderer.domElement.style.display = "block";

  // Додаємо Listener для кнопок
  document
    .getElementById("toggleRotationBtn")
    .addEventListener("click", toggleRotation);
  document
    .getElementById("togglePulseBtn")
    .addEventListener("click", togglePulseMove);
  document
    .getElementById("toggleColorBtn")
    .addEventListener("click", toggleColorEmit);
  document
    .getElementById("toggleSpeedBtn")
    .addEventListener("click", toggleSpeed);
  document
    .getElementById("toggleTexturesBtn")
    .addEventListener("click", toggleTextures);
  document
    .getElementById("toggleDirectionBtn")
    .addEventListener("click", toggleDirection);
  document
    .getElementById("specialEffectBtn")
    .addEventListener("click", triggerSpecialEffect);

  window.addEventListener("resize", onWindowResize, false);
}

// Special Effect
function createParticles() {
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 300;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 8;

    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
}

function toggleRotation() {
  rotationEnabled = !rotationEnabled;
  document.getElementById("toggleRotationBtn").textContent = rotationEnabled
    ? "Disable Rotation"
    : "Enable Rotation";
}

function togglePulseMove() {
  pulseMoveEnabled = !pulseMoveEnabled;
  document.getElementById("togglePulseBtn").textContent = pulseMoveEnabled
    ? "Disable Pulse/Move"
    : "Enable Pulse/Move";
}

function toggleColorEmit() {
  colorEmitEnabled = !colorEmitEnabled;
  document.getElementById("toggleColorBtn").textContent = colorEmitEnabled
    ? "Disable Color/Emit"
    : "Enable Color/Emit";
}

function toggleSpeed() {
  speedMode = speedMode === "normal" ? "fast" : "normal";
  document.getElementById("toggleSpeedBtn").textContent = `Speed: ${
    speedMode.charAt(0).toUpperCase() + speedMode.slice(1)
  }`;
}

function toggleTextures() {
  texturesEnabled = !texturesEnabled;
  document.getElementById("toggleTexturesBtn").textContent = texturesEnabled
    ? "Disable Textures"
    : "Enable Textures";

  tubeMesh.material = texturesEnabled
    ? tubeMaterial
    : tubeMaterialNoTexture;
  torusMesh.material = texturesEnabled ? torusMaterial : torusMeshMaterialNoTexture;
  extrudeMesh.material = texturesEnabled
    ? extrudeMeshMaterial
    : extrudeMeshMaterialNoTexture;

  tubeMesh.material.needsUpdate = true;
  torusMesh.material.needsUpdate = true;
  extrudeMesh.material.needsUpdate = true;
}

function toggleDirection() {
  rotationDirection *= -1;
  document.getElementById("toggleDirectionBtn").textContent =
    rotationDirection === 1 ? "Direction: Forward" : "Direction: Backward";
}

function triggerSpecialEffect() {
  specialEffectActive = true;
  specialEffectTimer = 0;
  particles.material.opacity = 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
  controls.update();
}

function render(timestamp) {
  animateObjects(timestamp);
  renderer.render(scene, camera);
}

function animateObjects(timestamp) {
  const speed = speedMode === "normal" ? 1 : 2;
  const specialSpeed = specialEffectActive ? 3 : 1;

  // Анімація додекаедра
  if (rotationEnabled) {
    tubeMesh.rotation.y -=
      0.01 * speed * rotationDirection * specialSpeed;
  }
  if (pulseMoveEnabled) {
    const scale = 1 + 0.2 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    tubeMesh.scale.set(scale, scale, scale);
    tubeMesh.position.y =
      0.5 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    tubeMesh.material.opacity =
      0.5 + 0.2 * Math.sin(timestamp * 0.003 * speed * specialSpeed);
  }
  if (colorEmitEnabled) {
    hue += 0.005 * speed * specialSpeed;
    if (hue > 1) hue = 0;
    tubeMesh.material.color.setHSL(hue, 1, 0.5);
  }

  // Анімація торуса
  if (rotationEnabled) {
    torusMesh.rotation.x -= 0.01 * speed * rotationDirection * specialSpeed;
  }
  if (pulseMoveEnabled) {
     const scale = 1 + 0.2 * Math.sin(timestamp * 0.002 * speed * specialSpeed + Math.PI);
    torusMesh.scale.set(scale, scale, scale);
  }
  if (colorEmitEnabled) {
    hue += 0.005 * speed * specialSpeed;
    if (hue > 1) hue = 0;
    torusMesh.material.color.setHSL(hue, 1, 0.5);
  }

  // Анімація тетраедра
  if (rotationEnabled) {
    extrudeMesh.rotateOnAxis(new THREE.Vector3(1, 1, 0).normalize(), 0.01 * speed * rotationDirection * specialSpeed);
}
  if (pulseMoveEnabled) {
    const jump =
      Math.abs(Math.sin(timestamp * 0.005 * speed * specialSpeed)) * 0.5;
      extrudeMesh.position.y = jump;
  }
  if (colorEmitEnabled) {
    extrudeMesh.material.emissiveIntensity =
      1.5 + Math.sin(timestamp * 0.003 * speed * specialSpeed);
  }

  // Анімація частинок
  if (specialEffectActive) {
    specialEffectTimer += 0.1 * speed * specialSpeed;
    particles.material.opacity = Math.max(0, 1 - specialEffectTimer / 5);
    if (specialEffectTimer >= 5) {
      specialEffectActive = false;
      particles.material.opacity = 0;
    }
  }
}