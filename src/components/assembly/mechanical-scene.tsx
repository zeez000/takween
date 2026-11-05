"use client";
/* The Three.js renderer deliberately mutates external GPU objects and shared ref state outside React rendering. */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { assemblyTimeline, smoothstep, type AssemblySignal } from "@/lib/assembly-timeline";

type Props = {
  signal: RefObject<AssemblySignal>;
  telemetry: RefObject<HTMLDivElement | null>;
  mobile: boolean;
  onFailure: () => void;
};

function ring(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: .025, bevelThickness: .025, curveSegments: 48
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function makeResources() {
  const blade = new THREE.Shape();
  blade.moveTo(.25, .28);
  blade.bezierCurveTo(.6, .36, 1.12, .42, 1.24, .9);
  blade.lineTo(.96, 1.04);
  blade.bezierCurveTo(.76, .72, .4, .57, .1, .44);
  blade.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, {
    depth: .07, bevelEnabled: true, bevelSize: .018, bevelThickness: .018,
    bevelSegments: 2, curveSegments: 10, steps: 1
  });
  bladeGeometry.rotateY(Math.PI / 2);
  const shaft = new THREE.CylinderGeometry(.18, .18, 2.7, 24);
  shaft.rotateZ(Math.PI / 2);
  const hub = new THREE.ConeGeometry(.43, .65, 40);
  hub.rotateZ(-Math.PI / 2);
  const bolt = new THREE.CylinderGeometry(.065, .065, .12, 6);
  bolt.rotateZ(Math.PI / 2);
  return {
    geometry: {
      shell: ring(1.48, 1.17, .22), collar: ring(1.31, 1.05, .1),
      core: ring(.59, .22, .48), rotor: ring(.5, .19, .13),
      trace: new THREE.TorusGeometry(1.32, .018, 6, 64),
      rail: new THREE.BoxGeometry(1.45, .16, .25),
      blade: bladeGeometry, shaft, hub, bolt
    },
    material: {
      titanium: new THREE.MeshStandardMaterial({color: "#626b78", metalness: .72, roughness: .34}),
      dark: new THREE.MeshStandardMaterial({color: "#272d39", metalness: .7, roughness: .36}),
      edge: new THREE.MeshStandardMaterial({color: "#90959b", metalness: .94, roughness: .24}),
      red: new THREE.MeshStandardMaterial({color: "#b50818", emissive: "#ff1025", emissiveIntensity: 2.2, metalness: .3, roughness: .3})
    }
  };
}

type Resources = ReturnType<typeof makeResources>;
function Bolts({ resources, count = 10 }: { resources: Resources; count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      dummy.position.set(.15, Math.cos(angle) * 1.33, Math.sin(angle) * 1.33);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    }
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <instancedMesh ref={mesh} args={[resources.geometry.bolt, resources.material.edge, count]} />;
}

function Turbine({ signal, telemetry, mobile, onFailure }: Props) {
  const { camera, gl, invalidate } = useThree();
  const resources = useMemo(() => makeResources(), []);
  const root = useRef<THREE.Group>(null);
  const parts = useRef<(THREE.Group | null)[]>([]);
  const idle = useRef(0);
  const reset = useRef(0);
  const rotation = useRef({ yaw: 0, pitch: 0 });
  const zoom = useRef(1);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const labels = useRef<HTMLElement[]>([]);
  const home = useMemo(() => new THREE.Vector3(6.9, 3.3, 8.6).normalize(), []);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const {geometry:g, material:m} = resources;

  useEffect(() => {
    const state = signal.current;
    state.invalidate = invalidate;
    const canvas = gl.domElement;
    canvas.style.touchAction = "pan-y";
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    if (telemetry.current) {
      telemetry.current.dataset.ready = "true";
      labels.current = Array.from(telemetry.current.querySelectorAll<HTMLElement>(".tech-callout"));
    }
    invalidate();
    return () => {
      state.invalidate = null;
      canvas.removeEventListener("webglcontextlost", lost);
      Object.values(resources.geometry).forEach(geometry => geometry.dispose());
      Object.values(resources.material).forEach(material => material.dispose());
    };
  }, [gl, invalidate, onFailure, resources, signal, telemetry]);

  useFrame((_, delta) => {
    const state = signal.current;
    const {explosion:e, interactive} = assemblyTimeline(state.progress);
    const dt = Math.min(delta, .05);
    if (reset.current !== state.reset) {
      reset.current = state.reset;
      idle.current = 0;
    }
    if (state.visible && interactive && !state.interacting && !state.paused) idle.current += dt * .12;
    // User pose blends away at the beginning of disassembly, never fighting the timeline.
    const poseWeight = 1 - smoothstep(e / .25);
    if (e >= .25) { state.yaw = 0; state.pitch = 0; idle.current = 0; }
    rotation.current.yaw = THREE.MathUtils.damp(rotation.current.yaw, state.yaw, 10, dt);
    rotation.current.pitch = THREE.MathUtils.damp(rotation.current.pitch, state.pitch, 10, dt);
    zoom.current = THREE.MathUtils.damp(zoom.current, state.zoom, 8, dt);
    if (root.current) {
      root.current.rotation.set(.08 + rotation.current.pitch * poseWeight,
        -.22 + (rotation.current.yaw + Math.sin(idle.current) * .16) * poseWeight,
        (mobile ? Math.PI / 2 - .22 : -.25));
    }
    // Absolute, position-driven transforms. The same progress always returns the same pose.
    const distance = mobile ? .68 : 1;
    const base = [-.86, -.57, -.26, .05, .43, .66, .94];
    const travel = [-3.05, -1.85, -.95, 0, 1.1, 2.0, 3.2];
    for (let i = 0; i < 7; i++) {
      const part = parts.current[i];
      if (!part) continue;
      part.position.set(base[i] + travel[i] * e * distance, 0, 0);
      part.rotation.x = i === 3 ? -.35 * e : i === 2 ? .2 * e : 0;
    }
    for (let i = 0; i < 6; i++) {
      const part = parts.current[i + 7];
      const angle = i / 6 * Math.PI * 2;
      if (part) part.position.set((i % 2 ? -.25 : .25) * e,
        Math.cos(angle) * (1.34 + .8 * e * distance),
        Math.sin(angle) * (1.34 + .8 * e * distance));
    }
    // Aspect-aware framing includes the full exploded envelope on portrait screens.
    const aspect = (camera as THREE.PerspectiveCamera).aspect;
    const framing = mobile ? 10.4 + e * 3.6 : Math.max(10.8, 7.5 / aspect) + e * 5.1;
    camera.position.copy(home).multiplyScalar(framing * (1 + (zoom.current - 1) * poseWeight));
    camera.lookAt(target);
    root.current?.updateMatrixWorld(true);
    [0,3,6].forEach((partIndex,index) => {
      const part=parts.current[partIndex]; const label=labels.current[index];
      if (!part || !label) return;
      projected.set(0,index===1?-1.6:1.6,0); part.localToWorld(projected); projected.project(camera);
      label.style.left=`${(projected.x*.5+.5)*100}%`;
      label.style.top=`${(-projected.y*.5+.5)*100}%`;
    });
    const element = telemetry.current;
    if (element) {
      element.dataset.explosion = e.toFixed(4);
      element.dataset.frontX = (parts.current[6]?.position.x ?? 0).toFixed(4);
      element.dataset.rearX = (parts.current[0]?.position.x ?? 0).toFixed(4);
      element.dataset.yaw = rotation.current.yaw.toFixed(3);
      element.dataset.cameraDistance = camera.position.length().toFixed(3);
      element.dataset.drawCalls = String(gl.info.render.calls);
    }
    const settling = Math.abs(rotation.current.yaw - state.yaw) > .001 || Math.abs(rotation.current.pitch - state.pitch) > .001 || Math.abs(zoom.current - state.zoom) > .001;
    if (state.visible && ((interactive && !state.paused && !state.interacting) || settling)) invalidate();
  });

  return <>
    <ambientLight intensity={.7} />
    <directionalLight position={[-3, 2, 7]} intensity={3} color="#b5c8f1" />
    <directionalLight position={[3, 6, 5]} intensity={4.5} color="#f3f4ff" />
    <pointLight position={[-4, -1, 2]} intensity={28} color="#ff1433" distance={14} />
    <pointLight position={[2, 3, -4]} intensity={22} color="#ff2337" distance={15} />
    <Environment resolution={128} frames={1}>
      <Lightformer position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 2, 1]} intensity={4} />
      <Lightformer position={[3, 1, 5]} scale={[2, 6, 1]} intensity={3} />
      <Lightformer position={[-4, -1, -4]} scale={[3, 6, 1]} intensity={3} color="#ff2238" />
    </Environment>
    <group ref={root} dispose={null}>
      <mesh geometry={g.shaft} material={m.dark} />
      <group ref={node => {parts.current[0] = node;}} position={[-.86,0,0]}>
        <mesh geometry={g.shell} material={m.titanium}/><Bolts resources={resources}/>
      </group>
      <group ref={node => {parts.current[1] = node;}} position={[-.57,0,0]}><mesh geometry={g.collar} material={m.edge}/><mesh geometry={g.trace} material={m.red} rotation={[0,Math.PI/2,0]}/></group>
      <group ref={node => {parts.current[2] = node;}} position={[-.26,0,0]}><mesh geometry={g.core} material={m.titanium}/>{Array.from({length:8},(_,i)=><group rotation={[i/8*Math.PI*2,0,0]} key={i}><mesh geometry={g.rail} material={m.dark} position={[0,.8,0]} scale={[.15,5,.38]}/></group>)}</group>
      <group ref={node => {parts.current[3] = node;}} position={[.05,0,0]}>
        <mesh geometry={g.rotor} material={m.titanium}/>
        {Array.from({length:12},(_,i)=><mesh key={i} geometry={g.blade} material={i%3===0?m.edge:m.titanium} rotation={[i/12*Math.PI*2,0,0]}/>)}
      </group>
      <group ref={node => {parts.current[4] = node;}} position={[.43,0,0]}><mesh geometry={g.hub} material={m.titanium}/></group>
      <group ref={node => {parts.current[5] = node;}} position={[.66,0,0]}><mesh geometry={g.collar} material={m.dark}/><mesh geometry={g.trace} material={m.red} rotation={[0,Math.PI/2,0]}/></group>
      <group ref={node => {parts.current[6] = node;}} position={[.94,0,0]}>
        <mesh geometry={g.shell} material={m.titanium}/><Bolts resources={resources}/>
      </group>
      {Array.from({length:6},(_,i)=>{
        const angle=i/6*Math.PI*2;
        return <group key={i} ref={node=>{parts.current[i+7]=node;}} position={[0,Math.cos(angle)*1.34,Math.sin(angle)*1.34]} rotation={[angle,0,0]}><mesh geometry={g.rail} material={m.dark}/><mesh geometry={g.rail} material={m.red} scale={[.6,.12,.3]} position={[0,.095,0]}/></group>;
      })}
    </group>
  </>;
}

export default function MechanicalScene(props: Props) {
  return <Canvas
    frameloop="demand" dpr={props.mobile ? 1 : [1,1.5]}
    camera={{position:[6.9,3.3,8.6],fov:38,near:.1,far:60}}
    gl={{antialias:!props.mobile,alpha:true,powerPreference:"low-power"}}
    style={{touchAction:"pan-y"}}
    fallback={<p className="scene-loading">3D is unavailable. Use the static view below.</p>}
  ><Turbine {...props}/></Canvas>;
}
