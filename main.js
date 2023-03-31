"use strict"

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {GUI} from "dat.gui"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"
import {RGBELoader} from "three/addons/loaders/RGBELoader.js"
import Stats from "three/addons/libs/stats.module.js"
import { Overlay } from "overlay"

// Useful constants
const CLEAR_COLOR = 'rgb(60,60,60)';
const MOUSE_MIN_DRAG_DIST = 10;

// objects
let scene, camera, renderer, overlay, raycaster, stats, gui,
 pointerDownPosition, selectionPoint, objectGroup, controls, controls2;

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

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Overlay Init
    overlay = new Overlay("overlayDiv", onCameraOverlayMove);
    overlay.setCameraAngle(camera);

    //window event binding
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'mousedown', onMouseDown);
    window.addEventListener( 'mouseup', onMouseUp);
    window.addEventListener( 'mousemove', onMouseMove);

    //GLTFLoader init and import
    const gltfLoader = new GLTFLoader();
    gltfLoader.setPath("assets/gltf_logo/");
    gltfLoader.load("scene.gltf", onGLTFLoad,
        // called while loading is progressing
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    );

    //Environment Map Loader init and import
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('./assets/modern_buildings_8k.hdr', onEnvironmentMapLoad,
        // called while loading is progressing
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 )
                        .toLocaleString(undefined,{ maximumFractionDigits: 2 }) 
                        + '% loaded' 
                        );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    )

    //Controls 
    controls = new OrbitControls( camera, renderer.domElement);
    controls.addEventListener('change', onCameraMove);
    controls.enablePan = false;

    controls2 = new OrbitControls( camera, overlay.renderer.domElement);
    //zoom only enabled
    controls2.enablePan = false;
    controls2.enableRotate = false;

    //raycaster
    raycaster = new THREE.Raycaster();

    //mouse management
    pointerDownPosition = new THREE.Vector2();

    //highlighter
    let pointPos = new Float32Array([0,0,0]);
    let poitnGeom = new THREE.BufferGeometry();
    poitnGeom.setAttribute('position', new THREE.BufferAttribute( pointPos,3));
    selectionPoint = new THREE.Points(poitnGeom, new THREE.PointsMaterial({color:0x00FF00, size: 0.1}));
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

    //Stats init
    stats = new Stats();
    document.body.appendChild(stats.dom);

    //create group to put worldScene Objects (to separate from other scene objects when picking)
    objectGroup = new THREE.Group();
    objectGroup.name = "worldObjects";
    scene.add(objectGroup);
    scene.add(selectionPoint);

    render();
}

function render()
{
    requestAnimationFrame(render);
    stats.update();
    renderer.render(scene,camera);
    overlay.render();
}

function updateControls()
{
    controls.update();
    controls2.update();
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    overlay.resize();
}

function onMouseClick(clientPos)
{
    let posCS = new THREE.Vector2(clientPos.x / window.innerWidth, - clientPos.y / window.innerHeight);
    posCS.x = posCS.x*2 -1;
    posCS.y = posCS.y*2 +1;
    let mainSceneIntersection = raycastIntersection(posCS, camera, scene, "worldObjects");
    if(!overlay.onMouseClick(clientPos, alignCameraWithView))
    {
        updateSelectionPoint(mainSceneIntersection);
    }
}

function onMouseDown(event)
{
    pointerDownPosition.x = event.x;
    pointerDownPosition.y = event.y;
}

function onMouseUp(event)
{
    let pos = new THREE.Vector2(event.clientX, event.clientY);
    if (pointerDownPosition.distanceTo(pos) < MOUSE_MIN_DRAG_DIST)
    {
        onMouseClick(pos);
    }
}

function onMouseMove(event)
{
    if(event.buttons == 1){return} //mouse is down

    let pos = new THREE.Vector2(event.clientX, event.clientY);
    let elementHover = overlay.raycastIntersection(pos);
    overlay.updateCubeFaceHighlight(elementHover);
}

function onGLTFLoad(gltf)
{
    objectGroup.add(gltf.scene);
    render();
}

function onEnvironmentMapLoad(texture)
{
    console.log("Adding Environment Map to scene");
    texture.mapping = THREE.EquirectangularReflectionMapping;    
    scene.background = texture;
    scene.environment = texture;
}

function raycastIntersection(positionCS, cam, myScene, objectGroupName)
{
    raycaster.setFromCamera( positionCS, cam);

    // compute objects intersecting the picking ray
	let intersects = raycaster.intersectObjects( myScene.getObjectByName(objectGroupName).children);
    if( intersects.length==0)
    {
        return null;
    }
    return intersects[0];
}

function updateSelectionPoint(mainSceneIntersection)
{
    if(mainSceneIntersection != null)
    {
        console.log("Selected World Element:");
        console.log(mainSceneIntersection);
        selectionPoint.geometry.attributes.position.array = new Float32Array([mainSceneIntersection.point.x, mainSceneIntersection.point.y, mainSceneIntersection.point.z]);
        selectionPoint.geometry.attributes.position.needsUpdate = true;
    
        selectionPoint.visible = true;
        return;
    }
    console.log("Selected World Element: null");
    selectionPoint.visible = false;
}

function onCameraMove()
{
    overlay.setCameraAngle(camera);
}

function onCameraOverlayMove(overlayCam)
{
    let currentCamSpherical = new THREE.Spherical();
    let newCamSpherical = new THREE.Spherical();
    currentCamSpherical.setFromCartesianCoords(camera.position.x, camera.position.y, camera.position.z);
    newCamSpherical.setFromCartesianCoords(overlayCam.position.x, overlayCam.position.y, overlayCam.position.z);
    newCamSpherical.radius = currentCamSpherical.radius;
    let camNewPos = new THREE.Vector3().setFromSpherical(newCamSpherical);
    camera.position.copy(camNewPos);
    camera.lookAt(0,0,0);
    updateControls();
}

function alignCameraWithView(newDirection)
{
    let newCameraAngle = new THREE.Spherical();
    newCameraAngle.setFromCartesianCoords(newDirection.x, newDirection.y, newDirection.z);
    let currentCamAngle = new THREE.Spherical();
    currentCamAngle.setFromCartesianCoords(camera.position.x, camera.position.y, camera.position.z);
    newCameraAngle.radius = currentCamAngle.radius;
    let camNewPos = new THREE.Vector3().setFromSpherical(newCameraAngle);
    camera.position.copy(camNewPos);
    camera.lookAt(0,0,0);
    onCameraMove(); //to update the overlay camera position
    updateControls();
}