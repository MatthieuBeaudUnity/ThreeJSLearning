import { 
    Raycaster, 
    Vector2
} from "three";

const MOUSE_MIN_DRAG_DIST = 10;

const raycaster = new Raycaster();

function onMouseClick(clientPos, camera, objectGroupToIntersect, overlay, alignCameraWithViewFunction, selectionPoint)
{
    let posCS = new Vector2(clientPos.x / window.innerWidth, - clientPos.y / window.innerHeight);
    posCS.x = posCS.x*2 -1;
    posCS.y = posCS.y*2 +1;
    let mainSceneIntersection = raycastIntersection(posCS, camera, objectGroupToIntersect);
    if(!overlay.onMouseClick(clientPos, alignCameraWithViewFunction))
    {
        updateSelectionPoint(mainSceneIntersection, selectionPoint);
    }
}

export function onMouseDown(event, pointerDownPosition)
{
    pointerDownPosition.x = event.x;
    pointerDownPosition.y = event.y;
}

export function onMouseUp(event, camera, objectGroupToIntersect, pointerDownPosition, overlay, alignCameraWithViewFunction, selectionPoint)
{
    let pos = new Vector2(event.clientX, event.clientY);
    if (pointerDownPosition.distanceTo(pos) < MOUSE_MIN_DRAG_DIST)
    {
        onMouseClick(pos, camera, objectGroupToIntersect, overlay, alignCameraWithViewFunction, selectionPoint);
    }
}

export function onMouseMove(event, overlay)
{
    if(event.buttons == 1){return} //mouse is down

    const divUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
    let elementHover;
    if(divUnderMouse.id == "OverlayScene")
    {
        let pos = new Vector2(event.clientX, event.clientY);
        elementHover = overlay.checkForIntersection(pos);
    }else{
        elementHover = null;
    }
    
    overlay.updateCubeFaceHighlight(elementHover);
}

export function raycastIntersection(positionCS, cam, objectGroupToIntersect)
{
    raycaster.setFromCamera( positionCS, cam);

    // compute objects intersecting the picking ray
	let intersects = raycaster.intersectObjects( objectGroupToIntersect );
    if( intersects.length==0)
    {
        return null;
    }
    return intersects[0];
}

export function updateSelectionPoint(mainSceneIntersection, selectionPoint)
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