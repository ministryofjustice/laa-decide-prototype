const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureRepeatableExperts, scenarios } = require('./consolidated-repeatable-experts');

test('creates stable expert scenarios and leaves in-progress assignments intact', () => {
  const data = { 'open-applications-all': [], 'completed-applications': [], 'assigned-applications': [] };
  ensureRepeatableExperts(data);
  assert.equal(data['open-applications-all'].length, 2);
  assert.equal(data['completed-applications'].length, 2);
  const expert = data['open-applications-all'].shift();
  expert.expertJustification = 'Updated during assessment';
  data['assigned-applications'].push(expert);
  ensureRepeatableExperts(data);
  assert.equal(data['open-applications-all'].length, 1);
  assert.equal(data['assigned-applications'][0].expertJustification, 'Updated during assessment');
  assert.deepEqual(scenarios.map(scenario => scenario.apportioned), [false, true]);
});

test('resets completed requests independently without clearing other session progress', () => {
  const data = { 'open-applications-all': [], 'completed-applications': [], 'assigned-applications': [] };
  ensureRepeatableExperts(data);
  const [expert, apportioned] = data['open-applications-all'];
  data['open-applications-all'] = [];
  data['assigned-applications'] = [apportioned, { ref: 'OTHER', isPriorAuthority: false }];
  data['completed-applications'].push({ ...expert, status: 'Refused' });
  data['open-applications'] = [{ ...expert, status: 'Refused' }];
  data['expert-assessment-reference'] = expert.ref;
  data['expert-decision'] = 'Refuse';
  data['app-history'] = {
    [expert.ref]: [{ type: 'decision' }, { type: 'pa_decision' }, { type: 'pa_assignment' }, { type: 'note' }],
    OTHER: [{ type: 'note' }]
  };
  ensureRepeatableExperts(data);
  assert.deepEqual(data['open-applications-all'].map(app => app.ref), [expert.ref]);
  assert.equal(data['open-applications-all'][0].status, undefined);
  assert.equal(data['assigned-applications'].length, 2);
  assert.equal(data['completed-applications'].filter(app => app.ref === expert.ref && app.isPriorAuthority).length, 0);
  assert.deepEqual(data['app-history'][expert.ref].map(event => event.type), ['decision', 'note']);
  assert.deepEqual(data['app-history'].OTHER, [{ type: 'note' }]);
  assert.equal(data['expert-decision'], undefined);
  ensureRepeatableExperts(data);
  assert.equal(data['open-applications-all'].length, 1);
});
