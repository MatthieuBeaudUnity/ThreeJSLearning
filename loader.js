import {
    EquirectangularReflectionMapping, 
    Vector3
    } from "three"

import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"
import {RGBELoader} from "three/addons/loaders/RGBELoader.js"

const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

function castShadowRecursive(element)
{
    element.castShadow = true;
    if(element.children)
    {
        element.children.forEach(child => castShadowRecursive(child));
    }
}

function onGLTFLoad(gltf, objectGroupToAddTo, pos = new Vector3(0,0,0), rot = new Vector3(0,0,0))
{
    gltf.scene.position.set(pos.x, pos.y, pos.z);
    gltf.scene.rotation.set(rot.x, rot.y, rot.z);
    gltf.scene.castShadow = true;
    castShadowRecursive(gltf.scene);
    console.log(gltf);
    objectGroupToAddTo.add(gltf.scene);
}

function onCubeMapLoad(texture)
{
    texture.mapping = EquirectangularReflectionMapping; 
    return texture;
}

export function addGLTFToScene(folderPath, fileName, objectGroupToAddTo, pos = new Vector3(0,0,0), rot = new Vector3(0,0,0))
{
    gltfLoader.setPath(folderPath);
    gltfLoader.load(fileName, gltf => onGLTFLoad(gltf, objectGroupToAddTo, pos, rot));
}

export function loadCubemapTexture(path)
{
    return rgbeLoader.load(path, (texture) => onCubeMapLoad(texture));
}