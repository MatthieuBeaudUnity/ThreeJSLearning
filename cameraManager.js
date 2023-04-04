import { 
    Spherical,
    Vector3 
} from "three";

export class CameraManager
{
    mainSceneCamera;
    overlayCamera;
    mainSceneControlsList;

    constructor(mainCameraInstance, overlayCameraInstance, mainSceneControls)
    {
        this.mainSceneCamera = mainCameraInstance;
        this.overlayCamera = overlayCameraInstance;
        this.mainSceneControlsList = mainSceneControls;
    };

    onMainCameraMove()
    {
        this.#alignCameraWithDirection(this.overlayCamera, this.mainSceneCamera.position);
    }

    onOverlayCameraMove()
    {
        this.#alignCameraWithDirection(this.mainSceneCamera, this.overlayCamera.position)
        this.#updateMainSceneControls();
    }

    #alignCameraWithDirection(cam, direction)
    {
        let newCameraAngle = new Spherical();
        newCameraAngle.setFromCartesianCoords(direction.x, direction.y, direction.z);
        let currentCamAngle = new Spherical();
        currentCamAngle.setFromCartesianCoords(cam.position.x, cam.position.y, cam.position.z);
        newCameraAngle.radius = currentCamAngle.radius;
        let camNewPos = new Vector3().setFromSpherical(newCameraAngle);
        cam.position.copy(camNewPos);
        cam.lookAt(0,0,0);
    }

    alignMainCameraWithDirection(direction)
    {
        this.#alignCameraWithDirection(this.mainSceneCamera, direction);
        this.onMainCameraMove(); //to update the overlay camera position
        this.#updateMainSceneControls();
    }

    #updateMainSceneControls()
    {
        this.mainSceneControlsList.forEach( (controls) => controls.update());
    }
}
