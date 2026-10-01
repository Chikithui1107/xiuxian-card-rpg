/** One battle owns its timers. Cancelling also settles waits, without resuming actions. */
export function createActionScope() {
  let active = true;
  const timers = new Map<ReturnType<typeof setTimeout>, (() => void) | undefined>();
  const schedule = (callback: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (active) callback();
    }, ms);
    if (active) timers.set(timer, undefined);
    else clearTimeout(timer);
    return timer;
  };
  return {
    get active() { return active; },
    schedule,
    wait(ms: number): Promise<boolean> {
      if (!active) return Promise.resolve(false);
      return new Promise(resolve => {
        const timer = schedule(() => resolve(true), ms);
        timers.set(timer, () => resolve(false));
      });
    },
    cancel() {
      active = false;
      for (const [timer, settle] of timers) {
        clearTimeout(timer);
        settle?.();
      }
      timers.clear();
    },
  };
}
