export function PartVisual() {
  return <div className="part-scene" aria-hidden="true">
    <div className="scene-cross cross-a"/><div className="scene-cross cross-b"/>
    <div className="scene-topline"><span>FORM STUDY / 001</span><span>ILLUSTRATION</span></div>
    <div className="part-orbit"/><div className="part-orbit orbit-two"/>
    <div className="part-stack">{Array.from({length:22},(_,index)=><div className="part-layer" key={index} style={{top:`${index*5}px`,transform:`rotate(${index*2.1-22}deg)`,zIndex:22-index}}/>)}</div>
    <div className="scene-baseline"><span><i/> LAYER BY LAYER</span><span>FDM / PLA + PETG</span></div>
  </div>;
}
