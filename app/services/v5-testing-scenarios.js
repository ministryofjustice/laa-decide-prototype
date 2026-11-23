const REFERENCE = 'M-MDDT-WBYS';
const references = [REFERENCE, 'L-VXQO-YZBU', 'Y-HCMT-YBYZ', 'L-YU5-UY3'];
const PROCEEDINGS = [
  'Emergency protection order - extend',
  'Emergency protection order - discharge'
];
const LOUISE_JUSTIFICATION = {
  changesSinceDecision: "Since the previous decision, there is a disagreement about Louise's contact with her mother, and the local authority has applied for a secure accommodation order concerning Louise.",
  dispute: "Louise needs representation to participate in the contact and secure accommodation proceedings, understand the local authority's application and put her wishes to the court.",
  clientSeeking: 'Louise wants to maintain contact with her mother and have her wishes and circumstances considered by the court in the secure accommodation proceedings.'
};

function ensureTestingScenarios(data) {
  for (const reference of references) {
    if (data['mock-request-types']) delete data['mock-request-types'][reference];
  }
  ensureChangeProceedingScenario(data);
  ensureMixedDecisionScenario(data);
  ensureLouiseBevanScenario(data);
  const collections = ['open-applications-all', 'open-applications', 'assigned-applications', 'completed-applications'];
  data['open-applications-all'] = data['open-applications-all'] || [];
  data['completed-applications'] = data['completed-applications'] || [];
  const applications = collections.flatMap(key => data[key] || []);
  const client = {
    ref: REFERENCE,
    reference: REFERENCE,
    firstName: 'Alex',
    lastName: 'Morgan',
    dob: '12 Jan 1980',
    firm: 'WATKINS SOLICITORS INC<br>OK514R',
    opponentName: 'Manchester City Council',
    children: [
      { name: 'Jamie Morgan', dob: '20 Dec 2018' },
      { name: 'Casey Morgan', dob: '15 Jan 2021' }
    ],
    matterType: { title: 'Family', subtext: 'Special Children Act' },
    isPriorAuthority: false
  };

  if (!applications.some(app => app.ref === REFERENCE && !app.isRedetermination && !app.isPriorAuthority)) {
    data['completed-applications'].push({
      ...client,
      submitted: '01 Jul 2026',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      status: 'Granted',
      decisionType: 'Grant',
      certDate: '03 Jul 2026',
      caseworker: 'Sarah Johnson'
    });
  }

  PROCEEDINGS.forEach((proceeding, index) => {
    const id = `${REFERENCE}-redetermination-${index + 1}`;
    if (applications.some(app => app.redeterminationId === id)
      || data['redetermination-decision-store']?.[`${REFERENCE}|${index}`]
      || data['grouped-redetermination-completed']?.[REFERENCE]) return;
    data['open-applications-all'].push({
      ...client,
      submitted: '14 Jul 2026',
      type: 'Redetermination',
      delegatedFunctions: 'N/A',
      isRedetermination: true,
      groupedRedeterminationFlow: true,
      redeterminationType: 'Add a proceeding',
      redeterminationId: id,
      redeterminationOrder: index,
      redeterminationProceeding: proceeding,
      redeterminationClientRole: 'Respondent',
      redeterminationParentalResponsibility: 'Yes',
      redeterminationFinalOrderMade: 'No',
      redeterminationJustification: 'The local authority seeks an extension of the emergency protection order. The client opposes the extension and seeks discharge. Representation is requested for both applications at the hearing on 17 July 2026.'
    });
  });

  data['app-history'] = data['app-history'] || {};
  if (!data['app-history'][REFERENCE]) {
    data['app-history'][REFERENCE] = [
      { timestamp: '01 Jul 2026 09:00', action: 'Initial application received', caseworker: 'N/A', details: 'Application for representation in care and supervision proceedings. The provider supplied the initial merits report.' },
      { timestamp: '02 Jul 2026 10:00', action: 'Initial application assigned to Sarah Johnson', caseworker: 'Sarah Johnson' },
      { timestamp: '03 Jul 2026 11:00', action: 'Initial application granted', caseworker: 'Sarah Johnson', details: 'Full representation granted for care and supervision proceedings, with a substantive cost limit of £25,000. The emergency protection extension and discharge applications are not included in the original scope.', changes: { From: 'In progress', To: 'Granted' } },
      { timestamp: '10 Jul 2026 14:00', action: 'Caseworker note added', caseworker: 'Sarah Johnson', type: 'note', details: 'Provider reports an emergency protection order was made on 10 July. The local authority proposes an extension. The client disputes the continuing need for the order and proposes a family placement. No final care or supervision order has been made.' },
      { timestamp: '14 Jul 2026 09:30', action: 'Redetermination request received', caseworker: 'N/A', redeterminationId: `${REFERENCE}-grouped-redetermination-received`, redeterminationCount: 2, redeterminationType: 'Add a proceeding', details: 'Funding requested for the emergency protection order extension and discharge applications. Updated statement of case received. Hearing listed for 17 July 2026.' }
    ];
  }
  data['generated-redetermination-history'] = data['generated-redetermination-history'] || {};
  data['generated-redetermination-history'][REFERENCE] = true;

  data['redetermination-provider-answers-v4'] = data['redetermination-provider-answers-v4'] || {};
  if (!data['redetermination-provider-answers-v4'][REFERENCE]) {
    data['redetermination-provider-answers-v4'][REFERENCE] = {
      schemaVersion: 6,
      parentalResponsibility: 'Yes',
      finalOrderMade: 'No',
      finalOrderDetails: [],
      issuedBy: 'Manchester City Council',
      hearingDate: '17 July 2026',
      justificationScenario: 0,
      justificationProceedings: JSON.stringify([...PROCEEDINGS].sort()),
      changesSinceDecision: 'Since the initial grant on 3 July, an emergency protection order was made on 10 July. The local authority now seeks an extension. The client has provided a proposed family placement and seeks discharge of the order. These applications were not covered by the original grant.',
      dispute: 'The parties disagree about whether emergency protection remains necessary and whether the proposed family placement addresses the local authority concerns. The provider needs to review the updated evidence, respond to the extension application and present the discharge application at the same hearing.',
      clientSeeking: 'The client opposes the extension and asks the court to discharge the emergency protection order. Funding is sought for representation in both applications; this is not a request for both orders to be made.',
      proceedingAnswers: PROCEEDINGS.map((name, index) => ({
        redeterminationId: `${REFERENCE}-redetermination-${index + 1}`,
        proceedingName: name,
        proceedingType: 'Related',
        heardTogether: 'Yes',
        heardTogetherWith: 'Care order',
        childrenCovered: ['Jamie Morgan', 'Casey Morgan']
      }))
    };
  }
}

function ensureChangeProceedingScenario(data) {
  const reference = 'L-VXQO-YZBU';
  const id = `${reference}-redetermination-1`;
  const proceeding = 'Secure accommodation order';
  const collections = ['open-applications-all', 'open-applications', 'assigned-applications', 'completed-applications'];
  const applications = collections.flatMap(key => data[key] || []);
  data['open-applications-all'] = data['open-applications-all'] || [];
  data['completed-applications'] = data['completed-applications'] || [];
  const client = {
    ref: reference,
    reference,
    firstName: 'Taylor',
    lastName: 'Reed',
    dob: '22 Aug 1985',
    firm: 'WATKINS SOLICITORS INC<br>OK514R',
    opponentName: 'Leeds City Council',
    children: [
      { name: 'Jordan Reed', dob: '12 Mar 2011' },
      { name: 'Sam Reed', dob: '18 Sep 2015' }
    ],
    matterType: { title: 'Family', subtext: 'Special Children Act' },
    isPriorAuthority: false
  };
  if (!applications.some(app => app.ref === reference && !app.isRedetermination && !app.isPriorAuthority)) {
    data['completed-applications'].push({
      ...client,
      submitted: '01 Jul 2026',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      status: 'Granted',
      decisionType: 'Grant',
      certDate: '03 Jul 2026',
      caseworker: 'Emma Wilson'
    });
  }
  if (!applications.some(app => app.redeterminationId === id)
    && !data['redetermination-decision-store']?.[`${reference}|0`]
    && !data['grouped-redetermination-completed']?.[reference]) {
    data['open-applications-all'].push({
      ...client,
      submitted: '14 Jul 2026',
      type: 'Redetermination',
      delegatedFunctions: 'N/A',
      isRedetermination: true,
      groupedRedeterminationFlow: true,
      redeterminationType: 'Add a proceeding',
      redeterminationId: id,
      redeterminationOrder: 0,
      redeterminationProceeding: proceeding,
      redeterminationClientRole: 'Respondent',
      redeterminationParentalResponsibility: 'Yes',
      redeterminationFinalOrderMade: 'No',
      redeterminationJustification: 'The provider selected a secure accommodation order when requesting funding for additional proceedings concerning Jordan Reed. The caseworker should review the provider information and confirm the appropriate proceeding before making a decision.'
    });
  }
  data['app-history'] = data['app-history'] || {};
  if (!data['app-history'][reference]) {
    data['app-history'][reference] = [
      { timestamp: '01 Jul 2026 09:00', action: 'Initial application received', caseworker: 'N/A', details: 'Application for representation in care and supervision proceedings concerning Jordan and Sam Reed.' },
      { timestamp: '02 Jul 2026 10:00', action: 'Initial application assigned to Emma Wilson', caseworker: 'Emma Wilson' },
      { timestamp: '03 Jul 2026 11:00', action: 'Initial application granted', caseworker: 'Emma Wilson', details: 'Full representation granted for care and supervision proceedings.', changes: { From: 'In progress', To: 'Granted' } },
      { timestamp: '14 Jul 2026 09:30', action: 'Redetermination request received', caseworker: 'N/A', redeterminationId: `${reference}-grouped-redetermination-received`, redeterminationCount: 1, redeterminationType: 'Add a proceeding', details: 'Provider selected Secure accommodation order for the additional proceeding. Review the selection against the provider information.' }
    ];
  }
  data['generated-redetermination-history'] = data['generated-redetermination-history'] || {};
  data['generated-redetermination-history'][reference] = true;
  data['redetermination-provider-answers-v4'] = data['redetermination-provider-answers-v4'] || {};
  if (!data['redetermination-provider-answers-v4'][reference]) {
    data['redetermination-provider-answers-v4'][reference] = {
      schemaVersion: 6,
      parentalResponsibility: 'Yes',
      finalOrderMade: 'No',
      finalOrderDetails: [],
      issuedBy: 'Leeds City Council',
      hearingDate: '20 July 2026',
      justificationScenario: 0,
      justificationProceedings: JSON.stringify([proceeding]),
      changesSinceDecision: 'The provider has submitted a request for an additional proceeding concerning Jordan Reed since the initial grant. Secure accommodation order was selected on the request.',
      dispute: 'The parties disagree about the proposed arrangements for Jordan. The client needs representation to respond to the local authority evidence and present their position.',
      clientSeeking: 'The client wants the court to consider their proposed arrangements for Jordan. The provider requests funding for representation in the additional proceeding.',
      proceedingAnswers: [{
        redeterminationId: id,
        proceedingName: proceeding,
        proceedingType: 'Standalone',
        childSubjectOfSecureAccommodation: 'No',
        proceedingIssued: 'Yes',
        childrenCovered: ['Jordan Reed']
      }]
    };
  }
}

function ensureMixedDecisionScenario(data) {
  const reference = 'Y-HCMT-YBYZ';
  const proceedings = ['Emergency protection order', 'Secure accommodation order', 'Supervision order'];
  const collections = ['open-applications-all', 'open-applications', 'assigned-applications', 'completed-applications'];
  const applications = collections.flatMap(key => data[key] || []);
  data['open-applications-all'] = data['open-applications-all'] || [];
  data['completed-applications'] = data['completed-applications'] || [];
  const client = {
    ref: reference,
    reference,
    firstName: 'Robin',
    lastName: 'Patel',
    dob: '09 May 1982',
    firm: 'WATKINS SOLICITORS INC<br>OK514R',
    opponentName: 'Birmingham City Council',
    children: [
      { name: 'Charlie Patel', dob: '16 Feb 2011' },
      { name: 'Ellis Patel', dob: '24 Jun 2016' }
    ],
    matterType: { title: 'Family', subtext: 'Special Children Act' },
    isPriorAuthority: false
  };
  if (!applications.some(app => app.ref === reference && !app.isRedetermination && !app.isPriorAuthority)) {
    data['completed-applications'].push({
      ...client,
      submitted: '01 Jul 2026',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      status: 'Granted',
      decisionType: 'Grant',
      certDate: '03 Jul 2026',
      caseworker: 'Emma Wilson'
    });
  }
  proceedings.forEach((proceeding, index) => {
    const id = `${reference}-redetermination-${index + 1}`;
    if (applications.some(app => app.redeterminationId === id)
      || data['redetermination-decision-store']?.[`${reference}|${index}`]
      || data['grouped-redetermination-completed']?.[reference]) return;
    data['open-applications-all'].push({
      ...client,
      submitted: '14 Jul 2026',
      type: 'Redetermination',
      delegatedFunctions: 'N/A',
      isRedetermination: true,
      groupedRedeterminationFlow: true,
      redeterminationType: 'Add a proceeding',
      redeterminationId: id,
      redeterminationOrder: index,
      redeterminationProceeding: proceeding,
      redeterminationClientRole: 'Respondent',
      redeterminationParentalResponsibility: 'Yes',
      redeterminationFinalOrderMade: 'No',
      redeterminationJustification: 'The provider requests funding for emergency protection, secure accommodation and supervision proceedings. Review each request against the updated information and check that the selected proceedings reflect the representation required.'
    });
  });
  data['app-history'] = data['app-history'] || {};
  if (!data['app-history'][reference]) {
    data['app-history'][reference] = [
      { timestamp: '01 Jul 2026 09:00', action: 'Initial application received', caseworker: 'N/A', details: 'Application for representation in care proceedings concerning Charlie and Ellis Patel.' },
      { timestamp: '03 Jul 2026 11:00', action: 'Initial application granted', caseworker: 'Emma Wilson', details: 'Full representation granted for care proceedings. The additional proceedings now requested were not included in the original scope.', changes: { From: 'In progress', To: 'Granted' } },
      { timestamp: '14 Jul 2026 09:30', action: 'Redetermination request received', caseworker: 'N/A', redeterminationId: `${reference}-grouped-redetermination-received`, redeterminationCount: 3, redeterminationType: 'Add a proceeding', details: 'Funding requested for Emergency protection order, Secure accommodation order and Supervision order. Updated provider information received.' }
    ];
  }
  data['generated-redetermination-history'] = data['generated-redetermination-history'] || {};
  data['generated-redetermination-history'][reference] = true;
  data['redetermination-provider-answers-v4'] = data['redetermination-provider-answers-v4'] || {};
  if (!data['redetermination-provider-answers-v4'][reference]) {
    data['redetermination-provider-answers-v4'][reference] = {
      schemaVersion: 6,
      parentalResponsibility: 'Yes',
      finalOrderMade: 'No',
      finalOrderDetails: [],
      issuedBy: 'Birmingham City Council',
      hearingDate: '20 July 2026',
      justificationScenario: 0,
      justificationProceedings: JSON.stringify([...proceedings].sort()),
      changesSinceDecision: 'Since the initial grant, the local authority has reviewed the proposed arrangements for the children. The provider has requested three additional proceedings and supplied an updated account of the client position.',
      dispute: 'The client disputes the proposed restrictions and wants the court to consider family care arrangements. The provider has not supplied separate applications or supporting evidence for the emergency protection and secure accommodation requests. The supervision selection should be checked against the representation described.',
      clientSeeking: 'The client seeks representation to challenge the local authority proposals and present alternative arrangements for the children. The provider requests funding for all three selected proceedings.',
      proceedingAnswers: proceedings.map((name, index) => ({
        redeterminationId: `${reference}-redetermination-${index + 1}`,
        proceedingName: name,
        proceedingType: 'Related',
        heardTogether: 'Yes',
        heardTogetherWith: 'Care order',
        ...(name === 'Secure accommodation order' ? { childSubjectOfSecureAccommodation: 'No', proceedingIssued: 'No' } : {}),
        childrenCovered: name === 'Secure accommodation order' ? ['Charlie Patel'] : ['Charlie Patel', 'Ellis Patel']
      }))
    };
  }
}

function ensureLouiseBevanScenario(data) {
  const reference = 'L-YU5-UY3';
  const proceedings = ['Contact with a child in care', 'Secure accommodation order'];
  const applications = ['open-applications-all', 'open-applications', 'assigned-applications', 'completed-applications']
    .flatMap(key => data[key] || []);
  data['open-applications-all'] = data['open-applications-all'] || [];
  data['completed-applications'] = data['completed-applications'] || [];
  const client = {
    ref: reference,
    reference,
    firstName: 'Louise',
    lastName: 'Bevan',
    dob: '15 May 2011',
    firm: 'Bevan Family Law<br>BF123A',
    opponentName: 'Manchester City Council',
    children: [{ name: 'Louise Bevan', dob: '15 May 2011' }],
    matterType: { title: 'Family', subtext: 'Special Children Act' },
    isPriorAuthority: false
  };
  for (const application of applications.filter(app => app.ref === reference)) {
    if (application.dob === 'Not supplied (aged 15)') application.dob = client.dob;
    if (application.firm === 'Not supplied') application.firm = client.firm;
    if (application.opponentName === 'Local authority (name not supplied)') application.opponentName = client.opponentName;
    for (const child of application.children || []) {
      if (child.name === 'Louise Bevan' && child.dob === 'Not supplied') child.dob = client.dob;
    }
    if (!application.isRedetermination && !application.isPriorAuthority) {
      if (application.submitted === 'Not supplied') application.submitted = '1 Jul 2026';
      if (application.delegatedFunctions === 'Not supplied') application.delegatedFunctions = 'Not used';
    }
  }
  if (!applications.some(app => app.ref === reference && !app.isRedetermination && !app.isPriorAuthority)) {
    data['completed-applications'].push({
      ...client,
      submitted: '1 Jul 2026',
      type: 'Initial application',
      delegatedFunctions: 'Not used',
      status: 'Granted',
      decisionType: 'Grant'
    });
  }
  proceedings.forEach((proceeding, index) => {
    const id = `${reference}-redetermination-${index + 1}`;
    if (applications.some(app => app.redeterminationId === id)
      || data['redetermination-decision-store']?.[`${reference}|${index}`]
      || data['grouped-redetermination-completed']?.[reference]) return;
    data['open-applications-all'].push({
      ...client,
      submitted: '23 Nov 2026',
      type: 'Redetermination',
      delegatedFunctions: 'N/A',
      isRedetermination: true,
      groupedRedeterminationFlow: true,
      redeterminationType: 'Add a proceeding',
      redeterminationId: id,
      redeterminationOrder: index,
      redeterminationProceeding: proceeding,
      redeterminationClientRole: index === 0 ? 'Applicant' : 'Child subject of proceedings',
      applicationType: 'Substantive',
      levelOfService: 'Full representation',
      scopeLimitations: 'Limited to all steps up to and including final hearing and any action necessary to implement (but not enforce) the order.',
      redeterminationFinalOrderMade: 'Yes'
    });
  });
  data['app-history'] = data['app-history'] || {};
  if (!data['app-history'][reference]) {
    data['app-history'][reference] = [
      { timestamp: '3 Jul 2026', action: 'Initial application granted', caseworker: 'Emma Wilson', details: 'Existing certificate covers ongoing care proceedings. Louise is described as subject to an interim care order.' },
      { timestamp: '23 Nov 2026', action: 'Redetermination request received', caseworker: 'N/A', redeterminationId: `${reference}-grouped-redetermination-received`, redeterminationCount: 2, redeterminationType: 'Add a proceeding', details: 'Mock submission date. The provider requested Contact with a child in care and Secure accommodation order.' }
    ];
  }
  for (const event of data['app-history'][reference]) {
    if (event.action === 'Initial application granted' && event.timestamp === 'Date not supplied' && event.caseworker === 'Not supplied') {
      event.timestamp = '3 Jul 2026';
      event.caseworker = 'Emma Wilson';
    }
  }
  data['generated-redetermination-history'] = data['generated-redetermination-history'] || {};
  data['generated-redetermination-history'][reference] = true;
  data['redetermination-provider-answers-v4'] = data['redetermination-provider-answers-v4'] || {};
  if (!data['redetermination-provider-answers-v4'][reference]) {
    data['redetermination-provider-answers-v4'][reference] = {
      schemaVersion: 6,
      preserveSubmittedAnswers: true,
      parentalResponsibility: 'No',
      finalOrderMade: 'Yes',
      finalOrderDetails: [{ date: '23 November 2026' }],
      justificationProceedings: JSON.stringify([...proceedings].sort()),
      ...LOUISE_JUSTIFICATION,
      proceedingAnswers: [
        {
          redeterminationId: `${reference}-redetermination-1`,
          proceedingName: proceedings[0],
          proceedingType: 'Related',
          heardTogether: 'No',
          heardAsAlternative: 'No',
          childrenCovered: ['Louise Bevan']
        },
        {
          redeterminationId: `${reference}-redetermination-2`,
          proceedingName: proceedings[1],
          proceedingType: 'Standalone',
          childSubjectOfSecureAccommodation: 'Yes',
          proceedingIssued: 'Yes',
          childrenCovered: ['Louise Bevan']
        }
      ]
    };
  }
  const answers = data['redetermination-provider-answers-v4'][reference];
  if (answers.parentalResponsibility === 'Not supplied') answers.parentalResponsibility = 'No';
  for (const [key, value] of Object.entries(LOUISE_JUSTIFICATION)) {
    if (answers[key] === 'Not supplied in the walkthrough') answers[key] = value;
  }
}

const documents = {
  merits: {
    title: 'Initial merits report',
    date: '1 July 2026',
    paragraphs: [
      'The client, Alex Morgan, is the respondent in care and supervision proceedings concerning Jamie and Casey Morgan. The local authority has raised concerns about the proposed care arrangements. The client disputes the assessment and seeks consideration of a family placement.',
      'The provider requests full representation to review the assessments, obtain instructions and present the client position. At this stage no final order has been made. The request covers care and supervision proceedings, not an emergency protection order extension or discharge.',
      'This report records the information available before the initial grant. Compare it with the updated statement of case dated 14 July 2026 when assessing the additional proceedings.'
    ]
  },
  certificate: {
    title: 'Initial certificate',
    date: '3 July 2026',
    paragraphs: [
      'Client: Alex Morgan. Proceedings: Care order and Supervision order. Client role: Respondent. Substantive level of service: Full representation.',
      'Scope: All steps up to and including final hearing and any action necessary to implement, but not enforce, the order. Substantive cost limit: £25,000.',
      'This mock certificate records the initial grant only. It does not include funding for the subsequent emergency protection order extension and discharge requests.'
    ]
  },
  statement: {
    title: 'Updated statement of case',
    date: '14 July 2026',
    paragraphs: [
      'An emergency protection order was made on 10 July 2026. Manchester City Council seeks an extension. The client opposes continued emergency protection and has instructed the provider to seek discharge.',
      'Since the initial grant, the client has proposed a family placement. The local authority disputes whether this proposal addresses its concerns. Both applications are listed for consideration with the care proceedings on 17 July 2026.',
      'The provider requests funding to respond to the extension application and present the discharge application. Funding for both enables representation on competing applications; it does not imply that the court should grant both orders.'
    ]
  }
};

module.exports = { ensureTestingScenarios, documents, references };
