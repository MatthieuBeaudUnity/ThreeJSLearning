import { OrbitControls,Environment,PerspectiveCamera, GizmoViewcube, GizmoHelper } from "@react-three/drei";
import { useThree, useFrame } from '@react-three/fiber'

const Experience = () =>
{
    return (
        <>
            <OrbitControls makeDefault enableDamping = {false}>
            </OrbitControls>
            <Environment 
                files={'modern_buildings_1k.hdr'} 
                path="/domes/" 
                background={true} 
                ground = {{
                    height: 15, // Height of the camera that was used to create the env map (Default: 15)
                    radius: 90, // Radius of the world. (Default 60)
                    scale: 100, // Scale of the backside projected sphere that holds the env texture (Default: 1000)
                  }}
            />
            <directionalLight
                castShadow
                position={[0,10,0]}
                intensity={1.5}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-far={50}
                shadow-camera-left = {-10}
                shadow-camera-right = {10}
                shadow-camera-top = {10}
                shadow-camera-bottom = {-10}
            />
            <mesh name="cube" castShadow position={[0, 1, 0]}>
                <boxGeometry/>
                <meshNormalMaterial/>
            </mesh>
            <mesh name="ground" receiveShadow rotation={[-Math.PI/2, 0,0]} postition={[0,0.2, 0]}>
                <planeGeometry args={[170,170]}/>
                <shadowMaterial opacity={1}/>
            </mesh>
            <GizmoHelper
                alignment="bottom-left" // widget alignment within scene
                margin={[100,100]} // widget margins (X, Y)
            >
                <GizmoViewcube 
                textColor="black"
                color = "rgb(150,150,150)"
                hoverColor="rgb(100, 100, 100)"
                opacity={0.8}
                strokeColor= "rgb(200,200,200)"
                faces={["", "", "", "", "", ""]} />
            </GizmoHelper>
        </>
    );
};


export default Experience;