const test = require('node:test');
const assert = require('node:assert/strict');
const { colleagues, ensureColleagueLists, findColleague } = require('./consolidated-colleague-lists');

test('colleague example cases are seeded once without replacing progress or duplicating existing cases', () => {
  const data = { 'assigned-applications': [{ ref: 'W-YOB-I01' }] };
  ensureColleagueLists(data);
  const list = data['consolidated-colleague-applications-v6'];
  assert.equal(list.length, 3);
  list.pop();
  ensureColleagueLists(data);
  assert.equal(data['consolidated-colleague-applications-v6'].length, 2);
  list.splice(0);
  ensureColleagueLists(data);
  assert.equal(data['consolidated-colleague-applications-v6'].length, 0);
});

test('colleagues can be selected by name, email or displayed suggestion', () => {
  assert.equal(findColleague(' Darren Horne ').name, 'Darren Horne');
  assert.equal(findColleague('DARREN.HORNE@JUSTICE.GOV.UK').name, 'Darren Horne');
  assert.equal(findColleague('Darren Horne - darren.horne@justice.gov.uk').name, 'Darren Horne');
  assert.equal(findColleague('Darren'), undefined);
});

test('mock directory includes a variety of unique names and emails', () => {
  assert.ok(colleagues.length >= 15);
  assert.equal(new Set(colleagues.map(person => person.name.toLowerCase())).size, colleagues.length);
  assert.equal(new Set(colleagues.map(person => person.email.toLowerCase())).size, colleagues.length);
  assert.ok(colleagues.filter(person => person.name.toLowerCase().includes('darren')).length > 1);
  for (const person of colleagues) {
    assert.equal(findColleague(person.name), person);
    assert.equal(findColleague(person.email), person);
  }
});
