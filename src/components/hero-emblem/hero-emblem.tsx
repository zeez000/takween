"use client";

import dynamic from "next/dynamic";
import {Component, useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode} from "react";
import {emblemContours} from "./outline";
import "./hero-emblem.css";

const EmblemScene = dynamic(() => import("./emblem-scene"), {ssr: false});
const neutral = {pitch: 0, yaw: 0};
const limitYaw = (yaw: number) => Math.max(-.6, Math.min(.6, yaw));

class EmblemBoundary extends Component<{children: ReactNode; onFailure: () => void}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function HeroEmblem() {
  const frame = useRef<HTMLDivElement>(null);
  const displayedPose = useRef({...neutral});
  const gesture = useRef<{x: number; y: number; id: number; pose: typeof neutral; active: boolean} | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [manual, setManual] = useState(false);
  const [pose, setPose] = useState(neutral);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setFailed(true), []);
  const onPose = useCallback((pitch: number, yaw: number) => {
    displayedPose.current = {pitch, yaw};
  }, []);

  useEffect(() => {
    const element = frame.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let idleRequest = 0;
    let supported: boolean | undefined;
    const cancel = () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleRequest);
      else window.clearTimeout(idleRequest);
    };
    const update = () => {
      cancel();
      if (!visible || motion.matches || document.hidden || document.querySelector(".entry-screen[open]")) {
        setEnabled(false);
        setReady(false);
        return;
      }
      const load = () => {
        // The entry dialog may have opened while the idle callback was pending.
        if (document.querySelector(".entry-screen[open]")) return;
        if (supported === undefined) {
          try {
            const context = document.createElement("canvas").getContext("webgl2");
            supported = Boolean(context);
            context?.getExtension("WEBGL_lose_context")?.loseContext();
          } catch { supported = false; }
        }
        if (supported) setEnabled(true);
      };
      idleRequest = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(load, {timeout: 1800})
        : window.setTimeout(load, 0);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= .12;
      update();
    }, {threshold: .12});
    observer.observe(element);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("takween:entered", update);
    return () => {
      observer.disconnect();
      cancel();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("takween:entered", update);
    };
  }, []);

  const interactive = enabled && ready && !failed;

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !event.isPrimary || event.button !== 0) return;
    gesture.current = {
      x: event.clientX, y: event.clientY, id: event.pointerId, pose: {...displayedPose.current}, active: event.pointerType === "mouse",
    };
    if (event.pointerType === "mouse") {
      setPose({...displayedPose.current});
      setManual(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        gesture.current = null;
        return;
      }
      if (Math.abs(dx) < 8) return;
      drag.active = true;
      drag.pose = {...displayedPose.current};
      setManual(true);
    }
    setPose({
      yaw: limitYaw(drag.pose.yaw + dx * .006),
      pitch: Math.max(-.25, Math.min(.25, drag.pose.pitch + (event.pointerType === "mouse" ? dy * .003 : 0))),
    });
  }

  function turn(direction: number) {
    setManual(true);
    setPose(previous => {
      const origin = manual ? previous : displayedPose.current;
      return {...origin, yaw: limitYaw(origin.yaw + direction * .2)};
    });
  }

  return <div ref={frame} className="part-scene hero-emblem" role="group" aria-label="TAKWEEN LABS layered T emblem">
    <div className="scene-cross cross-a" aria-hidden="true"/>
    <div className="scene-cross cross-b" aria-hidden="true"/>
    <div className="scene-topline" aria-hidden="true"><span>FORM STUDY / 001</span><span>ILLUSTRATION</span></div>
    <div className="emblem-contact-shadow" aria-hidden="true"/>
    <div className="emblem-view" data-testid="hero-emblem-view" data-ready={interactive} data-yaw={pose.yaw.toFixed(3)}
      onPointerDown={start} onPointerMove={move} onPointerUp={()=>{gesture.current=null;}}
      onPointerCancel={()=>{gesture.current=null;}} onLostPointerCapture={()=>{gesture.current=null;}}>
      {!interactive && <svg className="emblem-fallback" viewBox="187 564 389 410" role="img" aria-label="Red layered T monogram">
        {emblemContours.map((contour, index) => <polygon key={index}
          points={contour.map(point => point.join(",")).join(" ")} fill="#ed203b"/>)}
      </svg>}
      {enabled && !failed && <div className="emblem-canvas">
        <EmblemBoundary onFailure={onFailure}>
          <EmblemScene pitch={pose.pitch} yaw={pose.yaw} idle={!manual} onPose={onPose} onReady={onReady} onFailure={onFailure}/>
        </EmblemBoundary>
      </div>}
    </div>
    {interactive && <div className="emblem-controls" role="group" aria-label="Hero emblem controls">
      <button type="button" onClick={()=>turn(-1)} aria-label="Rotate emblem left">←</button>
      <button type="button" onClick={()=>turn(1)} aria-label="Rotate emblem right">→</button>
      <button type="button" onClick={()=>{setManual(true);setPose(neutral);}}>Reset emblem</button>
    </div>}
    <div className="scene-baseline" aria-hidden="true"><span><i/> LAYER BY LAYER</span><span>FDM / PLA + PETG</span></div>
  </div>;
}
