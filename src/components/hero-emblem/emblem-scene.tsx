"use client";

import {useFrame, useThree} from "@react-three/fiber";
import {SceneCanvas as Canvas} from "@/components/scene-canvas";
import {useEffect, useMemo, useRef} from "react";
import {ExtrudeGeometry, Group, MeshStandardMaterial, Shape} from "three";
import {emblemContours} from "./outline";

type SceneProps = {
  active: boolean;
  pitch: number;
  yaw: number;
  idle: boolean;
  onPose: (pitch: number, yaw: number) => void;
  onReady: () => void;
  onFailure: () => void;
};

function Emblem({active, pitch, yaw, idle, onPose, onReady, onFailure}: SceneProps) {
  const group = useRef<Group>(null);
  const idleTime = useRef(0);
  const tick = useRef<number | undefined>(undefined);
  const {gl, invalidate, size} = useThree();
  const geometries = useMemo(() => emblemContours.map((contour, index) => {
    const outline = new Shape();
    contour.forEach(([x, y], point) => {
      const px = (x - 381.5) / 120;
      const py = (769 - y) / 120;
      if (point === 0) outline.moveTo(px, py);
      else outline.lineTo(px, py);
    });
    outline.closePath();
    const depth = index === 0 ? .16 : index === 1 ? .14 : .12;
    const geometry = new ExtrudeGeometry(outline, {
      depth, steps: 1, bevelEnabled: true, bevelSize: .006, bevelThickness: .008, bevelSegments: 2,
    });
    geometry.translate(0, 0, -depth);
    return geometry;
  }), []);
  const materials = useMemo(() => {
    const face = new MeshStandardMaterial({color: "#ef1938", roughness: .66, metalness: .08});
    const edge = new MeshStandardMaterial({color: "#b51b32", roughness: .65, metalness: .08});
    // Fine build lines on the extrusion walls. The traced front face stays clean.
    edge.onBeforeCompile = shader => {
      shader.vertexShader = "varying float vBuildDepth;\n" + shader.vertexShader
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBuildDepth = position.z;");
      shader.fragmentShader = "varying float vBuildDepth;\n" + shader.fragmentShader
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= 0.965 + 0.035 * cos(vBuildDepth * 370.0);");
    };
    return [face, edge];
  }, []);

  useEffect(() => {
    gl.domElement.addEventListener("webglcontextlost", onFailure);
    onReady();
    return () => gl.domElement.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure, onReady]);

  useEffect(() => () => {
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }, [geometries, materials]);

  useEffect(() => {
    if (!active) return;
    invalidate();
    // Bound idle GPU work and keep easing alive until the exact target is drawn.
    tick.current = window.setInterval(invalidate, 1000 / 30);
    return () => window.clearInterval(tick.current);
  }, [active, pitch, yaw, idle, invalidate]);

  useFrame((_, delta) => {
    if (!active) return;
    if (!group.current) return;
    // One render loop, slow front-centred motion, no jump after a suspended frame.
    const dt = Math.min(delta, .05);
    if (idle) idleTime.current += dt;
    const targetYaw = idle ? Math.sin(idleTime.current * (Math.PI / 12)) * .21 : yaw;
    const targetPitch = idle ? 0 : pitch;
    const rotation = group.current.rotation;
    const blend = 1 - Math.exp(-12 * dt);
    rotation.x += (targetPitch - rotation.x) * blend;
    rotation.y += (targetYaw - rotation.y) * blend;
    const settled = Math.abs(targetPitch - rotation.x) + Math.abs(targetYaw - rotation.y) < .0001;
    if (!idle && settled) rotation.set(targetPitch, targetYaw, 0);
    onPose(rotation.x, rotation.y);
    if (!idle && settled) window.clearInterval(tick.current);
  });

  return <>
    <hemisphereLight args={["#fff6f3", "#44202a", 1.8]}/>
    <directionalLight position={[-3, 4, 6]} intensity={2} color="#fff4ef"/>
    <directionalLight position={[4, 1, 5]} intensity={1.3} color="#fff0f0"/>
    <directionalLight position={[2, 3, -4]} intensity={1.4} color="#ff6575"/>
    <group ref={group} scale={Math.min(1, size.width / (size.height * .78))} dispose={null}>
      {geometries.map((geometry, index) => <mesh key={index} geometry={geometry} material={materials}/>)}
    </group>
  </>;
}

export default function EmblemScene(props: SceneProps) {
  return <Canvas
    camera={{position: [0, 0, 7.8], fov: 34}}
    dpr={[1, 1.25]}
    frameloop="demand"
    gl={{alpha: true, antialias: true, powerPreference: "low-power"}}
    aria-hidden="true"
  >
    <Emblem {...props}/>
  </Canvas>;
}
