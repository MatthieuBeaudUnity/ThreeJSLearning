import {
    EquirectangularReflectionMapping, 
    Vector3
    } from "three"

function castShadowRecursive(element)
{
    element.castShadow = true;
    if(element.children)
    {
        element.children.forEach(child => castShadowRecursive(child));
    }
}

export function onGLTFLoad(objectGroup, gltf, pos = new Vector3(0,0,0), rot = new Vector3(0,0,0))
{
    gltf.scene.position.set(pos.x, pos.y, pos.z);
    gltf.scene.rotation.set(rot.x, rot.y, rot.z);
    gltf.scene.castShadow = true;
    castShadowRecursive(gltf.scene);
    objectGroup.add(gltf.scene);
    console.log(gltf);
}

export function onEnvironmentMapLoad(scene, texture)
{
    console.log("Adding Environment Map to scene");
    texture.mapping = EquirectangularReflectionMapping;    
    scene.background = texture;

    return texture;
}

export function onReflectionMapLoad(scene, texture)
{
    console.log("Adding Reflection Map to scene");
    texture.mapping = EquirectangularReflectionMapping;    
    scene.environment = texture;
    
    return texture;
}