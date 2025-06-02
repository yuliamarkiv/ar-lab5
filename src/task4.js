import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container;
let camera, scene, renderer;
let reticle;
let controller;
let models = [];
let directionalLightEnabled = true;
let directionalLight;
let lightIntensity = 3;
let lightColors = [0xffffff, 0xffaaaa, 0xaaffaa, 0xaaaaff];
let currentLightColorIndex = 0;

init();
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    directionalLight.position.set(2, 3, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.5);
    hemisphereLight.position.set(0, 1, 0);
    scene.add(hemisphereLight);

    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    addReticleToScene();

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        onSessionStarted: () => {
            renderer.domElement.style.background = "transparent";
        },
        onSessionEnded: () => {
            // Можна щось зробити тут, якщо потрібно
        },
    });
    document.body.appendChild(button);

    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
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
        const loader = new GLTFLoader();
        loader.load(
            "https://yuliia-markiv-lab5.s3.us-east-1.amazonaws.com/toy/scene.gltf",
            (gltf) => {
                const model = gltf.scene;

                // Обчислюємо центр моделі для вирівнювання
                const box = new THREE.Box3().setFromObject(model);
                const center = new THREE.Vector3();
                box.getCenter(center);

                // Поміщаємо модель в позицію ретиклу і вирівнюємо по центру
                model.position.setFromMatrixPosition(reticle.matrix);
                model.quaternion.setFromRotationMatrix(reticle.matrix);
                model.position.sub(center); // Зсуваємо так, щоб центр моделі збігався з (0,0,0)
                model.position.add(reticle.position);

                // Збільшуємо модель
                model.scale.set(1.5, 1.5, 1.5);

                // Налаштування тіней і матеріалів
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material.side = THREE.DoubleSide;
                        child.material.needsUpdate = true;
                    }
                });

                models.push(model);
                scene.add(model);
            },
            undefined,
            (error) => {
                console.error("Error loading model:", error);
            }
        );
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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

function animate() {
    renderer.setAnimationLoop(render);
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

                // Простий мерехтливий ефект ретикла
                reticle.material.opacity = 0.7 + 0.3 * Math.sin(timestamp * 0.005);
                reticle.material.color.setHSL((timestamp * 0.0005) % 1, 0.7, 0.5);
            } else {
                reticle.visible = false;
            }
        }

        // Без анімацій руху моделі — модель стоїть на місці

        renderer.render(scene, camera);
    }
}
