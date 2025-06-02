import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

let container;
let camera, scene, renderer;
let reticle;
let controller;
let cones = [];
let rotationEnabled = true;
let scaleAnimationEnabled = true;
let currentMaterialIndex = 0;
let currentColor = 0x00ff00;
let currentScale = 1.0;

const materials = [
    new THREE.MeshPhysicalMaterial({
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        reflectivity: 0.8,
    }),
    new THREE.MeshPhysicalMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
    }),
    new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 2,
        metalness: 0.2,
        roughness: 0.5,
    }),
];

init();
renderer.setClearColor(0xffffff, 1);
animate();

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    addReticleToScene();

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
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

    document.getElementById("changeColorBtn").addEventListener("click", changeConeColor);
    document.getElementById("toggleRotationBtn").addEventListener("click", toggleRotation);
    document.getElementById("changeSizeBtn").addEventListener("click", changeConeSize);
    document.getElementById("toggleScaleAnimationBtn").addEventListener("click", toggleScaleAnimation);
    document.getElementById("changeMaterialBtn").addEventListener("click", changeMaterial);

    updateColorIndicator(0x00ff00);

    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.2, 0.3, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
    });

    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    reticle.add(new THREE.AxesHelper(0.5));
}



function onSelect() {
    if (reticle.visible) {
        const geometry = new THREE.DodecahedronGeometry(0.05);
        const material = materials[currentMaterialIndex].clone();
        const object = new THREE.Mesh(geometry, material);
        material.color.setHex(currentColor);

        object.position.setFromMatrixPosition(reticle.matrix);
        object.quaternion.setFromRotationMatrix(reticle.matrix);

        object.scale.set(currentScale, currentScale, currentScale);
        let scaleUp = true;
        object.userData.animateScale = () => {
            if (scaleUp) {
                object.scale.multiplyScalar(1.05);
                if (object.scale.x >= currentScale) scaleUp = false;
            } else {
                object.scale.multiplyScalar(0.95);
                if (object.scale.x <= currentScale * 0.5) scaleUp = true;
            }
        };

        object.userData.rotationSpeed = 0.02;

        cones.push(object);
        scene.add(object);

        const placeSound = document.getElementById("placeSound");
        placeSound.currentTime = 0;
        placeSound.play();
    }
}

function updateColorIndicator(color) {
    const colorIndicator = document.getElementById("colorIndicator");
    const hexColor = `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
    colorIndicator.style.backgroundColor = hexColor;
}

function changeConeColor() {
    currentColor = Math.random() * 0xffffff;
    cones.forEach((cone) => {
        cone.material.color.setHex(currentColor);
    });
    updateColorIndicator(currentColor);
}

function toggleRotation() {
    rotationEnabled = !rotationEnabled;
    document.getElementById("toggleRotationBtn").textContent = rotationEnabled
        ? "Disable Rotation"
        : "Enable Rotation";
}

function changeConeSize() {
    currentScale = Math.random() * 0.5 + 0.5;
    cones.forEach((cone) => {
        cone.scale.set(currentScale, currentScale, currentScale);
    });
    document.getElementById("scaleIndicator").textContent = `Current Scale: ${currentScale.toFixed(2)}`;
}

function toggleScaleAnimation() {
    scaleAnimationEnabled = !scaleAnimationEnabled;
    document.getElementById("toggleScaleAnimationBtn").textContent =
        scaleAnimationEnabled ? "Disable Scale Animation" : "Enable Scale Animation";
}

function changeMaterial() {
    currentMaterialIndex = (currentMaterialIndex + 1) % materials.length;
    const newMaterial = materials[currentMaterialIndex].clone();
    cones.forEach((cone) => {
        const currentColor = cone.material.color.getHex();
        cone.material.dispose();
        cone.material = newMaterial;
        cone.material.color.setHex(currentColor);
    });
    document.getElementById("changeMaterialBtn").textContent = `Material: ${
        ["Metallic", "Glass", "Emissive"][currentMaterialIndex]
    }`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

async function initializeHitTestSource() {
    const session = renderer.xr.getSession();
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    localSpace = await session.requestReferenceSpace("local");

    hitTestSourceInitialized = true;

    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(localSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);

                reticle.material.opacity = 0.7 + 0.3 * Math.sin(timestamp * 0.005);
                reticle.material.color.setHSL((timestamp * 0.0005) % 1, 0.7, 0.5);
            } else {
                reticle.visible = false;
            }
        }

        cones.forEach((cone) => {
            if (scaleAnimationEnabled && cone.userData.animateScale) {
                cone.userData.animateScale();
            }
            if (rotationEnabled) {
                cone.rotation.y += cone.userData.rotationSpeed;
            }
        });

        renderer.render(scene, camera);
    }
}
