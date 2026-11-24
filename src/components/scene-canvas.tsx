"use client";

import {createRoot, extend, type CanvasProps} from "@react-three/fiber";
import {Component, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {AmbientLight, BoxGeometry, CubeCamera, DirectionalLight, Group, HemisphereLight,
  InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, RingGeometry} from "three";

// These scenes handle gestures on their surrounding DOM surface. Register only
// their intrinsic elements instead of Canvas's entire THREE namespace catalogue.
extend({AmbientLight,BoxGeometry,CubeCamera,DirectionalLight,Group,HemisphereLight,
  InstancedMesh,Mesh,MeshBasicMaterial,PlaneGeometry,PointLight,RingGeometry});

type Props=Pick<CanvasProps,"children"|"camera"|"dpr"|"frameloop"|"gl"|"style"|"fallback"|"aria-hidden">;

class RenderBoundary extends Component<{children:ReactNode;onError:(error:unknown)=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){this.props.onError(error);}
  render(){return this.state.failed?null:this.props.children;}
}

export function SceneCanvas(props:Props) {
  const container=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const latest=useRef(props);
  const update=useRef<(()=>void)|null>(null);
  const [error,setError]=useState<unknown>(null);
  useLayoutEffect(()=>{latest.current=props;update.current?.();});
  useLayoutEffect(()=>{
    const element=container.current!,surface=canvas.current!;
    const renderer=createRoot(surface);
    let disposed=false,generation=0,rendered=false;
    const reportError=(reason:unknown)=>{if(!disposed)setError(()=>reason);};
    const renderScene=()=>{
      renderer.render(<RenderBoundary onError={reportError}>{latest.current.children}</RenderBoundary>);
      rendered=true;
    };
    const configure=()=>{
      const box=element.getBoundingClientRect();
      // Hidden containers must still receive pause/cleanup props, without
      // reconfiguring their camera to a zero-sized viewport.
      if(!box.width||!box.height){if(rendered)renderScene();return;}
      const ticket=++generation;
      const {camera,dpr,frameloop,gl}=latest.current;
      renderer.configure({camera,dpr,frameloop,gl,size:{width:box.width,height:box.height,top:box.top,left:box.left}})
        .then(()=>{if(!disposed&&ticket===generation)renderScene();})
        .catch(reportError);
    };
    update.current=configure;
    const observer=new ResizeObserver(configure);observer.observe(element);
    window.addEventListener("resize",configure,{passive:true});configure();
    return()=>{
      disposed=true;generation++;update.current=null;observer.disconnect();
      window.removeEventListener("resize",configure);renderer.unmount();
    };
  },[]);
  if(error)throw error;
  return <div ref={container} aria-hidden={props["aria-hidden"]}
    style={{position:"relative",width:"100%",height:"100%",overflow:"hidden",...props.style}}>
    <canvas ref={canvas} style={{display:"block",width:"100%",height:"100%"}}>{props.fallback}</canvas>
  </div>;
}
