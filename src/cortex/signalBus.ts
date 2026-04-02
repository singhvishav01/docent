import { Signal, SignalType } from './types';

export class SignalBus {
  private listeners: Array<(signal: Signal) => void> = [];
  private signalLog: Signal[] = [];
  private readonly MAX_LOG_SIZE = 100;

  emit(type: SignalType, value: any, source: string): void {
    const signal: Signal = { type, value, source, timestamp: Date.now() };
    this.signalLog.push(signal);
    if (this.signalLog.length > this.MAX_LOG_SIZE) this.signalLog.shift();
    this.listeners.forEach(fn => fn(signal));
  }

  onSignal(callback: (signal: Signal) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  getRecent(type: SignalType, count = 5): Signal[] {
    return this.signalLog.filter(s => s.type === type).slice(-count);
  }

  getWindow(seconds: number): Signal[] {
    const cutoff = Date.now() - seconds * 1000;
    return this.signalLog.filter(s => s.timestamp >= cutoff);
  }

  getAll(): Signal[] {
    return [...this.signalLog];
  }
}
