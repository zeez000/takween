"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type PointerEvent } from "react";
import { PartVisual } from "@/components/part-visual";
import { assemblyTimeline, clamp01, createAssemblySignal } from "@/lib/assembly-timeline";

const MechanicalScene = dynamic(() => import("./mechanical-scene"), {
  ssr: false, loading: () => <div className="scene-loading" role="status">Preparing the assembly…</div>
});

function useMedia(query: string) {
  const subscribe = useCallback((callback: () => void) => {
    const media = matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  }, [query]);
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}

class SceneBoundary extends Component<{children: ReactNode; onFailure: () => void}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function AssemblyExperience() {
  const chapter = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const telemetry = useRef<HTMLDivElement>(null);
  const signal = useRef(createAssemblySignal());
  const drag = useRef<{x: number; y: number; yaw: number; pitch: number; engaged: boolean} | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [staticView, setStaticView] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(max-width: 760px)");
  const fallback = reduced || failed || staticView;
  const fail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const driverState = signal.current;
    const section = chapter.current;
    const sticky = stage.current;
    if (!section || !sticky) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const header = document.querySelector(".header")?.getBoundingClientRect().height ?? 88;
      const progress = fallback ? 0 : clamp01((header - rect.top) / Math.max(1, rect.height - sticky.offsetHeight));
      const timeline = assemblyTimeline(progress);
      signal.current.progress = progress;
      signal.current.visible = !document.hidden && rect.bottom > header && rect.top < innerHeight;
      if (!timeline.interactive) { signal.current.interacting = false; drag.current = null; }
      section.dataset.phase = timeline.phase;
      section.style.setProperty("--sequence-progress", String(progress));
      if (telemetry.current) telemetry.current.dataset.progress = progress.toFixed(4);
      setInteractive(previous => previous === timeline.interactive ? previous : timeline.interactive);
      signal.current.invalidate?.();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || fallback || document.querySelector(".entry-screen[open]")) return;
      // Probe before mounting Three so unsupported WebGL produces a quiet fallback.
      const probe = document.createElement("canvas");
      try {
        const context = probe.getContext("webgl2");
        if (!context) { setFailed(true); return; }
        context.getExtension("WEBGL_lose_context")?.loseContext();
        setLoaded(true);
      } catch { setFailed(true); }
      observer.disconnect();
    });
    observer.observe(section);
    const entered = () => { observer.unobserve(section); observer.observe(section); };
    window.addEventListener("takween:entered", entered);
    const resize = new ResizeObserver(schedule);
    resize.observe(section);
    window.addEventListener("scroll", schedule, {passive: true});
    window.addEventListener("resize", schedule, {passive: true});
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("takween:entered", entered);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      driverState.visible = false;
    };
  }, [fallback]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || fallback || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = {x:event.clientX, y:event.clientY, yaw:signal.current.yaw, pitch:signal.current.pitch, engaged:false};
    // Pause idle immediately; touch remains available for vertical page gestures.
    signal.current.interacting = true;
    signal.current.invalidate?.();
    if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || !interactive) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (event.pointerType !== "mouse" && !start.engaged) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag.current=null; signal.current.interacting=false; return; }
      if (Math.abs(dx) < 8) return;
    }
    start.engaged = true;
    signal.current.yaw = start.yaw + dx * .008;
    signal.current.pitch = Math.max(-.5, Math.min(.5, start.pitch + (event.pointerType === "mouse" ? dy * .004 : 0)));
    signal.current.invalidate?.();
  }
  function pointerEnd() {
    drag.current=null; signal.current.interacting=false; signal.current.invalidate?.();
  }
  function reset() {
    Object.assign(signal.current, {yaw:0,pitch:0,zoom:1});
    signal.current.reset++; signal.current.invalidate?.();
  }
  function turn(amount: number) { signal.current.yaw += amount; signal.current.invalidate?.(); }
  function zoom(amount: number) { signal.current.zoom=Math.max(.88,Math.min(1.15,signal.current.zoom+amount));signal.current.invalidate?.(); }

  return <section id="assembly" ref={chapter} className={`assembly-chapter ${fallback ? "assembly-static" : ""}`} data-phase="assembled" aria-labelledby="assembly-title">
    <div className="assembly-stage" ref={stage}>
      <div className="assembly-grid" aria-hidden="true"/><div className="assembly-scan" aria-hidden="true"/>
      <div className="assembly-editorial">
        <p className="eyebrow">TAKWEEN / ENGINEERING IN MOTION</p>
        <h2 id="assembly-title">FROM IDEA<br/><span>TO OBJECT.</span></h2>
        <p className="assembly-subtitle">An original mechanical study.<br/>One form. Many considered parts.</p>
      </div>
      <a href="#about" className="assembly-skip">Skip 3D story ↓</a>
      <div className="assembly-viewport" ref={telemetry} data-testid="assembly-view" data-ready="false" role="group" aria-label="Interactive mechanical assembly" aria-describedby="assembly-instructions" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
        {!fallback && <div className="assembly-labels" aria-hidden="true"><div className="tech-callout"><span>01 / CASING</span>Segmented outer shell</div><div className="tech-callout"><span>02 / ROTOR</span>Twelve sculpted vanes</div><div className="tech-callout"><span>03 / RETAINER</span>Machined-face ring</div></div>}
        {fallback ? <div className="assembly-fallback"><PartVisual/><p role="status">{reduced ? "Reduced motion: static illustration." : failed ? "3D is unavailable on this device. Static illustration shown." : "Static illustration selected."} All website features remain available.</p></div>
          : loaded ? <SceneBoundary onFailure={fail}><MechanicalScene signal={signal} telemetry={telemetry} mobile={mobile} onFailure={fail}/></SceneBoundary>
          : <div className="scene-loading"><span className="loading-ring"/><p>Scroll to discover the assembly.</p></div>}
      </div>
      <div className="assembly-story" aria-live="off">
        <div className="story-assembled"><span>01 / THE WHOLE</span><h3>Engineered to exist.</h3><p>Scroll to look beneath the surface.</p></div>
        <div className="story-explode"><span>02 / THE DETAIL</span><h3>Every part has a purpose.</h3><p>Follow the construction, one component at a time.</p></div>
        <div className="story-inspect"><span>03 / THE POSSIBILITIES</span><h3>Understand. Refine. Make.</h3><p>For your project, we review geometry, material and intended use before quoting.</p></div>
        <div className="story-reassemble"><span>04 / THE OBJECT</span><h3>Details become a whole.</h3><p>Bring your next idea into the conversation.</p></div>
      </div>
      <div className="assembly-bottom">
        <p id="assembly-instructions">{fallback ? "A visual study, not a completed print." : interactive ? "Drag to rotate · swipe horizontally on touch · scroll to explore" : "Scroll controls the assembly · drag resumes when assembled"}</p>
        {!fallback && <div className="assembly-controls" aria-label="3D view controls">
          <button type="button" disabled={!interactive} onClick={()=>turn(-.3)} aria-label="Rotate left">←</button>
          <button type="button" disabled={!interactive} onClick={()=>turn(.3)} aria-label="Rotate right">→</button>
          <button type="button" disabled={!interactive} onClick={()=>zoom(-.06)} aria-label="Zoom in">+</button>
          <button type="button" disabled={!interactive} onClick={()=>zoom(.06)} aria-label="Zoom out">−</button>
          <button type="button" disabled={!interactive} onClick={reset}>Reset view</button>
          <button type="button" aria-pressed={paused} onClick={()=>{signal.current.paused=!paused;setPaused(!paused);signal.current.invalidate?.();}}>{paused?"Resume motion":"Pause motion"}</button>
          <button type="button" onClick={()=>setStaticView(true)}>Static view</button>
        </div>}
      </div>
      <div className="assembly-disclaimer">PROCEDURAL CONCEPT / METAL FINISH IS ILLUSTRATIVE / CUSTOM PLASTIC FDM IS OUR PLANNED SERVICE</div>
      <div className="assembly-progress" aria-hidden="true"/>
      <noscript><p>The interactive story requires JavaScript. Continue below to explore services and prepare your project brief.</p></noscript>
    </div>
  </section>;
}
