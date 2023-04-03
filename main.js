"use strict"

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"
import {RGBELoader} from "three/addons/loaders/RGBELoader.js"
import {GroundProjectedEnv} from "three/addons/objects/GroundProjectedEnv.js"
import Stats from "three/addons/libs/stats.module.js"
import {GUI} from "dat.gui"
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
    renderer.shadowMap.enabled = true;

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
    gltfLoader.load("scene.gltf", gltf => onGLTFLoad(gltf),
        // called while loading is progressing
        function ( xhr ) {
        //    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    );

    gltfLoader.setPath("assets/shoe/");
    gltfLoader.load("MaterialsVariantsShoe.gltf", 
        gltf => onGLTFLoad(gltf, new THREE.Vector3(0,0,0), new THREE.Vector3(0,0, -Math.PI/2)),
        // called while loading is progressing
        function ( xhr ) {
        //    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    );

    gltfLoader.load("MaterialsVariantsShoe.gltf", 
        gltf => onGLTFLoad(gltf, new THREE.Vector3(0.195,-0.1,0), new THREE.Vector3(0,0, Math.PI/2)),
        // called while loading is progressing
        function ( xhr ) {
        //    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
            console.log(error);
        }
    );

    // //Environment Map Loader init and import
    const rgbeLoader = new RGBELoader();
    const backgroundTexture = rgbeLoader.load('./assets/modern_buildings_8k.hdr', onEnvironmentMapLoad);

    rgbeLoader.load('./assets/modern_buildings_1k.hdr', onReflectionMapLoad)

    //shadow plane
    let shadowGeom = new THREE.PlaneGeometry(20, 20);
    shadowGeom.rotateX(-Math.PI/2);
    let shadowMat = new THREE.ShadowMaterial();
    let shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    shadowPlane.castShadow = true;
    shadowPlane.receiveShadow = true;

    let light = new THREE.DirectionalLight( 0xffffff, 0 ); // here only for shadows
    light.position.set( 0, 1, 0 ); //default; light shining from top
    light.castShadow = true; // default false
    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 500; // default
    scene.add( light );

    let boxGeom = new THREE.BoxGeometry(0.5,0.5,0.1);
    let boxMat = new THREE.MeshStandardMaterial({color : "red"});
    let box = new THREE.Mesh(boxGeom, boxMat);
    box.castShadow = true;

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
    let lightShadowGUI = gui.addFolder("ShadowCaster");
    lightShadowGUI.add(light.position, "x", -10,10);
    lightShadowGUI.add(light.position, "y", 0.1,10);
    lightShadowGUI.add(light.position, "z", -10,10);
    lightShadowGUI.add(light.shadow.mapSize, "width", 64, 2048).onFinishChange( ()=>
        {
            light.shadow.map.dispose(); // important
            light.shadow.map = null;
        }
    );
    lightShadowGUI.add(light.shadow.mapSize, "height", 64, 2048).onFinishChange( ()=>
    {
        light.shadow.map.dispose(); // important
        light.shadow.map = null;
    });

    var params = {
        color: 0x000000
    };

    lightShadowGUI.addColor(params, "color").onChange(()=>{shadowPlane.material.color.set(params.color);});
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
    objectGroup = new THREE.Group();
    objectGroup.name = "worldObjects";
    objectGroup.translateY(0.6);
    // objectGroup.add(box);
    scene.add(objectGroup);
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

    const divUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
    let elementHover;
    if(divUnderMouse.id == "OverlayScene")
    {
        let pos = new THREE.Vector2(event.clientX, event.clientY);
        elementHover = overlay.raycastIntersection(pos);
    }else{
        elementHover = null;
    }
    
    overlay.updateCubeFaceHighlight(elementHover);
}

function castShadowRecursive(element)
{
    element.castShadow = true;
    if(element.children)
    {
        element.children.forEach(child => castShadowRecursive(child));
    }
}

function onGLTFLoad(gltf, pos = new THREE.Vector3(0,0,0), rot = new THREE.Vector3(0,0,0))
{
    gltf.scene.position.set(pos.x, pos.y, pos.z);
    gltf.scene.rotation.set(rot.x, rot.y, rot.z);
    gltf.scene.castShadow = true;
    castShadowRecursive(gltf.scene);
    objectGroup.add(gltf.scene);
    console.log(gltf);
}

function onEnvironmentMapLoad(texture)
{
    console.log("Adding Environment Map to scene");
    texture.mapping = THREE.EquirectangularReflectionMapping;    
    scene.background = texture;

    return texture;
}

function onReflectionMapLoad(texture)
{
    console.log("Adding Reflection Map to scene");
    texture.mapping = THREE.EquirectangularReflectionMapping;    
    scene.environment = texture;
    
    return texture;
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