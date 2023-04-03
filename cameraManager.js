import { 
    Spherical,
    Vector3 
} from "three";

export function onCameraMove(camera, overlay)
{
    overlay.setCameraAngle(camera);
}

export function onCameraOverlayMove(camera, overlayCam, controlsList)
{
    let currentCamSpherical = new Spherical();
    let newCamSpherical = new Spherical();
    currentCamSpherical.setFromCartesianCoords(camera.position.x, camera.position.y, camera.position.z);
    newCamSpherical.setFromCartesianCoords(overlayCam.position.x, overlayCam.position.y, overlayCam.position.z);
    newCamSpherical.radius = currentCamSpherical.radius;
    let camNewPos = new Vector3().setFromSpherical(newCamSpherical);
    camera.position.copy(camNewPos);
    camera.lookAt(0,0,0);
    updateControls(controlsList);
}

export function alignCameraWithView(camera, overlay, newDirection, controlsList)
{
    let newCameraAngle = new Spherical();
    newCameraAngle.setFromCartesianCoords(newDirection.x, newDirection.y, newDirection.z);
    let currentCamAngle = new Spherical();
    currentCamAngle.setFromCartesianCoords(camera.position.x, camera.position.y, camera.position.z);
    newCameraAngle.radius = currentCamAngle.radius;
    let camNewPos = new Vector3().setFromSpherical(newCameraAngle);
    camera.position.copy(camNewPos);
    camera.lookAt(0,0,0);
    onCameraMove(camera, overlay); //to update the overlay camera position
    updateControls(controlsList);
}

function updateControls(controlsList)
{
    controlsList.forEach( (controls) => controls.update());
}