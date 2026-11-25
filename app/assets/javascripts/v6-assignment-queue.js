function createAssignmentQueue(assign, onIdle = () => {}) {
  let tail = Promise.resolve();
  let pending = 0;

  return {
    enqueue(value) {
      pending += 1;
      const result = tail.then(() => assign(value));
      tail = result.catch(() => {}).then(() => {
        pending -= 1;
        if (pending === 0) onIdle();
      });
      return result;
    },
    whenIdle() {
      return tail;
    },
    get pending() {
      return pending;
    }
  };
}

if (typeof module !== 'undefined') module.exports = { createAssignmentQueue };
