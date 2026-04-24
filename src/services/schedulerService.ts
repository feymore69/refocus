export interface SchedulerCallbacks {
  onTick: () => void;
}

export class SchedulerService {
  private intervalId: number | null = null;
  private callbacks: SchedulerCallbacks;

  constructor(callbacks: SchedulerCallbacks) {
    this.callbacks = callbacks;
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.callbacks.onTick(), 1000);
  }

  stop() {
    if (!this.intervalId) return;
    window.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
