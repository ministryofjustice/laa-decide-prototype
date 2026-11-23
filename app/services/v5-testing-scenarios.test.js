const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureTestingScenarios, resetCompletedLouiseScenario } = require('./v5-testing-scenarios');

const reference = 'M-MDDT-WBYS';

test('removes random request classifications from fixed scenarios without changing other cases', () => {
  const data = { 'mock-request-types': {
    'M-MDDT-WBYS': 'Increase cost limit',
    'L-VXQO-YZBU': 'Increase scope limitation',
    'Y-HCMT-YBYZ': 'Increase cost limit',
    'L-YU5-UY3': 'Increase scope limitation',
    'OTHER-REFERENCE': 'Increase cost limit'
  } };
  ensureTestingScenarios(data);
  assert.deepEqual(data['mock-request-types'], { 'OTHER-REFERENCE': 'Increase cost limit' });
});

test('Louise Bevan scenario retains the supplied provider answers and session progress', () => {
  const data = {};
  const reference = 'L-YU5-UY3';
  ensureTestingScenarios(data);
  const requests = data['open-applications-all'].filter(application => application.ref === reference);
  assert.deepEqual(requests.map(request => request.redeterminationProceeding), ['Contact with a child in care', 'Secure accommodation order']);
  assert.deepEqual(requests.map(request => request.redeterminationClientRole), ['Applicant', 'Child subject of proceedings']);
  assert.ok(requests.every(request => request.status === undefined && request.applicationType === 'Substantive'));
  const answers = data['redetermination-provider-answers-v4'][reference];
  assert.equal(answers.finalOrderMade, 'Yes');
  assert.deepEqual(answers.finalOrderDetails, [{ date: '23 November 2026' }]);
  assert.equal(answers.proceedingAnswers[0].heardTogether, 'No');
  assert.equal(answers.proceedingAnswers[0].heardAsAlternative, 'No');
  assert.equal(answers.proceedingAnswers[1].childSubjectOfSecureAccommodation, 'Yes');
  assert.equal(answers.proceedingAnswers[1].proceedingIssued, 'Yes');
  const justifications = [answers.changesSinceDecision, answers.dispute, answers.clientSeeking];
  assert.ok(justifications.every(answer => answer.length > 0 && answer.length <= 250));
  assert.match(answers.changesSinceDecision, /contact.*mother.*secure accommodation/i);
  assert.match(answers.dispute, /representation.*contact.*secure accommodation/i);
  assert.match(answers.clientSeeking, /contact.*mother.*secure accommodation/i);
  const original = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, original);
  data['assigned-applications'] = requests;
  data['open-applications-all'] = data['open-applications-all'].filter(app => app.ref !== reference);
  data['app-history'][reference].push({ action: 'Note added', details: 'Research note' });
  ensureTestingScenarios(data);
  assert.equal(data['open-applications-all'].filter(app => app.ref === reference).length, 0);
  assert.equal(data['app-history'][reference].at(-1).details, 'Research note');
  data['assigned-applications'] = [];
  data['grouped-redetermination-completed'] = { [reference]: true };
  ensureTestingScenarios(data);
  assert.equal(data['open-applications-all'].filter(app => app.ref === reference).length, 0);
  const fresh = {};
  ensureTestingScenarios(fresh);
  assert.equal(fresh['open-applications-all'].filter(app => app.ref === reference).length, 2);
});

test('updates old Louise placeholders without overwriting existing session answers', () => {
  const data = {};
  ensureTestingScenarios(data);
  const answers = data['redetermination-provider-answers-v4']['L-YU5-UY3'];
  answers.changesSinceDecision = 'Not supplied in the walkthrough';
  answers.dispute = 'A session-specific answer';
  answers.clientSeeking = 'Not supplied in the walkthrough';
  ensureTestingScenarios(data);
  assert.match(answers.changesSinceDecision, /contact.*mother.*secure accommodation/i);
  assert.equal(answers.dispute, 'A session-specific answer');
  assert.match(answers.clientSeeking, /contact.*mother.*secure accommodation/i);
});

test('updates Louise placeholders in existing sessions without resetting progress', () => {
  const data = {};
  ensureTestingScenarios(data);
  const initial = data['completed-applications'].find(app => app.ref === 'L-YU5-UY3' && !app.isRedetermination);
  initial.dob = 'Not supplied (aged 15)';
  initial.firm = 'Not supplied';
  initial.opponentName = 'Local authority (name not supplied)';
  initial.children[0].dob = 'Not supplied';
  initial.submitted = 'Not supplied';
  initial.delegatedFunctions = 'Not supplied';
  const answers = data['redetermination-provider-answers-v4']['L-YU5-UY3'];
  answers.parentalResponsibility = 'Not supplied';
  answers.dispute = 'A session-specific answer';
  const history = data['app-history']['L-YU5-UY3'];
  history[0].timestamp = 'Date not supplied';
  history[0].caseworker = 'Not supplied';
  history.push({ action: 'Note added', details: 'Research note' });
  ensureTestingScenarios(data);
  assert.equal(initial.dob, '15 May 2011');
  assert.equal(initial.children[0].dob, initial.dob);
  assert.equal(initial.firm, 'Bevan Family Law<br>BF123A');
  assert.equal(initial.opponentName, 'Manchester City Council');
  assert.equal(initial.submitted, '1 Jul 2026');
  assert.equal(initial.delegatedFunctions, 'Not used');
  assert.equal(answers.parentalResponsibility, 'No');
  assert.equal(answers.dispute, 'A session-specific answer');
  assert.equal(history[0].timestamp, '3 Jul 2026');
  assert.equal(history.at(-1).details, 'Research note');
  assert.equal(data['open-applications-all'].filter(app => app.ref === 'L-YU5-UY3').length, 2);
});

test('resets only completed Louise requests and retains other cases', () => {
  const data = {};
  const ref = 'L-YU5-UY3';
  ensureTestingScenarios(data);
  const requests = data['open-applications-all'].filter(app => app.ref === ref);
  data['open-applications-all'] = data['open-applications-all'].filter(app => app.ref !== ref);
  data['assigned-applications'] = requests.map(app => ({ ...app }));
  data['completed-applications'].push({ ...requests[0], status: 'Granted' }, { ...requests[1], status: 'Refused' });
  data['redetermination-decision-store'] = {
    [`${ref}|0`]: { status: 'Granted' }, [`${ref}|1`]: { status: 'Refused' },
    'M-MDDT-WBYS|0': { status: 'Granted' }
  };
  data['grouped-redetermination-completed'] = { [ref]: true, 'M-MDDT-WBYS': true };
  data['grouped-redetermination-edits'] = { [ref]: { 0: { proceedingName: 'Edited' } }, OTHER: { kept: true } };
  data['app-history'][ref].push({ action: 'Note added', details: 'Previous run' });
  assert.equal(resetCompletedLouiseScenario(data), true);
  const reset = data['open-applications-all'].filter(app => app.ref === ref);
  assert.deepEqual(reset.map(app => app.redeterminationProceeding), ['Contact with a child in care', 'Secure accommodation order']);
  assert.ok(reset.every(app => !app.status));
  assert.equal(data['assigned-applications'].filter(app => app.ref === ref).length, 0);
  assert.equal(data['completed-applications'].filter(app => app.ref === ref && app.isRedetermination).length, 0);
  assert.equal(data['completed-applications'].filter(app => app.ref === ref && !app.isRedetermination).length, 1);
  assert.deepEqual(data['redetermination-decision-store'], { 'M-MDDT-WBYS|0': { status: 'Granted' } });
  assert.deepEqual(data['grouped-redetermination-completed'], { 'M-MDDT-WBYS': true });
  assert.deepEqual(data['grouped-redetermination-edits'], { OTHER: { kept: true } });
  assert.ok(!data['app-history'][ref].some(event => event.details === 'Previous run'));
  assert.equal(resetCompletedLouiseScenario(data), false);
  ensureTestingScenarios(data);
  assert.equal(data['open-applications-all'].filter(app => app.ref === ref).length, 2);
});

test('creates a repeatable scenario with two requests and an earlier initial grant', () => {
  const first = {};
  const second = {};
  ensureTestingScenarios(first);
  ensureTestingScenarios(second);
  assert.deepEqual(first, second);
  const requests = first['open-applications-all'].filter(request => request.ref === reference);
  assert.deepEqual(requests.map(request => request.redeterminationProceeding), [
    'Emergency protection order - extend',
    'Emergency protection order - discharge'
  ]);
  assert.ok(requests.every(request => request.status === undefined && request.groupedRedeterminationFlow));
  assert.equal(first['completed-applications'][0].status, 'Granted');
  const original = JSON.parse(JSON.stringify(first));
  ensureTestingScenarios(first);
  assert.deepEqual(first, original);
});

test('retains assigned requests, history and provider answers without recreating open rows', () => {
  const data = {};
  ensureTestingScenarios(data);
  data['assigned-applications'] = data['open-applications-all'].splice(0);
  data['assigned-applications'][0].caseworker = 'Test caseworker';
  data['app-history'][reference].push({ action: 'Test note' });
  const original = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, original);
});

test('retains completed decisions and does not reopen the scenario', () => {
  const data = {};
  ensureTestingScenarios(data);
  data['completed-applications'].push(...data['open-applications-all'].splice(0));
  data['redetermination-decision-store'] = {
    [`${reference}|0`]: { status: 'Granted' },
    [`${reference}|1`]: { status: 'Granted' }
  };
  data['grouped-redetermination-completed'] = { [reference]: true };
  ensureTestingScenarios(data);
  assert.equal(data['open-applications-all'].filter(request => request.ref === reference).length, 0);
  assert.equal(data['redetermination-decision-store'][`${reference}|0`].status, 'Granted');
  const fresh = {};
  ensureTestingScenarios(fresh);
  assert.equal(fresh['open-applications-all'].filter(request => request.ref === reference).length, 2);
});

test('restores fixture rows after mock regeneration without replacing session progress', () => {
  const data = {};
  ensureTestingScenarios(data);
  data['open-applications-all'] = [];
  ensureTestingScenarios(data);
  assert.equal(data['open-applications-all'].filter(request => request.ref === reference).length, 2);
  data['redetermination-decision-store'] = { [`${reference}|0`]: { status: 'Granted' } };
  data['open-applications-all'] = [];
  ensureTestingScenarios(data);
  assert.deepEqual(data['open-applications-all'].filter(request => request.ref === reference).map(request => request.redeterminationOrder), [1]);
});

test('secure accommodation scenario persists edits and decisions and resets in a fresh session', () => {
  const data = {};
  const reference = 'L-VXQO-YZBU';
  ensureTestingScenarios(data);
  const request = data['open-applications-all'].find(application => application.ref === reference);
  assert.equal(request.redeterminationProceeding, 'Secure accommodation order');
  assert.equal(request.status, undefined);
  data['assigned-applications'] = [request];
  data['open-applications-all'] = data['open-applications-all'].filter(application => application.ref !== reference);
  data['grouped-redetermination-edits'] = { [reference]: { 0: { proceedingName: 'Child assessment order', changeExplanation: 'Correcting provider selection' } } };
  data['app-history'][reference].push({ action: 'Note added', details: 'Research note' });
  const original = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, original);
  data['redetermination-decision-store'] = { [`${reference}|0`]: { status: 'Granted', redeterminationProceeding: 'Child assessment order' } };
  data['assigned-applications'] = [];
  data['grouped-redetermination-completed'] = { [reference]: true };
  ensureTestingScenarios(data);
  assert.ok(!data['open-applications-all'].some(application => application.ref === reference));
  const fresh = {};
  ensureTestingScenarios(fresh);
  assert.equal(fresh['open-applications-all'].find(application => application.ref === reference).redeterminationProceeding, 'Secure accommodation order');
});

test('mixed-decision scenario starts with three undecided requests and stable provider information', () => {
  const data = {};
  ensureTestingScenarios(data);
  const reference = 'Y-HCMT-YBYZ';
  const requests = data['open-applications-all'].filter(application => application.ref === reference);
  assert.deepEqual(requests.map(request => request.redeterminationProceeding), [
    'Emergency protection order', 'Secure accommodation order', 'Supervision order'
  ]);
  assert.deepEqual(requests.map(request => request.redeterminationOrder), [0, 1, 2]);
  assert.equal(new Set(requests.map(request => request.redeterminationId)).size, 3);
  assert.ok(requests.every(request => request.status === undefined && request.groupedRedeterminationFlow));
  assert.ok(!data['grouped-redetermination-edits']?.[reference]);
  const answers = data['redetermination-provider-answers-v4'][reference];
  assert.equal(answers.schemaVersion, 6);
  assert.deepEqual(answers.proceedingAnswers.map(answer => answer.proceedingName), requests.map(request => request.redeterminationProceeding));
  assert.equal(data['app-history'][reference].at(-1).redeterminationCount, 3);
  const original = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, original);
});

test('mixed-decision scenario retains assignment, refusal reasons, proceeding edits and notes', () => {
  const data = {};
  const reference = 'Y-HCMT-YBYZ';
  ensureTestingScenarios(data);
  data['assigned-applications'] = data['open-applications-all'].filter(application => application.ref === reference);
  data['open-applications-all'] = data['open-applications-all'].filter(application => application.ref !== reference);
  data['grouped-redetermination-edits'] = { [reference]: { 2: { proceedingName: 'Child assessment order', changeExplanation: 'Correcting provider selection' } } };
  data['grouped-redetermination-drafts'] = { [reference]: { decisions: [
    { index: 0, decision: 'refuse', explanation: 'Emergency protection evidence missing.' },
    { index: 1, decision: 'refuse', explanation: 'Secure accommodation evidence missing.' }
  ] } };
  data['app-history'][reference].push({ action: 'Note added', details: 'Research note' });
  const original = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, original);
  data['redetermination-decision-store'] = {
    [`${reference}|0`]: { status: 'Refused', explanation: 'Emergency protection evidence missing.' },
    [`${reference}|1`]: { status: 'Refused', explanation: 'Secure accommodation evidence missing.' },
    [`${reference}|2`]: { status: 'Granted', redeterminationProceeding: 'Child assessment order' }
  };
  data['assigned-applications'] = [];
  const completed = JSON.parse(JSON.stringify(data));
  ensureTestingScenarios(data);
  assert.deepEqual(data, completed);
  data['grouped-redetermination-completed'] = { [reference]: true };
  delete data['redetermination-decision-store'];
  ensureTestingScenarios(data);
  assert.ok(!data['open-applications-all'].some(application => application.ref === reference));
  const fresh = {};
  ensureTestingScenarios(fresh);
  assert.deepEqual(fresh['open-applications-all'].filter(application => application.ref === reference).map(request => request.redeterminationProceeding), [
    'Emergency protection order', 'Secure accommodation order', 'Supervision order'
  ]);
  assert.ok(!fresh['grouped-redetermination-edits']?.[reference]);
});
