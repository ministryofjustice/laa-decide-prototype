const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createAssignmentQueue } = require('../assets/javascripts/v6-assignment-queue');

function setupPage() {
  const documentHandlers = {};
  const windowHandlers = {};
  const requests = [];
  const navigations = [];
  const timers = [];
  const toast = { replaceChildren(banner) { this.banner = banner; } };
  const links = ['ONE', 'TWO'].map(reference => {
    const attributes = { 'data-ref': reference, 'data-is-prior-authority': 'false' };
    return {
      classList: { contains: value => value === 'add-to-list' },
      getAttribute: name => attributes[name],
      setAttribute: (name, value) => { attributes[name] = value; },
      removeAttribute: name => { delete attributes[name]; },
      addEventListener: (name, handler) => { if (name === 'click') thisHandler.set(reference, handler); },
      closest() { return this; }
    };
  });
  const thisHandler = new Map();
  const document = {
    addEventListener: (name, handler) => { documentHandlers[name] = handler; },
    getElementById: () => toast,
    querySelectorAll: () => links,
    createElement() {
      const elements = { h2: {}, p: {} };
      return {
        setAttribute() {},
        querySelector: name => elements[name],
        elements
      };
    }
  };
  const window = {
    addEventListener: (name, handler) => { windowHandlers[name] = handler; },
    location: { assign: url => navigations.push(url), reload: () => navigations.push('reload') }
  };
  const source = fs.readFileSync(path.join(__dirname, '../assets/javascripts/v6-open-assignments.js'), 'utf8');
  vm.runInNewContext(source, {
    document, window, createAssignmentQueue,
    fetch: url => new Promise(resolve => requests.push({ url, resolve })),
    setTimeout: fn => { timers.push(fn); return timers.length; },
    clearTimeout: id => { if (id) timers[id - 1] = null; },
    console: { error() {} },
    encodeURIComponent
  });
  documentHandlers.DOMContentLoaded();
  return { documentHandlers, windowHandlers, requests, navigations, timers, toast, links, thisHandler };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const ok = { ok: true, json: async () => ({ success: true, linkedAddedCount: 0 }) };

test('rapid assignments finish in order before navigating to another page', async () => {
  const page = setupPage();
  for (const reference of ['ONE', 'TWO']) page.thisHandler.get(reference)({ preventDefault() {} });
  await tick();
  assert.equal(page.requests.length, 1);
  assert.match(page.requests[0].url, /\/ONE\?/);

  let prevented = false;
  const destination = {
    closest() { return this; }, classList: { contains: () => false },
    getAttribute: () => '/v6/yourlist', href: '/v6/yourlist', target: ''
  };
  page.documentHandlers.click({
    target: destination, button: 0, preventDefault() { prevented = true; }
  });
  assert.equal(prevented, true);
  page.requests[0].resolve(ok);
  await tick();
  assert.equal(page.requests.length, 2);
  assert.deepEqual(page.navigations, []);
  page.requests[1].resolve(ok);
  await tick();
  assert.deepEqual(page.navigations, ['/v6/yourlist']);
  assert.equal(page.timers.filter(Boolean).length, 0);
});

test('assignment failures are shown, do not reload, and can be retried', async () => {
  const page = setupPage();
  page.thisHandler.get('ONE')({ preventDefault() {} });
  await tick();
  page.requests[0].resolve({ ok: false, status: 500 });
  await tick();
  assert.match(page.toast.banner.elements.p.textContent, /Could not assign ONE/);
  assert.equal(page.links[0].getAttribute('aria-disabled'), undefined);
  assert.equal(page.timers.filter(Boolean).length, 0);
  page.thisHandler.get('ONE')({ preventDefault() {} });
  await tick();
  page.requests[1].resolve(ok);
  await tick();
  assert.match(page.toast.banner.elements.p.textContent, /You have added ONE/);
  assert.equal(page.timers.filter(Boolean).length, 1);
});
