const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createAssignmentQueue } = require('../assets/javascripts/v6-assignment-queue');

test('one branded Kit sign-in protects direct links and preserves casework on sign-out', async () => {
  const server = spawn(process.execPath, ['-e', `
    const app = require('govuk-prototype-kit/server');
    const server = app.listen(0, '127.0.0.1', () => console.log('TEST_PORT=' + server.address().port));
  `], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'production', USE_HTTPS: 'false', USE_AUTH: 'true',
      PASSWORD: 'local-test-password', PASSWORD_KEYS: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  const cookies = new Map();
  let base;

  async function request(path, options = {}) {
    const headers = { ...options.headers };
    if (cookies.size) {
      headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const response = await fetch(base + path, { ...options, headers, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (!value) cookies.delete(name);
      else cookies.set(name, value);
    }
    await response.clone().arrayBuffer();
    return response;
  }

  async function signIn(password, returnURL = '/') {
    return request('/manage-prototype/password', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password, returnURL })
    });
  }

  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
      server.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/TEST_PORT=(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      server.stderr.on('data', chunk => { output += chunk; });
      server.once('error', error => { clearTimeout(timeout); reject(error); });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited (${code}): ${output}`)); });
    });
    base = `http://127.0.0.1:${port}`;
    const directLink = '/v6/open-applications?consolidated=true';
    const blocked = await request(directLink);
    assert.equal(blocked.status, 302);
    const signInUrl = new URL(blocked.headers.get('location'), base);
    assert.equal(signInUrl.pathname, '/manage-prototype/password');
    assert.equal(signInUrl.searchParams.get('returnURL'), directLink);

    const page = await (await request(signInUrl.pathname + signInUrl.search)).text();
    assert.match(page, /Civil Decide: Caseworker Journey[\s\S]*Civil Decide prototype/);
    assert.match(page, /Civil Decide prototype/);
    assert.match(page, /This is a prototype used for research/);
    assert.match(page, /It is not a real service/);
    assert.equal((page.match(/type="password"/g) || []).length, 1);

    const wrong = await signIn('wrong', directLink);
    assert.match(wrong.headers.get('location'), /error=wrong-password/);
    const errorPage = await (await request(wrong.headers.get('location'))).text();
    assert.match(errorPage, /The password is not correct/);
    assert.equal((await request(directLink)).status, 302);

    const correct = await signIn('local-test-password', directLink);
    assert.equal(correct.headers.get('location'), directLink);
    assert.equal((await request(directLink)).status, 200);
    const landing = await request('/');
    assert.equal(landing.status, 200);
    assert.doesNotMatch(await landing.text(), /type="password"/);

    async function checkEvidenceLinks(path, expectedLinks) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      for (const href of expectedLinks) {
        const links = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
        const link = links.find(candidate => candidate.includes(`href="${href}"`));
        assert.ok(link, `Missing evidence link ${href} on ${path}`);
        assert.match(link, /target="_blank"/);
        assert.match(link, /rel="noopener noreferrer"/);
        assert.match(link, /opens in a new tab/);
        assert.doesNotMatch(link, /\bexample\b/i);
        const document = await request(href);
        assert.equal(document.status, 200, href);
      }
    }

    for (const version of ['v6', 'v6-v2', 'v6-v3', 'v6-v4', 'v6-v5']) {
      const parental = version === 'v6-v4' ? 'v6-v4' : 'v6-v3';
      await checkEvidenceLinks(`/${version}/application/L-12Z-13P`, [
        '/public/downloads/merits-report.pdf',
        `/public/downloads/${parental}/parental_responsibility.pdf`
      ]);
    }
    await checkEvidenceLinks('/v6-v3/application/L-12Z-13P?isRedetermination=true&redeterminationIndex=0', [
      '/public/downloads/v6-v3/court_order.pdf',
      '/public/downloads/v6-v3/parental_responsibility.pdf'
    ]);
    await checkEvidenceLinks('/v6-v5/application/M-MDDT-WBYS?isRedetermination=true&redeterminationIndex=0', [
      '/v6-v5/testing-scenario/statement',
      '/v6-v5/testing-scenario/merits',
      '/v6-v5/testing-scenario/certificate'
    ]);

    await checkEvidenceLinks('/v6-v5/application/L-YU5-UY3?isRedetermination=true&redeterminationIndex=0', [
      '/public/downloads/ProceedingEvidence.pdf',
      '/public/downloads/LouiseInitialEvidence.pdf'
    ]);
    const louiseDocument = await request('/public/downloads/ProceedingEvidence.pdf');
    assert.match(louiseDocument.headers.get('content-type'), /application\/pdf/);
    assert.equal(Buffer.from(await louiseDocument.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');

    for (const suffix of ['', '?isRedetermination=true&redeterminationIndex=0', '?isRedetermination=true&redeterminationIndex=1']) {
      const html = await (await request(`/v6-v5/application/L-YU5-UY3${suffix}`)).text();
      assert.doesNotMatch(html, /not supplied/i);
      assert.match(html, /£25,000/);
      for (const value of ['15 May 2011', 'Bevan Family Law', 'BF123A', 'Manchester City Council', '01632 960456']) {
        assert.ok(html.includes(value), `Louise’s People tab should display ${value}`);
      }
      const careOrder = html.match(/>Care order<\/h2>[\s\S]*?<\/dl>/);
      assert.ok(careOrder, 'Louise’s care order details are displayed');
      assert.match(careOrder[0], /Client role<\/dt>\s*<dd[^>]*>Child subject of proceedings<\/dd>/);
      assert.match(careOrder[0], /Delegated functions<\/dt>[\s\S]*?Not used/);
      assert.match(careOrder[0], /Substantive level of service<\/dt>[\s\S]*?Full representation/);
      assert.match(careOrder[0], /Substantive scope limitations<\/dt>[\s\S]*?Final hearing/);
      assert.doesNotMatch(careOrder[0], /Not supplied/);
    }
    const louiseHistory = await request('/v6-v5/application/L-YU5-UY3/history');
    assert.equal(louiseHistory.status, 200);
    assert.doesNotMatch(await louiseHistory.text(), /not supplied/i);

    const louise = '/v6-v5/application/L-YU5-UY3/redeterminations';
    const versionOpen = '/v6-v5/open-applications';
    assert.match(await (await request(versionOpen)).text(), /L-YU5-UY3/);
    assert.equal((await request('/v6-v5/add-application/L-YU5-UY3?isRedetermination=true&redeterminationIndex=0')).status, 302);
    assert.doesNotMatch(await (await request(versionOpen)).text(), /L-YU5-UY3/);
    const decisionPage = await request(`${louise}/decision`);
    assert.equal(decisionPage.status, 200);
    assert.match(await decisionPage.text(), /Contact with a child in care/);
    const decision = await request(`${louise}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'decision-0': 'grant', 'certificate-grant-date-type-0': 'current-date',
        'decision-1': 'grant', 'certificate-grant-date-type-1': 'current-date'
      })
    });
    assert.equal(decision.headers.get('location'), `${louise}/check-answers`);
    assert.equal((await request(`${louise}/check-answers`, { method: 'POST' })).headers.get('location'), `${louise}/confirmation`);
    const confirmation = await request(`${louise}/confirmation`);
    assert.equal(confirmation.status, 200);
    assert.match(await confirmation.text(), /Assessment complete/);
    const reopened = await (await request(versionOpen)).text();
    assert.match(reopened, /L-YU5-UY3/);
    assert.equal((await request('/v6-v5/add-application/L-YU5-UY3?isRedetermination=true&redeterminationIndex=0')).status, 302);
    const repeatedDecision = await request(`${louise}/decision`);
    assert.equal(repeatedDecision.status, 200);
    const repeatedPage = await repeatedDecision.text();
    assert.match(repeatedPage, /Contact with a child in care/);
    assert.match(repeatedPage, /Secure accommodation order/);
    assert.doesNotMatch(repeatedPage, /value="grant"\s+checked/);
    const secondDecision = await request(`${louise}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'decision-0': 'grant', 'certificate-grant-date-type-0': 'current-date',
        'decision-1': 'grant', 'certificate-grant-date-type-1': 'current-date'
      })
    });
    assert.equal(secondDecision.headers.get('location'), `${louise}/check-answers`);
    assert.equal((await request(`${louise}/check-answers`, { method: 'POST' })).headers.get('location'), `${louise}/confirmation`);
    assert.equal((await request(`${louise}/confirmation`)).status, 200);
    assert.match(await (await request(versionOpen)).text(), /L-YU5-UY3/);

    const openHtml = await (await request('/v6/open-applications')).text();
    assert.match(openHtml, /v6-assignment-queue\.js[\s\S]*v6-open-assignments\.js/);
    for (const script of ['v6-assignment-queue.js', 'v6-open-assignments.js']) {
      assert.equal((await request(`/public/javascripts/${script}`)).status, 200);
    }
    const openReferences = [...openHtml.matchAll(/data-ref="([^"]+)" data-is-prior-authority="false"/g)]
      .map(match => match[1]).filter(ref => ref !== 'V-KL6-429').slice(0, 2);
    assert.equal(openReferences.length, 2);
    const assignmentQueue = createAssignmentQueue(reference =>
      request(`/v6/add-application/${reference}?isPriorAuthority=false`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
    );
    const assignmentResponses = await Promise.all(openReferences.map(reference => assignmentQueue.enqueue(reference)));
    await assignmentQueue.whenIdle();
    for (const response of assignmentResponses) assert.equal(response.status, 200);

    const assigned = await request('/v6/assigned-to-others/assign', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ caseworker: 'Darren Horne', reference: 'V-KL6-429', isPriorAuthority: 'false' })
    });
    assert.equal(assigned.status, 302);
    assert.match(await (await request('/v6/your-list')).text(), /V-KL6-429/);

    const signOut = await request('/v6/sign-out');
    assert.equal(signOut.headers.get('location'), '/manage-prototype/password?returnURL=%2F');
    assert.equal(cookies.has('authentication'), false);
    assert.equal((await request('/v6/your-list')).status, 302);
    assert.match(await (await request(signOut.headers.get('location'))).text(), /Civil Decide prototype/);
    assert.equal((await signIn('local-test-password')).headers.get('location'), '/');
    assert.match(await (await request('/v6/your-list')).text(), /V-KL6-429/);

    let list = await (await request('/v6/yourlist')).text();
    for (const reference of [...openReferences, 'V-KL6-429']) assert.ok(list.includes(reference));

    await request('/v6/decision-start?ref=V-KL6-429');
    assert.equal((await request('/v6/decision-check', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'overall-decision': 'grant' })
    })).headers.get('location'), '/v6/grant-certificate-date');
    assert.equal((await request('/v6/grant-date-submit', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'cert-date-type': 'today' })
    })).headers.get('location'), '/v6/check-answers');
    assert.equal((await request('/v6/check-answers-submit', { method: 'POST' })).headers.get('location'), '/v6/confirmation-screen');
    const consolidatedConfirmation = await (await request('/v6/confirmation-screen')).text();
    assert.match(consolidatedConfirmation, /Assessment complete/);
    assert.match(consolidatedConfirmation, /href="\/v6\/yourlist"/);
    list = await (await request('/v6/yourlist')).text();
    for (const reference of openReferences) assert.ok(list.includes(reference), `${reference} remains in your list`);
    assert.ok(!list.includes('V-KL6-429'));
    const decided = await (await request('/v6/application/V-KL6-429')).text();
    assert.match(decided, /Granted/);

    async function postForm(url, fields) {
      return request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields)
      });
    }

    for (const [reference, apportioned] of [['E-XPT-001', false], ['A-APP-002', true]]) {
      for (let run = 0; run < 2; run++) {
        let open = await (await request('/v6/open-applications')).text();
        assert.match(open, new RegExp(`data-ref="${reference}" data-is-prior-authority="true"`));
        const detail = await (await request(`/v6/application/${reference}?isPriorAuthority=true`)).text();
        assert.match(detail, new RegExp(`Apportioned</dt>\\s*<dd[^>]*>${apportioned ? 'Yes' : 'No'}</dd>`));
        if (apportioned) assert.match(detail, /Amount claimed for this prior authority[\s\S]*?3024\.00/);
        assert.equal((await request(`/v6/add-application/${reference}?isPriorAuthority=true`)).status, 302);
        open = await (await request('/v6/open-applications')).text();
        assert.doesNotMatch(open, new RegExp(`data-ref="${reference}"`));
        assert.match(await (await request('/v6/yourlist')).text(), new RegExp(reference));
        assert.equal((await request(`/v6/expert-assessment/decision?reference=${reference}`)).status, 200);
        if (run === 0) {
          assert.equal((await postForm('/v6/expert-assessment/decision-handler', { 'expert-decision': 'Grant' })).headers.get('location'), '/v6/expert-assessment/amount');
          const amount = await (await request('/v6/expert-assessment/amount')).text();
          assert.match(amount, new RegExp(`Apportioned</dt><dd[^>]*>${apportioned ? 'Yes' : 'No'}</dd>`));
          assert.equal((await postForm('/v6/expert-assessment/amount-handler', {
            'expert-amount-decision': 'requested', 'expert-justification': 'Appropriate'
          })).headers.get('location'), '/v6/expert-assessment/check-your-answers');
        } else {
          assert.equal((await postForm('/v6/expert-assessment/decision-handler', { 'expert-decision': 'Refuse' })).headers.get('location'), '/v6/expert-assessment/refuse-justification');
          assert.equal((await postForm('/v6/expert-assessment/refuse-justification-handler', {
            'expert-refuse-justification': 'Not appropriate'
          })).headers.get('location'), '/v6/expert-assessment/check-your-answers');
        }
        assert.equal((await request('/v6/expert-assessment/submit-assessment', { method: 'POST' })).headers.get('location'), '/v6/expert-assessment/confirmation');
        assert.match(await (await request('/v6/expert-assessment/confirmation')).text(), new RegExp(reference));
        const completedDetails = await (await request(`/v6/application/${reference}?isPriorAuthority=true`)).text();
        assert.match(completedDetails, run === 0 ? /Granted/ : /Refused/);
        assert.doesNotMatch(await (await request('/v6/yourlist')).text(), new RegExp(reference));
      }
      const restored = await (await request('/v6/open-applications')).text();
      assert.match(restored, new RegExp(`data-ref="${reference}" data-is-prior-authority="true"`));
    }
    list = await (await request('/v6/yourlist')).text();
    for (const reference of openReferences) assert.ok(list.includes(reference), `${reference} remains assigned`);

    for (const version of ['v6', 'v6-v2', 'v6-v3', 'v6-v4', 'v6-v5']) {
      assert.equal((await request(`/${version}/index`)).headers.get('location'), '/');
      assert.equal((await request(`/${version}/password-submit`)).headers.get('location'), '/');
      const versionSignOut = await request(`/${version}/sign-out`);
      assert.equal(versionSignOut.headers.get('location'), '/manage-prototype/password?returnURL=%2F');
      assert.equal((await request('/')).status, 302);
      assert.equal((await signIn('local-test-password')).headers.get('location'), '/');
    }

    const unsafe = await signIn('local-test-password', '//example.com');
    assert.equal(unsafe.headers.get('location'), '/');
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  }
});

test('local sign-out accepts the configured development password', async () => {
  const server = spawn(process.execPath, ['-e', `
    const app = require('govuk-prototype-kit/server');
    const server = app.listen(0, '127.0.0.1', () => console.log('TEST_PORT=' + server.address().port));
  `], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'development', USE_HTTPS: 'false',
      PASSWORD: 'development-test-password', PASSWORD_KEYS: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
      server.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/TEST_PORT=(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      server.stderr.on('data', chunk => { output += chunk; });
      server.once('error', error => { clearTimeout(timeout); reject(error); });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited (${code}): ${output}`)); });
    });
    const base = `http://127.0.0.1:${port}`;
    const signOut = await fetch(`${base}/v6/sign-out`, { redirect: 'manual' });
    assert.equal(signOut.headers.get('location'), '/manage-prototype/password?returnURL=%2F');
    const passwordPage = await fetch(base + signOut.headers.get('location'));
    assert.match(await passwordPage.text(), /Civil Decide prototype/);
    const signIn = await fetch(`${base}/manage-prototype/password`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: 'development-test-password', returnURL: '/' }),
      redirect: 'manual'
    });
    assert.equal(signIn.headers.get('location'), '/');
    assert.equal((await fetch(base)).status, 200);
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  }
});
