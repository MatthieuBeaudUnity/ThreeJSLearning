"use strict"

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {GroundProjectedEnv} from "three/addons/objects/GroundProjectedEnv.js"
import Stats from "three/addons/libs/stats.module.js"
// import {GUI} from "dat.gui"
import { Overlay } from "overlay"
import * as Loader from "loader"
import * as EventManager from "mouseEvents"
import {CameraManager} from "cameraManager"

// Useful constants
const CLEAR_COLOR = 'rgb(60,60,60)';

// objects
let scene, camera, renderer, overlay, stats, gui, shadowLight, domeGroundPlane, cameraManager,
    selectionPoint, intersectableObjectsGroup, controls, controls2;

function initializeScene()
{
    scene = new THREE.Scene();
    scene.name = "Scene";
}

function initializeCamera(pos)
{
    camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(pos.x, pos.y, pos.z);
}

function initializeRenderer()
{
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
}

function initializeOverlay()
{
    overlay = new Overlay("overlayDiv", onOverlayCameraMoveCallback);
    overlay.setCameraAngle(camera);
}

function initializeSceneControls()
{
    controls = new OrbitControls( camera, renderer.domElement);
    controls.addEventListener('change', () => cameraManager.onMainCameraMove());
    controls.enablePan = false;

    //second controller to manage only the zoom when the mouse is over the overlay
    controls2 = new OrbitControls( camera, overlay.renderer.domElement);
    controls2.enablePan = false;
    controls2.enableRotate = false;
}

function initializeCameraManager()
{
    cameraManager = new CameraManager(camera, overlay.camera, [controls, controls2]);
}

function initializeStats()
{
    stats = new Stats();
    document.body.appendChild(stats.dom);
}

function initializeMouseEventManagement()
{

    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'mousedown', (event) => EventManager.onMouseDown(
        event)
    );
    window.addEventListener( 'mouseup', (event) => EventManager.onMouseUp(
        event, 
        camera, 
        intersectableObjectsGroup.children,
        overlay, 
        onCameraAlignWithViewCallback,
        selectionPoint
        )
    );
    window.addEventListener( 'mousemove', (event) => EventManager.onMouseMove(event, overlay));
}

function loadEnvironmentAndBackground()
{
    const backgroundTexture = Loader.loadCubemapTexture('./assets/modern_buildings_8k.hdr');
    scene.background = backgroundTexture;
    domeGroundPlane = new GroundProjectedEnv(backgroundTexture);
    domeGroundPlane.scale.setScalar(100);
    scene.add(domeGroundPlane);

    scene.environment = Loader.loadCubemapTexture('./assets/modern_buildings_1k.hdr');
}

function initializeShadows()
{
    const shadowGeom = new THREE.PlaneGeometry(20, 20);
    shadowGeom.rotateX(-Math.PI/2);
    const shadowMat = new THREE.ShadowMaterial();
    const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    shadowPlane.castShadow = true;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    shadowLight = new THREE.DirectionalLight( 0xffffff, 0 ); // here only for shadows
    shadowLight.position.set( 0, 1, 0 ); //default; light shining from top
    shadowLight.castShadow = true; // default false
    shadowLight.shadow.mapSize.width = 512; // default
    shadowLight.shadow.mapSize.height = 512; // default
    shadowLight.shadow.camera.near = 0.5; // default
    shadowLight.shadow.camera.far = 500; // default
    scene.add( shadowLight );
}

function populateScene()
{
    // a object group to regroup all objects that can be selected
    intersectableObjectsGroup = new THREE.Group();
    intersectableObjectsGroup.name = "worldObjects";
    intersectableObjectsGroup.translateY(0.6);
    scene.add(intersectableObjectsGroup);

    Loader.addGLTFToScene("assets/gltf_logo/", 
        "scene.gltf", 
        intersectableObjectsGroup
    );
    
    Loader.addGLTFToScene("assets/shoe/",
        "MaterialsVariantsShoe.gltf",
        intersectableObjectsGroup, 
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(0,0, -Math.PI/2)
    );
    
    Loader.addGLTFToScene("assets/shoe/",
        "MaterialsVariantsShoe.gltf",
        intersectableObjectsGroup, 
        new THREE.Vector3(0.195,-0.1,0), 
        new THREE.Vector3(0,0, Math.PI/2)
    );
}

function initializeSelectionPointHighlighter()
{
    let pointPos = new Float32Array([0,0,0]);
    let pointGeom = new THREE.BufferGeometry();
    pointGeom.setAttribute('position', new THREE.BufferAttribute( pointPos,3));
    selectionPoint = new THREE.Points(pointGeom, new THREE.PointsMaterial({color:0x00FF00, size: 0.1}));
    selectionPoint.visible = false;
    selectionPoint.name = "SelectionPoint";

    scene.add(selectionPoint);
}

function initializeGUI()
{
    // gui = new GUI();
    // let tonemappingGUI = gui.addFolder("Tonemapping");
    // tonemappingGUI.add(renderer, "toneMappingExposure", 0, 10).name("Exposure");
    // tonemappingGUI.add(renderer, "toneMapping",
    //             {NoToneMapping:THREE.NoToneMapping,
    //             LinearToneMapping:THREE.LinearToneMapping,
    //             ReinhardToneMapping:THREE.ReinhardToneMapping,
    //             CineonToneMapping:THREE.CineonToneMapping,
    //             ACESFilmicToneMapping:THREE.ACESFilmicToneMapping
    //             }).name("Exposure");
    // tonemappingGUI.open();
    // let lightShadowGUI = gui.addFolder("ShadowCaster");

    // var shadowParams = {
    //     color: 0x000000,
    //     quality: 512
    // };

    // lightShadowGUI.add(shadowLight.position, "x", -10,10);
    // lightShadowGUI.add(shadowLight.position, "y", 0.1,10);
    // lightShadowGUI.add(shadowLight.position, "z", -10,10);
    // lightShadowGUI.add(shadowParams, "quality", 64, 4096).onFinishChange( ()=>
    //     {
    //         shadowLight.shadow.mapSize.width = shadowParams.quality;
    //         shadowLight.shadow.mapSize.height = shadowParams.quality;
    //         shadowLight.shadow.map.dispose(); // important
    //         shadowLight.shadow.map = null;
    //     }
    // );
    // lightShadowGUI.add(shadowLight.shadow, "radius", 0,10);
    // lightShadowGUI.addColor(shadowParams, "color").onChange(()=>{shadowPlane.material.color.set(params.color);});
    // lightShadowGUI.add(shadowPlane.material, "opacity", 0,1);
    // lightShadowGUI.open();

    //ground plane 
    
    // let groundPlaneGUI = gui.addFolder("Ground Projection");
    // groundPlaneGUI.add(domeGroundPlane, "radius", 0, 100);
    // groundPlaneGUI.add(domeGroundPlane, "height", 0, 100);
    // groundPlaneGUI.open();
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

function onOverlayCameraMoveCallback()
{
    cameraManager.onOverlayCameraMove();
}

function onCameraAlignWithViewCallback(newDirection)
{
    cameraManager.alignMainCameraWithDirection(newDirection);
}

function init()
{
    initializeScene();
    initializeCamera(new THREE.Vector3(2, 2, 6));    
    initializeRenderer();
    initializeOverlay();
    initializeSceneControls();
    //needs to be done after scene, controls and overlay inits
    initializeCameraManager();
    initializeStats();
    initializeSelectionPointHighlighter();
    initializeMouseEventManagement();

    loadEnvironmentAndBackground();
    populateScene();
    initializeShadows();

    initializeGUI();

    render();
}

init();