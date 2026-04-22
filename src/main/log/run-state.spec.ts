// run-state.spec.ts
// Unit tests for RunStateManager — all 5 LogEvent types, RUN-02, and state immutability.

import { describe, it, expect, beforeEach } from 'vitest';
import { RunStateManager } from './run-state';
import { INITIAL_RUN_STATE } from '../../shared/types';

describe('RunStateManager', () => {
  let manager: RunStateManager;

  beforeEach(() => {
    manager = new RunStateManager();
  });

  it('Test 1: initial state matches INITIAL_RUN_STATE', () => {
    const state = manager.getState();
    expect(state.version).toBe(INITIAL_RUN_STATE.version);
    expect(state.seed).toBe(INITIAL_RUN_STATE.seed);
    expect(state.items).toEqual(INITIAL_RUN_STATE.items);
    expect(state.floor).toBe(INITIAL_RUN_STATE.floor);
  });

  it('Test 2: applyEvent with version-detected sets version field', () => {
    manager.applyEvent({ type: 'version-detected', version: 'repentance' });
    expect(manager.getState().version).toBe('repentance');
  });

  it('Test 3: applyEvent with run-start sets seed and clears items to empty array', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    manager.applyEvent({ type: 'item-pickup', itemId: 105 });
    manager.applyEvent({ type: 'run-start', seed: 'ABCD EF01' });
    const state = manager.getState();
    expect(state.seed).toBe('ABCD EF01');
    expect(state.items).toEqual([]);
  });

  it('Test 4: applyEvent with run-start clears floor to null', () => {
    manager.applyEvent({ type: 'floor-change', stage: 2, stageType: 0 });
    manager.applyEvent({ type: 'run-start', seed: 'XXXX XXXX' });
    expect(manager.getState().floor).toBeNull();
  });

  it('Test 5: applyEvent with item-pickup appends itemId to items array', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    expect(manager.getState().items).toEqual([1]);
  });

  it('Test 6: multiple item-pickup events preserve order (items=[1,105,333])', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    manager.applyEvent({ type: 'item-pickup', itemId: 105 });
    manager.applyEvent({ type: 'item-pickup', itemId: 333 });
    expect(manager.getState().items).toEqual([1, 105, 333]);
  });

  it('Test 7: applyEvent with item-removal removes first occurrence of itemId from items', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    manager.applyEvent({ type: 'item-pickup', itemId: 105 });
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    manager.applyEvent({ type: 'item-removal', itemId: 1 });
    expect(manager.getState().items).toEqual([105, 1]);
  });

  it('Test 8: applyEvent with item-removal when item not in list does nothing (no crash)', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    expect(() => {
      manager.applyEvent({ type: 'item-removal', itemId: 999 });
    }).not.toThrow();
    expect(manager.getState().items).toEqual([1]);
  });

  it('Test 9: applyEvent with floor-change sets floor object', () => {
    manager.applyEvent({ type: 'floor-change', stage: 3, stageType: 1 });
    expect(manager.getState().floor).toEqual({ stage: 3, stageType: 1 });
  });

  it('Test 10: run-start after items clears the list (RUN-02 verification)', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    manager.applyEvent({ type: 'item-pickup', itemId: 2 });
    manager.applyEvent({ type: 'item-pickup', itemId: 3 });
    manager.applyEvent({ type: 'run-start', seed: 'NEW1 RUN1' });
    // Items cleared synchronously — any pickup after this belongs to the new run
    expect(manager.getState().items).toEqual([]);
    manager.applyEvent({ type: 'item-pickup', itemId: 50 });
    expect(manager.getState().items).toEqual([50]);
  });

  it('Test 11: getState() returns a copy (mutation of returned object does not affect internal state)', () => {
    manager.applyEvent({ type: 'item-pickup', itemId: 1 });
    const state = manager.getState();
    state.items.push(999);
    state.version = 'rebirth';
    // Internal state should be unchanged
    expect(manager.getState().items).toEqual([1]);
    expect(manager.getState().version).toBeNull();
  });
});
