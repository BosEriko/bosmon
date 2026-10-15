"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { Direction, keyAction, keyDirection } from "@/lib/controls";
import styles from "./GameScreen.module.css";
export default function GameControls({
  onDirection,
  onConfirm,
  onBack,
  mode,
  enabled,
}: {
  onDirection: (dx: number, dy: number, run?: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  mode: string;
  enabled: boolean;
}) {
  const callbacks = useRef({ onDirection, onConfirm, onBack, enabled });
  const held = useRef<{ source: string; direction: Direction } | null>(null);
  const running = useRef(false);
  const lastStep = useRef(0);
  const [pressed, setPressed] = useState<string | null>(null);
  useEffect(() => {
    callbacks.current = { onDirection, onConfirm, onBack, enabled };
  }, [onDirection, onConfirm, onBack, enabled]);
  const stop = () => {
    held.current = null;
    setPressed(null);
  };
  useEffect(() => {
    held.current = null;
    setPressed(null);
  }, [mode, enabled]);
  useEffect(() => {
    const isEditing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    const down = (event: KeyboardEvent) => {
      if (event.key === "Shift") running.current = true;
      if (
        !callbacks.current.enabled ||
        isEditing(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const direction = keyDirection(event.key),
        action = keyAction(event.key);
      if (!direction && !action) return;
      event.preventDefault();
      if (event.repeat) return;
      if (direction) {
        held.current = { source: event.code || event.key, direction };
        running.current = event.shiftKey;
        lastStep.current = performance.now();
        callbacks.current.onDirection(
          direction[0],
          direction[1],
          running.current,
        );
      }
      if (action === "confirm") callbacks.current.onConfirm();
      if (action === "back") callbacks.current.onBack();
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Shift") running.current = false;
      if (held.current?.source === (event.code || event.key)) stop();
    };
    const focus = (event: FocusEvent) => {
      if (isEditing(event.target)) stop();
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    const timer = setInterval(() => {
      const now = performance.now();
      if (
        !held.current ||
        !callbacks.current.enabled ||
        now - lastStep.current < (running.current ? 75 : 140)
      )
        return;
      lastStep.current = now;
      callbacks.current.onDirection(
        held.current.direction[0],
        held.current.direction[1],
        running.current,
      );
    }, 15);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const blur = () => {
      running.current = false;
      stop();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("focusin", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("focusin", focus);
      held.current = null;
    };
  }, []);
  function release(event: PointerEvent<HTMLButtonElement>) {
    if (held.current?.source === `pointer:${event.pointerId}`) stop();
  }
  return (
    <section className={styles.controller} aria-label="Game controls">
      <div className={styles.controllerBrand}>
        BOSMON <span>pocket</span>
        <small>
          {mode === "world"
            ? "THE SOLARA REGION"
            : "D-PAD TO SELECT · J TO CONFIRM"}
        </small>
      </div>
      <div className={styles.dpad} role="group" aria-label="Directional pad">
        {(
          [
            { name: "up", direction: [0, -1], Icon: ArrowUp },
            { name: "left", direction: [-1, 0], Icon: ArrowLeft },
            { name: "right", direction: [1, 0], Icon: ArrowRight },
            { name: "down", direction: [0, 1], Icon: ArrowDown },
          ] as const
        ).map(({ name, direction, Icon }) => (
          <button
            key={name}
            type="button"
            tabIndex={-1}
            data-direction={name}
            data-pressed={pressed === name}
            aria-label={`Move ${name}`}
            disabled={!enabled}
            onPointerDown={(event) => {
              event.preventDefault();
              if (held.current?.source.startsWith("pointer:")) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              held.current = {
                source: `pointer:${event.pointerId}`,
                direction,
              };
              setPressed(name);
              lastStep.current = performance.now();
              callbacks.current.onDirection(direction[0], direction[1]);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onClick={(event) => {
              if (event.detail === 0 && enabled)
                onDirection(direction[0], direction[1]);
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <Icon size={22} />
          </button>
        ))}
        <span aria-hidden="true" />
      </div>
      <div className={styles.actionKeys}>
        {[
          {
            key: "K",
            label: mode === "world" ? "MENU" : "BACK",
            action: onBack,
          },
          {
            key: "J",
            label: mode === "world" ? "INTERACT" : "CONFIRM",
            action: onConfirm,
          },
        ].map(({ key, label, action }) => (
          <div key={key}>
            <button
              tabIndex={-1}
              type="button"
              disabled={!enabled}
              aria-label={`${key}: ${label.toLowerCase()}`}
              onPointerDown={(event) => {
                event.preventDefault();
                stop();
                action();
              }}
              onClick={(event) => {
                if (event.detail === 0) action();
              }}
              onContextMenu={(event) => event.preventDefault()}
            >
              {key}
            </button>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
