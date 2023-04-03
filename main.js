"use strict"

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"
import {RGBELoader} from "three/addons/loaders/RGBELoader.js"
import {GroundProjectedEnv} from "three/addons/objects/GroundProjectedEnv.js"
import Stats from "three/addons/libs/stats.module.js"
import {GUI} from "dat.gui"
import { Overlay } from "overlay"
import * as Loader from "loader"
import * as EventManager from "mouseEvents"
import * as CameraManager from "cameraManager"

// Useful constants
const CLEAR_COLOR = 'rgb(60,60,60)';

// objects
let scene, camera, renderer, overlay, stats, gui,
 pointerDownPosition, selectionPoint, intersectableObjectsGroup, controls, controls2;

init();

function init()
{
    // Scene and Camera init
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.x = 2;
    camera.position.y = 2;
    camera.position.z = 6;
    scene.name = "Scene";

    // Renderer init
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio );
    document.body.appendChild(renderer.domElement);
    renderer.domElement.id = "MainScene";
    renderer.setClearColor(CLEAR_COLOR);
    renderer.shadowMap.enabled = true;

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Overlay Init
    overlay = new Overlay("overlayDiv", onCameraMoveCallback);
    overlay.setCameraAngle(camera);

    //window event binding
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'mousedown', (event) => EventManager.onMouseDown(
        event, 
        pointerDownPosition)
    );
    window.addEventListener( 'mouseup', (event) => EventManager.onMouseUp(
        event, 
        camera, 
        intersectableObjectsGroup.children,
        pointerDownPosition, 
        overlay, 
        onCameraAlignWithViewCallback,
        selectionPoint
        )
    );
    window.addEventListener( 'mousemove', (event) => EventManager.onMouseMove(event, overlay));

    //GLTFLoader init and import
    const gltfLoader = new GLTFLoader();
    gltfLoader.setPath("assets/gltf_logo/");
    gltfLoader.load("scene.gltf", gltf => Loader.onGLTFLoad(intersectableObjectsGroup, gltf));

    gltfLoader.setPath("assets/shoe/");
    gltfLoader.load("MaterialsVariantsShoe.gltf", 
        gltf => Loader.onGLTFLoad(
            intersectableObjectsGroup,
            gltf,
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(0,0, -Math.PI/2)
        ),
    );

    gltfLoader.load("MaterialsVariantsShoe.gltf", 
        gltf => Loader.onGLTFLoad(
            intersectableObjectsGroup, 
            gltf, 
            new THREE.Vector3(0.195,-0.1,0), 
            new THREE.Vector3(0,0, Math.PI/2)
        ),
    );

    // //Environment Map Loader init and import
    const rgbeLoader = new RGBELoader();
    const backgroundTexture = rgbeLoader.load('./assets/modern_buildings_8k.hdr',
                                             (texture) => Loader.onEnvironmentMapLoad(scene, texture));

    rgbeLoader.load('./assets/modern_buildings_1k.hdr',
                     (texture) => Loader.onReflectionMapLoad(scene, texture))

    //shadow plane
    const shadowGeom = new THREE.PlaneGeometry(20, 20);
    shadowGeom.rotateX(-Math.PI/2);
    const shadowMat = new THREE.ShadowMaterial();
    const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    shadowPlane.castShadow = true;
    shadowPlane.receiveShadow = true;

    const light = new THREE.DirectionalLight( 0xffffff, 0 ); // here only for shadows
    light.position.set( 0, 1, 0 ); //default; light shining from top
    light.castShadow = true; // default false
    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 500; // default
    scene.add( light );

    const boxGeom = new THREE.BoxGeometry(0.5,0.5,0.1);
    const boxMat = new THREE.MeshStandardMaterial({color : "red"});
    const box = new THREE.Mesh(boxGeom, boxMat);
    box.castShadow = true;

    //Controls 
    controls = new OrbitControls( camera, renderer.domElement);
    controls.addEventListener('change', () => CameraManager.onCameraMove(camera, overlay));
    controls.enablePan = false;

    controls2 = new OrbitControls( camera, overlay.renderer.domElement);
    //zoom only enabled
    controls2.enablePan = false;
    controls2.enableRotate = false;

    //mouse management
    pointerDownPosition = new THREE.Vector2();

    //highlighter
    let pointPos = new Float32Array([0,0,0]);
    let pointGeom = new THREE.BufferGeometry();
    pointGeom.setAttribute('position', new THREE.BufferAttribute( pointPos,3));
    selectionPoint = new THREE.Points(pointGeom, new THREE.PointsMaterial({color:0x00FF00, size: 0.1}));
    selectionPoint.visible = false;
    selectionPoint.name = "SelectionPoint";

    //UI init
    gui = new GUI();
    let tonemappingGUI = gui.addFolder("Tonemapping");
    tonemappingGUI.add(renderer, "toneMappingExposure", 0, 10).name("Exposure");
    tonemappingGUI.add(renderer, "toneMapping",
                {NoToneMapping:THREE.NoToneMapping,
                LinearToneMapping:THREE.LinearToneMapping,
                ReinhardToneMapping:THREE.ReinhardToneMapping,
                CineonToneMapping:THREE.CineonToneMapping,
                ACESFilmicToneMapping:THREE.ACESFilmicToneMapping
                }).name("Exposure");
    tonemappingGUI.open();
    let lightShadowGUI = gui.addFolder("ShadowCaster");

    var shadowParams = {
        color: 0x000000,
        quality: 512
    };

    lightShadowGUI.add(light.position, "x", -10,10);
    lightShadowGUI.add(light.position, "y", 0.1,10);
    lightShadowGUI.add(light.position, "z", -10,10);
    lightShadowGUI.add(shadowParams, "quality", 64, 4096).onFinishChange( ()=>
        {
            light.shadow.mapSize.width = shadowParams.quality;
            light.shadow.mapSize.height = shadowParams.quality;
            light.shadow.map.dispose(); // important
            light.shadow.map = null;
        }
    );
    lightShadowGUI.add(light.shadow, "radius", 0,10);
    lightShadowGUI.addColor(shadowParams, "color").onChange(()=>{shadowPlane.material.color.set(params.color);});
    lightShadowGUI.add(shadowPlane.material, "opacity", 0,1);
    lightShadowGUI.open();

    //ground plane 
    let groundPlane = new GroundProjectedEnv(backgroundTexture);
    groundPlane.scale.setScalar(100);
    scene.add(groundPlane);
    let groundPlaneGUI = gui.addFolder("Ground Projection");
    groundPlaneGUI.add(groundPlane, "radius", 0, 100);
    groundPlaneGUI.add(groundPlane, "height", 0, 100);
    groundPlaneGUI.open();

    //Stats init
    stats = new Stats();
    document.body.appendChild(stats.dom);

    //create group to put worldScene Objects (to separate from other scene objects when picking)
    intersectableObjectsGroup = new THREE.Group();
    intersectableObjectsGroup.name = "worldObjects";
    intersectableObjectsGroup.translateY(0.6);
    scene.add(intersectableObjectsGroup);
    scene.add(selectionPoint);
    scene.add(shadowPlane);

    render();
}

function render()
{
    requestAnimationFrame(render);
    stats.update();
    renderer.render(scene,camera);
    overlay.render();
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    overlay.resize();
}

function onCameraMoveCallback(overlayCam)
{
    CameraManager.onCameraOverlayMove(camera, overlayCam, [controls, controls2]);
}

function onCameraAlignWithViewCallback(newPosition)
{
    CameraManager.alignCameraWithView(camera, overlay, newPosition, [controls,controls2]);
}