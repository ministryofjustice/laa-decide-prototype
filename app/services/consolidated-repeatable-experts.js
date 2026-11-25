const scenarios = [
  { reference: 'E-XPT-001', firstName: 'Hannah', lastName: 'Morris', apportioned: false },
  { reference: 'A-APP-002', firstName: 'Daniel', lastName: 'Evans', apportioned: true }
];

function priorAuthority(scenario) {
  return {
    ref: scenario.reference,
    reference: scenario.reference,
    firstName: scenario.firstName,
    lastName: scenario.lastName,
    dob: '12 Jan 1980',
    submitted: '15 Feb 2026',
    firm: 'WATKINS SOLICITORS INC<br>OK514R',
    type: 'Prior authority',
    priorAuthorityType: 'Expert - Psychiatrist',
    delegatedFunctions: 'N/A',
    matterType: { title: 'Family', subtext: 'Special Children Act' },
    isPriorAuthority: true,
    expertName: 'Dr Morley Calzoni',
    expertType: 'Psychiatrist',
    expertLocation: 'London',
    expertHours: '60',
    expertMinutes: '00',
    expertRate: '100.80',
    expertRequestedAmount: '6048.00',
    expertJustification: 'A psychiatric assessment is required by the court.',
    apportioned: scenario.apportioned,
    ...(scenario.apportioned ? { numberOfParties: '2', amountClaimedForPriorAuthority: '3024.00' } : {})
  };
}

function ensureRepeatableExperts(data) {
  const assigned = data['assigned-applications'];
  const colleagues = data['consolidated-colleague-applications-v6'] || [];

  for (const scenario of scenarios) {
    const matches = app => app.ref === scenario.reference && app.isPriorAuthority;
    const completedRequest = data['completed-applications'].find(matches);
    if (completedRequest && ['Granted', 'Refused'].includes(completedRequest.status)) {
      data['completed-applications'] = data['completed-applications'].filter(app => !matches(app));
      data['open-applications-all'] = data['open-applications-all'].filter(app => !matches(app));
      if (data['open-applications']) data['open-applications'] = data['open-applications'].filter(app => !matches(app));
      if (data['app-history'] && data['app-history'][scenario.reference]) {
        data['app-history'][scenario.reference] = data['app-history'][scenario.reference]
          .filter(event => event.type !== 'pa_decision' && event.type !== 'pa_assignment');
      }
      if (data['expert-assessment-reference'] === scenario.reference) {
        Object.keys(data).filter(key => key.startsWith('expert-')).forEach(key => delete data[key]);
      }
    }

    if (!data['completed-applications'].some(app => app.ref === scenario.reference && !app.isPriorAuthority)) {
      data['completed-applications'].push({
        ...priorAuthority(scenario),
        submitted: '03 Feb 2026',
        type: 'Initial application',
        priorAuthorityType: null,
        isPriorAuthority: false,
        status: 'Granted',
        decisionType: 'Grant'
      });
    }
    if (!data['open-applications-all'].some(matches) && !assigned.some(matches) && !colleagues.some(matches)
        && !data['completed-applications'].some(matches)) {
      data['open-applications-all'].push(priorAuthority(scenario));
    }
  }
}

module.exports = { scenarios, ensureRepeatableExperts };
