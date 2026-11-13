"use client";

import type { Position } from "./types";

const STORAGE_KEY = "pulse-tsx-positions";
const MAX_POSITIONS = 100;
const EMPTY: Position[] = [];

let snapshot: Position[] | null = null;
const listeners = new Set<() => void>();

function isPosition(value: unknown): value is Position {
  if (!value || typeof value !== "object") return false;
  const position = value as Record<string, unknown>;
  return (
    typeof position.id === "string" &&
    typeof position.symbol === "string" &&
    typeof position.invested === "number" &&
    typeof position.shares === "number" &&
    Number.isFinite(position.invested) &&
    Number.isFinite(position.shares)
  );
}

function read(): Position[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(isPosition).slice(0, MAX_POSITIONS);
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribePositions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPositionsSnapshot(): Position[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getPositionsServerSnapshot(): Position[] {
  return EMPTY;
}

export function writePositions(next: Position[]) {
  snapshot = next.slice(-MAX_POSITIONS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // storage may be full or blocked; keep the in-memory value
  }
  emit();
}
