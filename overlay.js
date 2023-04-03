"use strict" 

import * as THREE from "three"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {raycastIntersection} from "mouseEvents"

const xDir = new THREE.Vector3(1,0,0);
const yDir = new THREE.Vector3(0,1,0);
const zDir = new THREE.Vector3(0,0,1);
const CAM_DIST_TO_ORIGIN = 3.2;


export class Overlay{
    renderer;
    scene;
    camera;
    cube;
    currentHoverFaceID = null;
    axisGroup;
    lightGroup;
    controls;

    constructor(parentDivID, onCameraMoveCallback)
    {
        this.scene = new THREE.Scene();
        this.scene.name = "SceneOverlay";
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

        const overlayDiv = document.getElementById(parentDivID);
        this.renderer = new THREE.WebGLRenderer({alpha: true});
        this.renderer.setSize(overlayDiv.clientWidth, overlayDiv.clientHeight);
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.domElement.id = "OverlayScene";
        this.renderer.setClearColor(0x000000, 0); //transparent background
        overlayDiv.append(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.rotateSpeed = 0.15;
        this.controls.addEventListener('change', () => onCameraMoveCallback(this.camera));

        let cubeGeom = new THREE.BoxGeometry(1,1,1);
        let cubeBaseMat = new THREE.MeshStandardMaterial({color: 0xFFFFFF, transparent: true, opacity: 0.6});
        let cubeXMat = new THREE.MeshBasicMaterial({color: 0xFF0000, transparent: true, opacity: 0.8});
        let cubeYMat = new THREE.MeshBasicMaterial({color: 0x00FF00, transparent: true, opacity: 0.8});
        let cubeZMat = new THREE.MeshBasicMaterial({color: 0x0000FF, transparent: true, opacity: 0.8});
        this.cube = new THREE.Mesh(cubeGeom, [cubeBaseMat, cubeXMat, cubeYMat, cubeZMat]);
        this.cube.name = "cubeOverlay";
        this.cube.geometry.groups.forEach( group => {
            group.materialIndex = 0;
        })

        let light1 = new THREE.DirectionalLight();
        light1 .position.x = 1.2;
        light1 .position.y = 3.5;
        light1 .position.z = 1.8;
        light1 .intensity = 2;

        let light2 = new THREE.DirectionalLight();
        light2.position.x = -1.2;
        light2.position.y = -3.5;
        light2.position.z = -1.8;
        light2.intensity = 2;

        const originOffset = new THREE.Vector3(-0.5, -0.5, -0.5);
        let xAxis = new THREE.ArrowHelper(xDir, originOffset, 1.6, 0xFF0000, 0.3, 0.2);
        xAxis.name = "X Axis";
        xAxis.line.name = "X Axis Line";
        xAxis.cone.name = "X Axis Cone";
        let yAxis = new THREE.ArrowHelper(yDir, originOffset, 1.6, 0x00FF00, 0.3, 0.2);
        yAxis.name = "Y Axis";
        yAxis.line.name = "Y Axis Line";
        yAxis.cone.name = "Y Axis Cone";
        let zAxis = new THREE.ArrowHelper(zDir, originOffset, 1.6, 0x0000FF, 0.3, 0.2);
        zAxis.name = "Z Axis";
        zAxis.line.name = "Z Axis Line";
        zAxis.cone.name = "Z Axis Cone";

        this.axisGroup = new THREE.Group();
        this.axisGroup.name = "AxisGroup";
        this.axisGroup.add(xAxis);
        this.axisGroup.add(yAxis);
        this.axisGroup.add(zAxis);

        this.lightGroup = new THREE.Group();
        this.lightGroup.name = "LightGroup";
        this.lightGroup.add(light1);
        this.lightGroup.add(light2);

        this.scene.add(this.cube);
        this.scene.add(this.axisGroup);
        this.scene.add(this.lightGroup);

        this.render();
    }

    render()
    {
        this.renderer.render(this.scene, this.camera);
    }

    resize()
    {
        const overlayDiv = this.renderer.domElement.parentElement;
        this.renderer.setSize(overlayDiv.clientWidth, overlayDiv.clientHeight);
    }

    onMouseClick(clientPos, cubeFaceHitCallback)
    {
        const closestHit = this.checkForIntersection(clientPos);
        if(closestHit != null)
        {
            cubeFaceHitCallback(closestHit.face.normal);
            return true;
        }
        return false;
    }

    setCameraAngle(otherCamera)
    {
        let camAngle = new THREE.Spherical();
        camAngle.setFromCartesianCoords(otherCamera.position.x, otherCamera.position.y, otherCamera.position.z);
        camAngle.radius = CAM_DIST_TO_ORIGIN;
        let camOverlayNewPos = new THREE.Vector3().setFromSpherical(camAngle);
        this.camera.position.copy(camOverlayNewPos);
        this.camera.lookAt(0,0,0);
    }

    updateCubeFaceHighlight(elementHovered)
    {
        if (elementHovered==null || elementHovered.object != this.cube) //reset all faces to base material
        {
            if(this.currentHoverFaceID==null){return;}   //faces already have base material
            this.currentHoverFaceID = null;              //else do the reset
            this.cube.geometry.groups.forEach(f => 
                {
                    f.materialIndex=0;
                });
            return;
        }
        let newHoverFaceID = this.#getCubeFaceIDFromNormal(elementHovered.face.normal);
        if(newHoverFaceID == this.currentHoverFaceID){return;} //no need to change anything
        if(this.currentHoverFaceID != null)
        {
            this.cube.geometry.groups[this.currentHoverFaceID].materialIndex = 0;
        }
        this.cube.geometry.groups[newHoverFaceID].materialIndex = Math.floor(newHoverFaceID/2) +1;
        this.currentHoverFaceID = newHoverFaceID;
    }

    checkForIntersection(clientPos)
    {
        const overlayRect = this.renderer.domElement.getBoundingClientRect();

        let posCS = new THREE.Vector2((clientPos.x-overlayRect.x) / overlayRect.width,
                                    -(clientPos.y-overlayRect.y) / overlayRect.height);
        posCS.x = posCS.x*2 -1;
        posCS.y = posCS.y*2 +1;

        return raycastIntersection(posCS, this.camera, [this.cube]);
    }
    
    #getCubeFaceIDFromNormal(normal)
    {
        if(normal==null){return null;}
        if(normal.x ==1){return 0;}
        if(normal.x == -1){return 1;}
        if(normal.y == 1){return 2;}
        if(normal.y == -1){return 3;}
        if(normal.z == 1){return 4;}
        if(normal.z == -1){return 5;}
    }

    
}
