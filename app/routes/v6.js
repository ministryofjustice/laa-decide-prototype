//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Helper function to restore decision data to an application
function restoreDecisionData(application, decisionStore) {
  if (!application || !decisionStore) return;
  const ref = application.ref;
  if (decisionStore[ref]) {
    const stored = decisionStore[ref];
    application.status = stored.status;
    application.decisionDate = stored.decisionDate;
    application.decisionType = stored.decisionType;
    if (stored.certDate) application.certDate = stored.certDate;
    if (stored.refusalReason) application.refusalReason = stored.refusalReason;
  }
}

// Helper function to reconstruct application state at a specific version
function reconstructApplicationAtVersion(application, history, versionIndex) {
  if (!application || !history || versionIndex === undefined) {
    return application;
  }

  // Clone the application to avoid mutating the original
  const reconstructed = JSON.parse(JSON.stringify(application));
  
  // Apply all events up to and including the specified version
  for (let i = 0; i <= versionIndex && i < history.length; i++) {
    const event = history[i];
    
    // Handle status changes (for main application or PA decisions)
    if (event.statusAfter) {
      if (event.type === 'pa_decision') {
        reconstructed.priorAuthorityStatus = event.statusAfter;
      } else {
        reconstructed.status = event.statusAfter;
        reconstructed.decisionType = event.statusAfter === 'Granted' ? 'Grant' : 
                                     event.statusAfter === 'Refused' ? 'Refuse' : null;
      }
    }
    
    // Handle data changes (name, address, etc.)
    if (event.fieldChanged) {
      switch (event.fieldChanged) {
        case 'firstName':
          reconstructed.firstName = event.newValue;
          break;
        case 'address':
          reconstructed.address = event.newValue;
          break;
        case 'correspondenceAddress':
          reconstructed.correspondenceAddress = event.newValue;
          break;
        case 'priorAuthorityType':
          reconstructed.priorAuthorityType = event.newValue;
          break;
      }
    }
  }
  
  return reconstructed;
}

// add an item to the application history

router.post('/send-back-check', function(request, response) {

    var sendbackCheck = request.session.data['rejection-reason']
    if (sendbackCheck == "rfi") {
        response.redirect("/v6/my-applications-rfi")
    }  else if (sendbackCheck == "withdraw") {
      response.redirect("/v6/my-applications-withdraw")
    }  else {
      response.redirect("/v6/my-applications-rejected")
    }
});

router.post('/merits-check', function(request, response) {

    var meritsCheck = request.session.data['application_2_proceeding_1_certificate_1']
    if (meritsCheck == "granted") {
        response.redirect("/v6/merits-assessment-emergency-costs")
    } else {
      response.redirect("/v6/merits-assessment-substantive")
    }
});

router.post('/merits-check2', function(request, response) {

    var meritsCheck2 = request.session.data['application_1_proceeding_1_certificate_2']
    if (meritsCheck2 == "granted") {
        response.redirect("/v6/merits-assessment-substantive-costs")
    } else {
      response.redirect("/v6/decision-communication")
    }
});

router.get('/decision-start', function(req, res) {
  const reference = req.query.ref;
  if (reference) {
    req.session.data['decision-reference'] = reference;
  }
  res.redirect('/v6/overall-decision');
});

router.post('/decision-check', function(request, response) {
    var decisionCheck = request.session.data['overall-decision']
    if (decisionCheck == "refuse") {
        response.redirect("/v6/refuse-reason")
    } else {
      response.redirect("/v6/grant-certificate-date")
    }
});

router.post('/grant-date-submit', function(request, response) {
    // Certificate date data stored in session from form
    var certDateType = request.session.data['cert-date-type']
    var displayDate = "12 June 2026" // Default
    
    // Get the application to find its submitted date
    var decisionReference = request.session.data['decision-reference']
    var application = null
    
    // Search for application in assigned or open applications
    if (request.session.data['assigned-applications']) {
        application = request.session.data['assigned-applications'].find(app => app.ref === decisionReference)
    }
    if (!application && request.session.data['open-applications']) {
        application = request.session.data['open-applications'].find(app => app.ref === decisionReference)
    }
    
    if (certDateType === 'another-date') {
        // Format the entered date
        var day = request.session.data['cert-date-day']
        var month = request.session.data['cert-date-month']
        var year = request.session.data['cert-date-year']
        if (day && month && year) {
            // Format as "DD Mon YYYY"
            var monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            displayDate = parseInt(day) + ' ' + monthNames[parseInt(month)] + ' ' + year
        }
    } else if (certDateType === 'today') {
        displayDate = "27 Jun 2026"
    } else if (certDateType === 'delegated-date') {
        // Use the application's submitted date if available
        if (application && application.submitted) {
            displayDate = application.submitted
        } else {
            displayDate = "27 Jun 2026"
        }
    }
    
    request.session.data['cert-date-display'] = displayDate
    response.redirect("/v6/check-answers")
});

router.post('/refuse-submit', function(request, response) {
    // Refusal reason and justification stored in session from form
    response.redirect("/v6/check-answers")
});

router.post('/refuse-decision-submit', function(request, response) {
    // Handle refuse decision from error page
    var decisionReference = request.session.data['decision-reference']
    var application = null
    
    // Search for application in assigned or open applications
    if (request.session.data['assigned-applications']) {
        application = request.session.data['assigned-applications'].find(app => app.ref === decisionReference)
    }
    if (!application && request.session.data['open-applications']) {
        application = request.session.data['open-applications'].find(app => app.ref === decisionReference)
    }
    
    if (application) {
        // Initialize decision store if needed
        if (!request.session.data['decision-store']) {
            request.session.data['decision-store'] = {};
        }
        
        // Update application with refuse decision
        application.status = 'Refused'
        application.decisionDate = '27 Jun 2026'
        application.decisionType = 'Refuse'
        application.refusalReason = request.session.data['refusal-reason'] || 'Applicant does not meet the merits test'
        
        // Save decision to persistent store
        request.session.data['decision-store'][decisionReference] = {
            status: 'Refused',
            decisionDate: '27 Jun 2026',
            decisionType: 'Refuse',
            refusalReason: application.refusalReason
        };
        
        // Add to application history
        if (!request.session.data['app-history']) {
            request.session.data['app-history'] = {}
        }
        if (!request.session.data['app-history'][decisionReference]) {
            request.session.data['app-history'][decisionReference] = []
        }
        
        // Generate current timestamp
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const datetime = dateStr + ' ' + timeStr;
        const caseworker = application.caseworker || 'Mo Bradshaw';
        const refusalReason = request.session.data['refusal-reason'] || 'Not specified';
        const justification = request.session.data['refuse-justification'] || '';
        
        request.session.data['app-history'][decisionReference].push({
            timestamp: datetime,
            action: 'Initial application refused',
            caseworker: caseworker,
            changes: {
              From: 'Submitted',
              To: 'Refused'
            },
            details: justification || null,
            versionLink: '/v6/application/' + decisionReference
        })
        
        // Move application from assigned to completed (decided) list
        if (request.session.data['assigned-applications']) {
            const decidedApp = request.session.data['assigned-applications'].find(app => app.ref === decisionReference)
            if (decidedApp) {
                if (!request.session.data['completed-applications']) {
                    request.session.data['completed-applications'] = []
                }
                request.session.data['completed-applications'].push(decidedApp)
                request.session.data['assigned-applications'] = request.session.data['assigned-applications'].filter(app => app.ref !== decisionReference)
            }
        }
    }
    
    response.redirect("/v6/confirmation-screen")
});

router.post('/check-answers-submit', function(request, response) {
    var overallDecision = request.session.data['overall-decision']
    var decisionReference = request.session.data['decision-reference']
    
    if (overallDecision == "refuse") {
        response.redirect("/v6/overall-decision-error")
    } else {
      // Store the decision on the application
      var application = null
      
      // Search for application in assigned or open applications
      if (request.session.data['assigned-applications']) {
          application = request.session.data['assigned-applications'].find(app => app.ref === decisionReference)
      }
      if (!application && request.session.data['open-applications']) {
          application = request.session.data['open-applications'].find(app => app.ref === decisionReference)
      }
      
      if (application) {
          // Initialize decision store if needed
          if (!request.session.data['decision-store']) {
              request.session.data['decision-store'] = {};
          }
          
          // Update application with decision
          application.status = 'Granted'
          application.decisionDate = '27 Jun 2026'
          application.decisionType = 'Grant'
          application.certDate = request.session.data['cert-date-display']
          
          // Save decision to persistent store
          request.session.data['decision-store'][decisionReference] = {
              status: 'Granted',
              decisionDate: '27 Jun 2026',
              decisionType: 'Grant',
              certDate: request.session.data['cert-date-display']
          };
          
          // Add to application history
          if (!request.session.data['app-history']) {
              request.session.data['app-history'] = {}
          }
          if (!request.session.data['app-history'][decisionReference]) {
              request.session.data['app-history'][decisionReference] = []
          }
          
          // Generate current timestamp
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const datetime = dateStr + ' ' + timeStr;
          const caseworker = application.caseworker || 'Mo Bradshaw';
          const certDate = request.session.data['cert-date-display'] || '';
          
          request.session.data['app-history'][decisionReference].push({
              timestamp: datetime,
              action: 'Initial application granted',
              caseworker: caseworker,
              changes: {
                From: 'Submitted',
                To: 'Granted'
              },
              versionLink: '/v6/application/' + decisionReference
          })
          
          // Move application from assigned to completed (decided) list
          if (request.session.data['assigned-applications']) {
              const decidedApp = request.session.data['assigned-applications'].find(app => app.ref === decisionReference)
              if (decidedApp) {
                  if (!request.session.data['completed-applications']) {
                      request.session.data['completed-applications'] = []
                  }
                  request.session.data['completed-applications'].push(decidedApp)
                  request.session.data['assigned-applications'] = request.session.data['assigned-applications'].filter(app => app.ref !== decisionReference)
              }
          }
      }
      
      response.redirect("/v6/confirmation-screen")
    }
});

// Routes from personal prototype
const mockResults = [
  { ref: 'L-W1X-Y2Z', firstName: 'Cheyenne George', lastName: 'Press', dob: '12 Jan 1979', submitted: '19 Jun 2022', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Refused', outcomeClass: 'red' },
  { ref: 'L-W1X-Y2Z', firstName: 'Makenna Septimus', lastName: 'Culhane', dob: '12 Jan 1979', submitted: '19 Jun 2022', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Submitted', outcomeClass: 'purple' },
  { ref: 'L-W1X-Y2Z', firstName: 'Talan Baptista', lastName: 'Philips', dob: '12 Jan 1979', submitted: '19 Jun 2022', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Returned', outcomeClass: 'turquoise' },
  { ref: 'L-W1X-Y2Z', firstName: 'Alena Ekstrom Rothman', lastName: 'Ryan Passaquindici Arcand', dob: '12 Jan 1979', submitted: '19 Jun 2022', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Refused', outcomeClass: 'red' },
  { ref: 'L-W1X-Y2Z', firstName: 'Carla Schleifer', lastName: 'Dokidis', dob: '12 Jan 1979', submitted: '19 Jun 2022', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Refused', outcomeClass: 'red' },
  { ref: 'L-12Z-13P', firstName: 'John', lastName: 'Doe', dob: '10 May 1980', submitted: '14 May 2026', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'In progress', outcomeClass: 'light-blue' },
  { ref: 'L-12Z-13P', firstName: 'Jane', lastName: 'Smith', dob: '22 Aug 1990', submitted: '10 Sep 2024', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Submitted', outcomeClass: 'purple' },
  { ref: 'F-V5D-D20', firstName: 'Sam', lastName: 'Johnson', dob: '05 Nov 1985', submitted: '10 Sep 2024', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Granted', outcomeClass: 'green' },
  { ref: 'N-J5S-B10', firstName: 'Alice', lastName: 'Williams', dob: '12 Feb 1975', submitted: '10 Sep 2024', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Returned', outcomeClass: 'turquoise' },
  { ref: 'E-A6H-Q09', firstName: 'Michael', lastName: 'Brown', dob: '30 Mar 1992', submitted: '14 May 2026', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Refused', outcomeClass: 'red' },
  { ref: 'D-X6B-A85', firstName: 'Emma', lastName: 'Jones', dob: '18 Jul 1988', submitted: '10 Sep 2024', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'In progress', outcomeClass: 'light-blue' },
  { ref: 'Y-J5S-C40', firstName: 'David', lastName: 'Garcia', dob: '25 Dec 1982', submitted: '14 May 2026', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Granted', outcomeClass: 'green' },
  { ref: 'W-I3C-A93', firstName: 'Sophia', lastName: 'Martinez', dob: '09 Sep 1995', submitted: '14 May 2026', firm: 'WATKINS SOLICITORS INC BRAIN SINNOTT & CO<br>OK514R', outcome: 'Submitted', outcomeClass: 'purple' }
];

router.get('/grant-certificate-date', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/grant-certificate-date.html', { pageTitle: 'Make a decision', decisionReference: decisionReference });
});

router.get('/refuse-reason', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/refuse-reason.html', { pageTitle: 'Make a decision', decisionReference: decisionReference });
});

router.get('/check-answers', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/check-answers.html', { 
    pageTitle: 'Check your answers', 
    decisionReference: decisionReference,
    data: req.session.data
  });
});

router.get('/overall-decision', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/overall-decision.html', { pageTitle: 'Make a decision', decisionReference: decisionReference });
});

router.get('/confirmation-screen', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/confirmation-screen.html', { pageTitle: 'Confirmation', decisionReference: decisionReference });
});

router.get('/overall-decision-error', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render('v6/overall-decision-error.html', { pageTitle: 'Error', decisionReference: decisionReference });
});

// Password for accessing the prototype
const PROTOTYPE_PASSWORD = 'prototype';

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.data && req.session.data['v6-authenticated']) {
    next();
  } else {
    res.redirect('/v6/');
  }
}

// Default root route - shows password form
router.get('/', function(req, res) {
  res.render('v6/password.njk', { 
    pageTitle: 'Enter password',
    errorMessage: req.session.data && req.session.data['password-error'] ? req.session.data['password-error'] : null
  });
  // Clear error after displaying
  if (req.session.data) {
    delete req.session.data['password-error'];
  }
});

// Password submission
router.post('/password-submit', function(req, res) {
  const enteredPassword = req.body.password;
  
  if (enteredPassword === PROTOTYPE_PASSWORD) {
    // Store auth in session
    if (!req.session.data) {
      req.session.data = {};
    }
    req.session.data['v6-authenticated'] = true;
    res.redirect('/v6/index');
  } else {
    // Store error and redirect back
    if (!req.session.data) {
      req.session.data = {};
    }
    req.session.data['password-error'] = 'Incorrect password';
    res.redirect('/v6/');
  }
});

// Welcome/index page - requires auth
router.get('/index', function(req, res) {
  // Check authentication
  if (!req.session.data || !req.session.data['v6-authenticated']) {
    res.redirect('/v6/');
    return;
  }
  res.render('v6/index.njk', { pageTitle: 'Civil Decide prototype' });
});

function initializeAppHistory(ref, caseworker) {
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  
  if (!req.session.data['app-history'][ref]) {
    req.session.data['app-history'][ref] = [];
  }
}

function addHistoryEvent(ref, action, caseworker, details = null, changes = null) {
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  
  if (!req.session.data['app-history'][ref]) {
    req.session.data['app-history'][ref] = [];
  }
  
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  
  req.session.data['app-history'][ref].push({
    timestamp: timestamp,
    action: action,
    caseworker: caseworker,
    details: details,
    changes: changes
  });
}

const caseworkers = [
  'Sarah Johnson',
  'Mike Chen',
  'Emma Wilson',
  'David Brown'
];

// Pre-seeded scenario applications (always available via search)
const SEEDED_APPLICATIONS = [
  {
    ref: 'L-FHGR-MNT7',
    firstName: 'Thomas',
    lastName: 'Hartley',
    dob: '12 Mar 1985',
    submitted: '03 Jan 2026',
    firm: 'Pemberton & Co Solicitors<br>OK514R',
    status: 'Granted',
    decisionType: 'Grant',
    type: 'Initial application',
    delegatedFunctions: 'Used',
    matterType: { title: 'Family', subtext: "Special Children's Act" },
    isPriorAuthority: false
  },
  {
    ref: 'L-FHGR-MNT7',
    firstName: 'Thomas',
    lastName: 'Hartley',
    dob: '12 Mar 1985',
    submitted: '18 Jan 2026',
    firm: 'Pemberton & Co Solicitors<br>OK514R',
    status: 'Granted',
    decisionType: 'Grant',
    type: 'Prior authority',
    delegatedFunctions: 'N/A',
    matterType: { title: 'Family', subtext: "Special Children's Act" },
    isPriorAuthority: true,
    priorAuthorityType: 'Expert - Psychiatrist',
    expertName: 'Dr Morley Calzoni',
    expertType: 'Psychiatrist',
    expertLocation: 'London',
    expertHours: '60',
    expertMinutes: '00',
    expertRate: '100.80',
    expertRequestedAmount: '6048.00',
    expertJustification: 'Expert required to undertake psychiatric assessment on client, ordered by the court'
  },
  {
    ref: 'L-AUTO-GR4N',
    firstName: 'Rebecca',
    lastName: 'Okafor',
    dob: '27 Sep 1990',
    submitted: '10 Feb 2026',
    firm: 'Whitfield Legal Services<br>OK782T',
    status: 'Granted',
    decisionType: 'Grant',
    type: 'Initial application',
    delegatedFunctions: 'Used',
    matterType: { title: 'Family', subtext: "Special Children's Act" },
    isPriorAuthority: false
  },
  {
    ref: 'L-AUTO-GR4N',
    firstName: 'Rebecca',
    lastName: 'Okafor',
    dob: '27 Sep 1990',
    submitted: '21 Feb 2026',
    firm: 'Whitfield Legal Services<br>OK782T',
    status: 'Granted',
    decisionType: 'Grant',
    type: 'Prior authority',
    delegatedFunctions: 'N/A',
    matterType: { title: 'Family', subtext: "Special Children's Act" },
    isPriorAuthority: true,
    priorAuthorityType: 'Expert - Psychiatrist',
    expertName: 'Dr Morley Calzoni',
    expertType: 'Psychiatrist',
    expertLocation: 'London',
    expertHours: '60',
    expertMinutes: '00',
    expertRate: '100.80',
    expertRequestedAmount: '6048.00',
    expertJustification: 'Expert required to undertake psychiatric assessment on client, ordered by the court'
  },
  {
    ref: 'L-REFUS-ED1A',
    firstName: 'Patricia',
    lastName: 'Lynch',
    dob: '15 May 1987',
    submitted: '15 Feb 2026',
    firm: 'Morrison & Associates<br>OK234T',
    status: 'Refused',
    decisionType: 'Refuse',
    type: 'Initial application',
    delegatedFunctions: 'N/A',
    matterType: { title: 'Family', subtext: 'Divorce' },
    isPriorAuthority: false,
    homeAddress: '16 Knightsbridge place<br>117A Russell Square<br>London<br>NW3 6BD',
    correspondenceAddress: '6 Armitage house<br>108 petty France<br>London<br>SW2 8QT'
  }
];

const SEEDED_HISTORY = {
  'L-FHGR-MNT7': [
    // Version 0: Application received
    { timestamp: '03 Jan 2026 09:14', action: 'Application received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Submitted', justification: 'Initial application submitted by provider.' },
    // Version 1: Note added
    { timestamp: '05 Jan 2026 10:32', action: 'Note Added', caseworker: 'Sarah Johnson', type: 'note', details: 'Client called to ask what would happen next. Advised on the process and expected timescales.' },
    // Version 2: Assigned
    { timestamp: '06 Jan 2026 11:05', action: 'Application assigned to Sarah Johnson', caseworker: 'Sarah Johnson', type: 'assignment', details: null },
    // Version 3: Decision to Grant
    { timestamp: '14 Jan 2026 14:22', action: 'Decision to Grant application', caseworker: 'Sarah Johnson', type: 'decision', statusAfter: 'Granted', justification: 'The application meets the merits and means criteria for civil legal aid. The client has a strong arguable case with prospects of success above 50%. Delegated functions were used appropriately given the urgency of the proceedings involving the welfare of children. All supporting evidence has been reviewed and found sufficient.' },
    // Version 4: Prior Authority 1 Received
    { timestamp: '18 Jan 2026 09:47', action: 'Prior authority request received', caseworker: 'N/A', type: 'pa_status_change', paStatusAfter: 'Awaiting', details: null, justification: 'Prior authority requested for a psychiatric expert (Dr Morley Calzoni) to prepare a report for use in proceedings.' },
    // Version 5: PA 1 Assigned
    { timestamp: '20 Jan 2026 10:15', action: 'Prior authority assigned to Mike Chen', caseworker: 'Mike Chen', type: 'pa_assignment', details: null },
    // Version 6: PA 1 Granted
    { timestamp: '27 Jan 2026 15:33', action: 'Prior authority granted', caseworker: 'Mike Chen', type: 'pa_decision', paStatusAfter: 'Granted', justification: 'The prior authority request has been approved. Authority granted for up to 60 hours.' },
    // Version 7: Prior Authority 2 Received
    { timestamp: '02 Feb 2026 08:55', action: 'Prior authority request received', caseworker: 'N/A', type: 'pa_status_change', paStatusAfter: 'Awaiting', justification: 'Second prior authority requested for additional expert report.' },
    // Version 8: PA 2 Assigned
    { timestamp: '04 Feb 2026 09:20', action: 'Prior authority assigned to Emma Wilson', caseworker: 'Emma Wilson', type: 'pa_assignment', details: null },
    // Version 9: PA 2 Refused
    { timestamp: '12 Feb 2026 16:44', action: 'Prior authority refused', caseworker: 'Emma Wilson', type: 'pa_decision', paStatusAfter: 'Refused', justification: 'The prior authority request has been refused. The requested expert report is not considered necessary at this stage.' },
    // Version 10: Review Request Received
    { timestamp: '19 Feb 2026 11:10', action: 'Review request received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Under Review', justification: 'Client has submitted a review request following the PA refusal decision.' }
  ],
  'L-AUTO-GR4N': [
    // Version 0: Application received
    { timestamp: '10 Feb 2026 08:30', action: 'Application received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Submitted', justification: 'Initial application submitted by provider.' },
    // Version 1: Auto-granted
    { timestamp: '10 Feb 2026 08:31', action: 'Decision to Grant application', caseworker: 'System', type: 'decision', statusAfter: 'Granted', justification: 'Application automatically granted by the system. The application met all required merits and means criteria and was eligible for automated processing under delegated functions.' },
    // Version 2: PA 1 Received
    { timestamp: '21 Feb 2026 11:22', action: 'Prior authority request received', caseworker: 'N/A', type: 'pa_status_change', paStatusAfter: 'Awaiting', justification: 'Prior authority requested for a psychiatric expert to prepare a report.' },
    // Version 3: PA 1 Assigned
    { timestamp: '24 Feb 2026 09:40', action: 'Prior authority assigned to David Brown', caseworker: 'David Brown', type: 'pa_assignment', details: null },
    // Version 4: PA 1 Granted
    { timestamp: '03 Mar 2026 14:55', action: 'Prior authority granted', caseworker: 'David Brown', type: 'pa_decision', paStatusAfter: 'Granted', justification: 'The prior authority request has been approved. Authority granted for up to 60 hours.' },
    // Version 5: PA 2 Received
    { timestamp: '12 Mar 2026 10:05', action: 'Prior authority request received', caseworker: 'N/A', type: 'pa_status_change', paStatusAfter: 'Awaiting', justification: 'Second prior authority requested for additional expert report.' },
    // Version 6: PA 2 Assigned
    { timestamp: '14 Mar 2026 09:15', action: 'Prior authority assigned to Emma Wilson', caseworker: 'Emma Wilson', type: 'pa_assignment', details: null },
    // Version 7: PA 2 Refused
    { timestamp: '22 Mar 2026 16:30', action: 'Prior authority refused', caseworker: 'Emma Wilson', type: 'pa_decision', paStatusAfter: 'Refused', justification: 'The prior authority request has been refused. The requested expert report is not considered necessary at this stage.' },
    // Version 8: Review Request Received
    { timestamp: '01 Apr 2026 11:45', action: 'Review request received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Under Review', justification: 'Client has submitted a review request following the PA refusal decision.' }
  ],
  'L-REFUS-ED1A': [
    // Version 0: Application received
    { timestamp: '15 Feb 2026 10:05', action: 'Application received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Submitted', justification: 'Initial application submitted by provider.' },
    // Version 1: Note added
    { timestamp: '15 Feb 2026 10:06', action: 'Note Added', caseworker: 'Client Services', type: 'note', details: 'Client called to ask what would happen next. Advised on the process and expected timescales.' },
    // Version 2: Assigned
    { timestamp: '16 Feb 2026 11:30', action: 'Application assigned to Jonathan Lee', caseworker: 'Jonathan Lee', type: 'assignment', details: null },
    // Version 3: Name change
    { timestamp: '20 Feb 2026 09:15', action: 'Client name updated', caseworker: 'Jonathan Lee', type: 'data_change', fieldChanged: 'firstName', oldValue: 'Patriciase', newValue: 'Patricia', justification: 'Name updated following request to correct spelling mistake. Verification of legal documentation completed.' },
    // Version 4: Address change
    { timestamp: '20 Feb 2026 14:30', action: 'Client correspondence address updated', caseworker: 'Jonathan Lee', type: 'data_change', fieldChanged: 'correspondenceAddress', oldValue: '6 Armitage house, 108 petty France, London, SW2 8QT', newValue: '2 Highfield Lane, Sheffield, South Yorkshire, S10 2AB, United Kingdom', justification: 'Correspondence address updated as per client request.' },
    // Version 5: Decision to Refuse
    { timestamp: '24 Feb 2026 14:15', action: 'Decision to Refuse application', caseworker: 'Jonathan Lee', type: 'decision', statusAfter: 'Refused', justification: 'The application does not meet the merits criteria required for civil legal aid. The client\'s prospects of success have been assessed as below 50%. While the client\'s financial circumstances fall within the means assessment criteria, the weakness of the legal case prevents grant at this stage.' },
    // Version 6: Appeal received
    { timestamp: '28 Feb 2026 09:20', action: 'Appeal received', caseworker: 'N/A', type: 'status_change', statusAfter: 'Under Appeal', justification: 'Client has submitted an appeal against the refusal decision.' },
    // Version 7: Appeal assigned
    { timestamp: '01 Mar 2026 10:00', action: 'Appeal assigned to Michelle Foster', caseworker: 'Michelle Foster', type: 'assignment', details: null },
    // Version 8: Appeal granted
    { timestamp: '12 Mar 2026 16:45', action: 'Appeal granted', caseworker: 'Michelle Foster', type: 'decision', statusAfter: 'Granted', justification: 'The appeal has been allowed. Upon reconsideration of the evidence provided, the prospects of success have been reassessed as exceeding 50%. The client\'s legal position is stronger than initially assessed. Certificate issued for the scope of proceedings relating to the divorce and ancillary relief.' },
    // Version 9: Prior Authority Received
    { timestamp: '18 Mar 2026 11:10', action: 'Prior authority request received', caseworker: 'N/A', type: 'pa_status_change', paStatusAfter: 'Awaiting', justification: 'Prior authority requested for expert report to support proceedings.' },
    // Version 10: PA assigned
    { timestamp: '20 Mar 2026 09:30', action: 'Prior authority assigned to Sophie Harris', caseworker: 'Sophie Harris', type: 'pa_assignment', details: null },
    // Version 11: PA granted
    { timestamp: '28 Mar 2026 15:20', action: 'Prior authority granted', caseworker: 'Sophie Harris', type: 'pa_decision', paStatusAfter: 'Granted', justification: 'The prior authority request has been approved. Authority granted for the expert report.' }
  ]
};

const firstNames = ['John', 'Jane', 'Michael', 'Emma', 'David', 'Sarah', 'James', 'Mary', 'Robert', 'Patricia', 'Samuel', 'Jennifer', 'William', 'Linda', 'Christopher'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

function generateRandomRef() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let ref = '';
  ref += letters.charAt(Math.floor(Math.random() * letters.length));
  ref += '-';
  for (let i = 0; i < 4; i++) {
    ref += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  ref += '-';
  for (let i = 0; i < 4; i++) {
    ref += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return ref;
}

function generateRandomDate() {
  // Generate random date from January to June 2026
  const year = 2026;
  const month = Math.floor(Math.random() * 6); // 0-5 for Jan-Jun
  const day = Math.floor(Math.random() * 28) + 1; // 1-28 to avoid month-specific issues
  
  const date = new Date(year, month, day);
  const formatted = date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  });
  return formatted;
}

const expertProfiles = {
  Psychiatrist: [
    { name: 'Dr Morley Calzoni',    type: 'Psychiatrist',    location: 'London',     hours: '60', minutes: '00', rate: '100.80', requestedAmount: '6048.00', justification: 'Expert required to undertake psychiatric assessment on client, ordered by the court' },
    { name: 'Dr Sarah Whitfield',   type: 'Psychiatrist',    location: 'Manchester', hours: '50', minutes: '00', rate: '98.00',  requestedAmount: '4900.00', justification: 'Psychiatric assessment required to establish mental capacity for proceedings' },
    { name: 'Dr James Okonkwo',     type: 'Psychiatrist',    location: 'Leeds',      hours: '55', minutes: '00', rate: '95.50', requestedAmount: '5252.50', justification: 'Court-ordered psychiatric report to assess client welfare and risk' },
    { name: 'Dr Fiona Baxter',      type: 'Psychiatrist',    location: 'Bristol',    hours: '45', minutes: '00', rate: '102.00', requestedAmount: '4590.00', justification: 'Psychiatric evaluation needed to support evidence in care proceedings' }
  ],
  Physiotherapist: [
    { name: 'Dr Rachel Thompson',   type: 'Physiotherapist', location: 'Manchester', hours: '40', minutes: '00', rate: '85.50',  requestedAmount: '3420.00', justification: "Expert physiotherapy assessment needed to establish client's functional capacity" },
    { name: 'Ms Linda Patel',       type: 'Physiotherapist', location: 'Leeds',      hours: '35', minutes: '00', rate: '80.00',  requestedAmount: '2800.00', justification: 'Physiotherapy assessment required to support evidence in proceedings' },
    { name: 'Mr David Crane',       type: 'Physiotherapist', location: 'Birmingham', hours: '30', minutes: '00', rate: '88.00',  requestedAmount: '2640.00', justification: 'Independent physiotherapy review required for injury assessment' }
  ],
  'Medical examiner': [
    { name: 'Dr Andrew Wilson',     type: 'Medical examiner', location: 'Birmingham', hours: '50', minutes: '00', rate: '95.00', requestedAmount: '4750.00', justification: 'Expert medical assessment required for case preparation' },
    { name: 'Dr Priya Nair',        type: 'Medical examiner', location: 'Bristol',    hours: '45', minutes: '00', rate: '90.00', requestedAmount: '4050.00', justification: 'Medical examination required to support evidence for proceedings' },
    { name: 'Dr Thomas Ellery',     type: 'Medical examiner', location: 'London',     hours: '55', minutes: '00', rate: '97.00', requestedAmount: '5335.00', justification: 'Independent medical report needed to assess client condition and capacity' }
  ]
};

function pickExpertProfile(priorAuthorityType) {
  let pool;
  if (priorAuthorityType.includes('Psychiatrist')) pool = expertProfiles.Psychiatrist;
  else if (priorAuthorityType.includes('Physiotherapist')) pool = expertProfiles.Physiotherapist;
  else pool = expertProfiles['Medical examiner'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateMockApplications(count = 8) {
  const applications = [];
  const generatedRefs = new Set();
  const priorAuthorityTypes = ['Expert - Psychiatrist', 'Expert - Physiotherapist', 'Counsel', "King's Counsel"];

  function uniqueRef() {
    let ref = generateRandomRef();
    while (generatedRefs.has(ref)) ref = generateRandomRef();
    generatedRefs.add(ref);
    return ref;
  }

  // Split the count: roughly half initial applications awaiting assessment,
  // half prior authority applications awaiting assessment (with their own refs so
  // they don't bleed into the initial application detail pages).
  const initialCount = Math.ceil(count / 2);
  const paCount = count - initialCount;

  // --- Pending initial applications (no status — awaiting decision) ---
  for (let i = 0; i < initialCount; i++) {
    const ref = uniqueRef();
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
    const submittedDate = generateRandomDate();

    applications.push({
      ref,
      reference: ref,
      firstName,
      lastName,
      dob: '12 Jan 1980',
      submitted: submittedDate,
      firm: 'WATKINS SOLICITORS INC<br>OK514R',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      matterType: { title: 'Family', subtext: "Special Children's Act" },
      isPriorAuthority: false
      // No status — these are awaiting assessment
    });
  }

  // --- Pending prior authority applications (own refs — awaiting PA assessment) ---
  for (let i = 0; i < paCount; i++) {
    const ref = uniqueRef();
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
    const submittedDate = generateRandomDate();
    const paType = priorAuthorityTypes[Math.floor(Math.random() * priorAuthorityTypes.length)];
    const isExpert = paType.includes('Expert');
    const expertProfile = isExpert ? pickExpertProfile(paType) : null;

    const paApp = {
      ref,
      reference: ref,
      firstName,
      lastName,
      dob: '12 Jan 1980',
      submitted: submittedDate,
      firm: 'WATKINS SOLICITORS INC<br>OK514R',
      type: 'Prior authority',
      priorAuthorityType: paType,
      delegatedFunctions: 'N/A',
      matterType: { title: 'Family', subtext: "Special Children's Act" },
      isPriorAuthority: true
      // No status — these are awaiting PA assessment
    };

    if (expertProfile) {
      paApp.expertName            = expertProfile.name;
      paApp.expertType            = expertProfile.type;
      paApp.expertLocation        = expertProfile.location;
      paApp.expertHours           = expertProfile.hours;
      paApp.expertMinutes         = expertProfile.minutes;
      paApp.expertRate            = expertProfile.rate;
      paApp.expertRequestedAmount = expertProfile.requestedAmount;
      paApp.expertJustification   = expertProfile.justification;
    }

    applications.push(paApp);
  }

  return applications;
}

router.get('/open-applications', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  // Keep a stable open-applications source for the session so references remain searchable.
  if (!req.session.data['open-applications-all']) {
    req.session.data['open-applications-all'] = generateMockApplications(8);
    req.session.data['open-applications'] = null; // reset derived copy
  }
  let applications = [...req.session.data['open-applications-all']];

  // Remove applications already in a caseworker's list from open applications.
  const assignedKeys = new Set((req.session.data['assigned-applications'] || []).map(app => `${app.ref}|${Boolean(app.isPriorAuthority)}`));
  applications = applications.filter(app => !assignedKeys.has(`${app.ref}|${Boolean(app.isPriorAuthority)}`));
  
  // Restore any stored decisions from decision-store
  if (req.session.data['decision-store']) {
    applications.forEach(app => {
      restoreDecisionData(app, req.session.data['decision-store']);
    });
  }
  
  // Apply filters based on query parameters
  const { applicationType, matterType, categories } = req.query;
  
  let filteredApps = applications;
  
  console.log('Query params:', req.query);
  
  // Filter by application type
  if (applicationType) {
    console.log('Filtering by applicationType');
    let selectedTypes = Array.isArray(applicationType) ? applicationType : [applicationType];
    // Remove _unchecked values
    selectedTypes = selectedTypes.filter(t => t !== '_unchecked');
    console.log('selectedTypes after filter:', selectedTypes);
    
    if (selectedTypes.length > 0) {
      filteredApps = filteredApps.filter(app => {
        for (let type of selectedTypes) {
          if (type === 'initial' && !app.isPriorAuthority) return true;
          if (type === 'prior' && app.isPriorAuthority) return true;
        }
        return false;
      });
      console.log('After applicationType filter:', filteredApps.length);
    }
  }
  
  // Filter by matter type
  if (matterType) {
    console.log('Filtering by matterType');
    let selectedMatters = Array.isArray(matterType) ? matterType : [matterType];
    // Remove _unchecked values
    selectedMatters = selectedMatters.filter(m => m !== '_unchecked');
    console.log('selectedMatters after filter:', selectedMatters);
    
    if (selectedMatters.length > 0) {
      filteredApps = filteredApps.filter(app => {
        for (let matter of selectedMatters) {
          if (matter === 'sca' && app.matterType.title === 'Family') return true;
        }
        return false;
      });
      console.log('After matterType filter:', filteredApps.length);
    }
  }
  
  // Filter by categories (for prior authority applications only)
  if (categories) {
    console.log('Filtering by categories');
    let selectedCategories = Array.isArray(categories) ? categories : [categories];
    // Remove _unchecked values
    selectedCategories = selectedCategories.filter(c => c !== '_unchecked');
    console.log('selectedCategories after filter:', selectedCategories);
    
    if (selectedCategories.length > 0) {
      filteredApps = filteredApps.filter(app => {
        if (!app.isPriorAuthority) return true; // Pass through non-prior-authority apps
        
        for (let cat of selectedCategories) {
          if (cat === 'expert' && app.priorAuthorityType && app.priorAuthorityType.includes('Expert')) return true;
          if (cat === 'junior-counsel' && app.priorAuthorityType && app.priorAuthorityType.includes('Counsel')) return true;
          if (cat === 'expenses' && app.priorAuthorityType && app.priorAuthorityType.includes('expenses')) return true;
        }
        return false;
      });
      console.log('After categories filter:', filteredApps.length);
    }
  }
  
  console.log('Final filtered apps:', filteredApps.length);
  
  // Keep full, unfiltered open applications in session for routes like search and add-by-reference.
  req.session.data['open-applications'] = applications;
  
  res.render('v6/open-applications.njk', { 
    pageTitle: 'Open applications',
    applications: filteredApps,
    query: req.query
  });
});

// Isolated reassignment prototype flow (uses auto-stored form data)
router.get('/your-list', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }

  const reassigned = req.session.data['reassigned'];
  const reassignedTo = req.session.data['reassign-to'];
  req.session.data['reassigned'] = null;
  req.session.data['reassign-to'] = null;

  res.render('v6/your-list.html', {
    pageTitle: 'Your list',
    applications: req.session.data['assigned-applications'],
    reassigned: reassigned,
    reassignedTo: reassignedTo
  });
});

router.get('/reassign', function(req, res) {
  const ref = req.query.reference || req.session.data['reassign-reference'] || null;
  if (req.query.reference) {
    req.session.data['reassign-reference'] = req.query.reference;
  }

  let application = null;
  if (ref && req.session.data['assigned-applications']) {
    application = req.session.data['assigned-applications'].find(app => app.ref === ref) || null;
  }

  res.render('v6/reassign.html', {
    pageTitle: 'Select who you want to reassign this case to',
    reference: ref,
    application: application
  });
});

router.post('/confirm-reassign', function(req, res) {
  if (req.body.reference) {
    req.session.data['reassign-reference'] = req.body.reference;
  }
  res.redirect('/v6/confirm-reassign');
});

router.get('/confirm-reassign', function(req, res) {
  const ref = req.session.data['reassign-reference'] || null;
  let application = null;

  if (ref && req.session.data['assigned-applications']) {
    application = req.session.data['assigned-applications'].find(app => app.ref === ref) || null;
  }

  res.render('v6/confirm-reassign.html', {
    pageTitle: 'Confirm you want to reassign this case?',
    reference: ref,
    application: application
  });
});

router.post('/your-list', function(req, res) {
  const ref = req.body.reference || req.session.data['reassign-reference'];

  if (ref && req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = req.session.data['assigned-applications'].filter(app => app.ref !== ref);
  }

  if (req.body['reassigned']) {
    req.session.data['reassigned'] = req.body['reassigned'];
  }
  if (req.body['reassign-to']) {
    req.session.data['reassign-to'] = req.body['reassign-to'];
  }

  req.session.data['reassign-reference'] = null;

  // If we came from the main v6 journey, return there with a success banner
  if (ref) {
    res.redirect('/v6/yourlist');
    return;
  }

  // Keep isolated example journey working
  res.redirect('/v6/your-list');
});

router.get('/yourlist', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }

  const reassigned = req.session.data['reassigned'];
  const reassignedTo = req.session.data['reassign-to'];
  req.session.data['reassigned'] = null;
  req.session.data['reassign-to'] = null;
  
  // Restore any stored decisions from decision-store
  if (req.session.data['decision-store']) {
    req.session.data['assigned-applications'].forEach(app => {
      restoreDecisionData(app, req.session.data['decision-store']);
    });
  }
  
  res.render('v6/my-applications.html', { 
    pageTitle: 'Your list',
    applications: req.session.data['assigned-applications'],
    reassigned: reassigned,
    reassignedTo: reassignedTo
  });
});

router.get('/add-application/:reference', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  const ref = req.params.reference;
  const isPriorAuthorityRequested = req.query.isPriorAuthority === 'true';
  const hasPriorAuthorityParam = typeof req.query.isPriorAuthority !== 'undefined';
  const appExists = req.session.data['assigned-applications'].find(app => {
    if (app.ref !== ref) return false;
    // If caller specified prior authority type, match exact variant; otherwise match any by ref.
    if (hasPriorAuthorityParam) return app.isPriorAuthority === isPriorAuthorityRequested;
    return true;
  });
  
  if (!appExists) {
    const assignedCaseworker = caseworkers[Math.floor(Math.random() * caseworkers.length)];
    
    // Regenerate open applications to ensure we have current data
    if (!req.session.data['open-applications']) {
      req.session.data['open-applications'] = generateMockApplications(8);
    }
    
    // Get the full application data from open applications, matching requested variant when provided.
    let openApp = null;
    if (req.session.data['open-applications']) {
      if (hasPriorAuthorityParam) {
        openApp = req.session.data['open-applications'].find(app => app.ref === ref && app.isPriorAuthority === isPriorAuthorityRequested) || null;
      }
      if (!openApp) {
        openApp = req.session.data['open-applications'].find(app => app.ref === ref) || null;
      }
    }
    
    const addedDate = new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
    
    const assignedApp = {
      ref: ref,
      reference: ref,
      firstName: openApp ? openApp.firstName : 'Unknown',
      lastName: openApp ? openApp.lastName : 'Unknown',
      dob: openApp ? openApp.dob : 'N/A',
      submitted: openApp ? openApp.submitted : 'N/A',
      type: openApp ? openApp.type : 'Initial application',
      delegatedFunctions: openApp ? openApp.delegatedFunctions : 'N/A',
      matterType: openApp ? openApp.matterType : { title: 'N/A', subtext: '' },
      isPriorAuthority: openApp ? openApp.isPriorAuthority : false,
      priorAuthorityType: openApp ? openApp.priorAuthorityType : null,
      caseworker: assignedCaseworker,
      addedDate: addedDate,
      lastUpdated: addedDate
    };
    
    // Restore any stored decision data to the assigned application
    if (req.session.data['decision-store'] && req.session.data['decision-store'][ref]) {
      const stored = req.session.data['decision-store'][ref];
      assignedApp.status = stored.status;
      assignedApp.decisionDate = stored.decisionDate;
      assignedApp.decisionType = stored.decisionType;
      if (stored.certDate) assignedApp.certDate = stored.certDate;
      if (stored.refusalReason) assignedApp.refusalReason = stored.refusalReason;
    }
    
    req.session.data['assigned-applications'].push(assignedApp);
    
    // Log assignment to caseworker history when they add it to their list
    if (!req.session.data['app-history']) {
      req.session.data['app-history'] = {};
    }
    if (!req.session.data['app-history'][ref]) {
      req.session.data['app-history'][ref] = [];
    }
    
    // Get the application to use its submitted date
    const openAppForHistory = req.session.data['open-applications'] ? req.session.data['open-applications'].find(app => app.ref === ref) : null;
    let datetime;
    
    if (openAppForHistory) {
      // Use the application's submitted date with a random time
      const randomHour = Math.floor(Math.random() * 24);
      const randomMin = Math.floor(Math.random() * 60);
      const timeStr = String(randomHour).padStart(2, '0') + ':' + String(randomMin).padStart(2, '0');
      datetime = openAppForHistory.submitted + ' ' + timeStr;
    } else {
      // Fallback to current time if app not found
      const now = new Date();
      datetime = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
      }) + ' ' + now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    
    // Log: Application assigned to caseworker (when they add it)
    req.session.data['app-history'][ref].push({
      timestamp: datetime,
      action: 'Application assigned to ' + assignedCaseworker,
      caseworker: assignedCaseworker,
      details: null
    });
  }
  
  // Check if AJAX request (from fetch)
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.xhr) {
    res.status(200).json({ success: true, ref: ref });
  } else {
    res.redirect('/v6/yourlist');
  }
});

router.get('/remove-application/:reference', function(req, res) {
  const ref = req.params.reference;
  if (req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = req.session.data['assigned-applications'].filter(app => app.ref !== ref);
  }
  
  res.redirect('/v6/yourlist');
});

router.get('/application/:reference/history', function(req, res) {
  const ref = req.params.reference;
  
  // Ensure seeded applications and history are always available
  if (!req.session.data['completed-applications']) {
    req.session.data['completed-applications'] = [];
  }
  const seededRefsHistory = [...new Set(SEEDED_APPLICATIONS.map(a => a.ref))];
  req.session.data['completed-applications'] = req.session.data['completed-applications'].filter(a => !seededRefsHistory.includes(a.ref));
  SEEDED_APPLICATIONS.forEach(seeded => {
    req.session.data['completed-applications'].push(seeded);
  });

  // Always ensure seeded history is available
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }

  // Only initialize seeded history if not already set (preserve user-added notes)
  Object.keys(SEEDED_HISTORY).forEach(r => {
    if (!req.session.data['app-history'][r]) {
      req.session.data['app-history'][r] = SEEDED_HISTORY[r];
    }
  });
  if (!req.session.data['app-history'][ref] || req.session.data['app-history'][ref].length === 0 ||
      (req.session.data['app-history'][ref].length > 0 && !req.session.data['app-history'][ref][0].action)) {
    
    req.session.data['app-history'][ref] = [];
    
    // Add initial application received entry
    let submittedDate = 'N/A';
    
    if (req.session.data['open-applications']) {
      const openApp = req.session.data['open-applications'].find(app => app.ref === ref);
      if (openApp && openApp.submitted) {
        submittedDate = openApp.submitted;
      }
    }
    
    if (submittedDate === 'N/A') {
      const now = new Date();
      submittedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const timeStr = String(randomHour).padStart(2, '0') + ':' + String(randomMin).padStart(2, '0');
    const datetime = submittedDate + ' ' + timeStr;
    
    req.session.data['app-history'][ref].push({
      timestamp: datetime,
      action: 'Initial application received',
      caseworker: 'N/A',
      details: null
    });
  }
  
  const assignedApp = req.session.data['assigned-applications'] ? req.session.data['assigned-applications'].find(app => app.ref === ref) : null;
  const history = req.session.data['app-history'][ref] || [];
  
  res.render('v6/application-history-modern.html', {
    reference: ref,
    assignedCaseworker: assignedApp ? assignedApp.caseworker : 'Unassigned',
    history: history
  });
});

router.post('/application/:reference/add-note', function(req, res) {
  const ref = req.params.reference;
  const note = req.body.historyNote; // Form field is named "historyNote"
  const caseworkerName = 'Caseworker'; // In real scenario, get from session/auth
  
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  if (!req.session.data['app-history'][ref]) {
    req.session.data['app-history'][ref] = [];
  }
  
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  
  // Add note using new versioned event structure (append to end maintains version indices)
  req.session.data['app-history'][ref].push({
    timestamp: timestamp,
    action: 'Note Added',
    caseworker: caseworkerName,
    type: 'note',
    details: note
  });
  
  // Set toast message for success notification
  req.session.data.toast = {
    show: true,
    message: 'Your notes have been successfully added',
    type: 'success'
  };
  
  res.redirect('/v6/application/' + ref + '#application-history');
});

router.get('/search', function(req, res) {
  const showResults = Object.keys(req.query).length > 0;
  let results = [];

  // Always ensure seeded applications are in completed-applications
  if (!req.session.data['completed-applications']) {
    req.session.data['completed-applications'] = [];
  }
  // Remove stale seeded entries and re-inject fresh ones
  const seededRefs = [...new Set(SEEDED_APPLICATIONS.map(a => a.ref))];
  req.session.data['completed-applications'] = req.session.data['completed-applications'].filter(a => !seededRefs.includes(a.ref));
  SEEDED_APPLICATIONS.forEach(seeded => {
    req.session.data['completed-applications'].push(seeded);
  });

  // Always ensure seeded history is available (but don't overwrite existing)
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  Object.keys(SEEDED_HISTORY).forEach(ref => {
    // Only initialize if not already set (preserves added notes)
    if (!req.session.data['app-history'][ref]) {
      req.session.data['app-history'][ref] = SEEDED_HISTORY[ref];
    }
  });
  
  if (showResults) {
    // Create a map to track unique references (prefer assigned-applications, then completed, then open)
    const uniqueApps = {};
    if (req.session.data['assigned-applications']) {
      req.session.data['assigned-applications'].forEach(app => {
        uniqueApps[app.ref] = app;
      });
    }
    if (req.session.data['completed-applications']) {
      req.session.data['completed-applications'].forEach(app => {
        if (!uniqueApps[app.ref]) {
          uniqueApps[app.ref] = app;
        }
      });
    }
    if (req.session.data['open-applications']) {
      req.session.data['open-applications'].forEach(app => {
        if (!uniqueApps[app.ref]) {
          uniqueApps[app.ref] = app;
        }
      });
    }
    
    // Restore any stored decisions from decision-store
    if (req.session.data['decision-store']) {
      Object.values(uniqueApps).forEach(app => {
        restoreDecisionData(app, req.session.data['decision-store']);
      });
    }
    
    // Filter applications based on search criteria
    results = Object.values(uniqueApps).filter(app => {
      let match = true;
      if (req.query.reference && !app.ref.toLowerCase().includes(req.query.reference.toLowerCase())) match = false;
      if (req.query.firstName && !app.firstName.toLowerCase().includes(req.query.firstName.toLowerCase())) match = false;
      if (req.query.lastName && !app.lastName.toLowerCase().includes(req.query.lastName.toLowerCase())) match = false;
      return match;
    }).map(app => {
      // Determine outcome based on decision status
      let outcome = 'In progress';
      let outcomeClass = 'light-blue';
      
      if (app.status === 'Granted') {
        outcome = 'Granted';
        outcomeClass = 'green';
      } else if (app.status === 'Refused') {
        outcome = 'Refused';
        outcomeClass = 'red';
      }
      
      return {
        ref: app.ref,
        firstName: app.firstName,
        lastName: app.lastName,
        dob: app.dob,
        submitted: app.submitted,
        firm: app.firm || 'Not available',
        outcome: outcome,
        outcomeClass: outcomeClass
      };
    });
  }
  
  res.render('v6/search.njk', {
    pageTitle: 'Search for a case',
    showResults: showResults,
    results: results,
    resultCount: results.length,
    query: req.query
  });
});

router.get('/application/:reference', function(req, res) {
  const reference = req.params.reference;
  const requestedPriorAuthority = req.query.isPriorAuthority === 'true';
  const hasLinkedCases = reference === 'L-12Z-13P';

  // Ensure seeded applications are always available
  if (!req.session.data['completed-applications']) {
    req.session.data['completed-applications'] = [];
  }
  const seededRefsApp = [...new Set(SEEDED_APPLICATIONS.map(a => a.ref))];
  req.session.data['completed-applications'] = req.session.data['completed-applications'].filter(a => !seededRefsApp.includes(a.ref));
  SEEDED_APPLICATIONS.forEach(seeded => {
    req.session.data['completed-applications'].push(seeded);
  });
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  Object.keys(SEEDED_HISTORY).forEach(ref => {
    // Only initialize if not already set (preserves added notes)
    if (!req.session.data['app-history'][ref]) {
      req.session.data['app-history'][ref] = SEEDED_HISTORY[ref];
    }
  });
  
  const applicationCollections = [
    req.session.data['assigned-applications'] || [],
    req.session.data['completed-applications'] || [],
    req.session.data['open-applications'] || []
  ];

  function findApplicationVariant(isPriorAuthority) {
    for (const collection of applicationCollections) {
      const match = collection.find(app => app.ref === reference && Boolean(app.isPriorAuthority) === isPriorAuthority);
      if (match) {
        return match;
      }
    }
    return null;
  }

  function applyStoredDecision(app) {
    if (!app) return null;
    const hydrated = { ...app };
    // decision-store is for the initial application decision, not PA requests.
    if (!hydrated.isPriorAuthority && req.session.data['decision-store'] && req.session.data['decision-store'][reference]) {
      const stored = req.session.data['decision-store'][reference];
      hydrated.status = stored.status;
      hydrated.decisionDate = stored.decisionDate;
      hydrated.decisionType = stored.decisionType;
      if (stored.certDate) hydrated.certDate = stored.certDate;
      if (stored.refusalReason) hydrated.refusalReason = stored.refusalReason;
    }
    return hydrated;
  }

  const initialApplicationData = applyStoredDecision(findApplicationVariant(false));
  const priorAuthorityApplicationData = applyStoredDecision(findApplicationVariant(true));
  if (initialApplicationData && priorAuthorityApplicationData && !initialApplicationData.status) {
    initialApplicationData.status = 'Granted';
    initialApplicationData.decisionType = 'Grant';
  }
  const applicationData = requestedPriorAuthority
    ? (priorAuthorityApplicationData || initialApplicationData || {})
    : (initialApplicationData || priorAuthorityApplicationData || {});
  const hasPriorAuthority = Boolean(priorAuthorityApplicationData);
  
  // Get prior authority type from the actual data
  let priorAuthorityType = null;
  if (priorAuthorityApplicationData) {
    priorAuthorityType = priorAuthorityApplicationData.priorAuthorityType || 'Expert';
  }
  if (!priorAuthorityType) priorAuthorityType = 'Expert';
  
  // Generate fallback/derived data for the People tab
  const found = (applicationData && applicationData.ref) ? applicationData : {
    ref: reference,
    reference: reference,
    firstName: 'David George',
    lastName: 'Barr',
    dob: '04 May 1990',
    firm: 'Gray and associations at law<br>OK514R'
  };

  const nameLen = found.firstName.length;
  const application = {
    ...found,
    ref: reference,
    reference: reference,
    niNumber: `JT${nameLen}15${nameLen}B`,
    prevReference: `30000123${nameLen}`,
    correspondenceAddress: found.correspondenceAddress || `${nameLen} Armitage house<br>108 petty France<br>London<br>SW2 8QT`,
    homeAddress: found.homeAddress || `${nameLen * 2} Knightsbridge place<br>117A Russell Square<br>London<br>NW3 6BD`,
    opponentName: `${found.lastName} city council`,
    children: [
      { name: `Kaylynn ${found.lastName}`, dob: `20 Dec 202${nameLen % 9}` },
      { name: `Gustavo ${found.lastName}`, dob: `15 Jan 202${(nameLen + 1) % 9}` }
    ],
    isBioParent: nameLen % 2 === 0 ? 'Yes' : 'No',
    providerFirm: found.firm ? found.firm.split('<br>')[0] : 'Gray and associations at law',
    providerAccount: found.firm && found.firm.includes('<br>') ? found.firm.split('<br>')[1] : 'OK514R',
    providerAddress: `${nameLen} Liverpool Road<br>Manchester<br>MW2 5WT`,
    providerPhone: `0712345678${nameLen % 9}`
  };
  
  // Initialize history with initial application received entry if it doesn't exist
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  
  // Ensure the history entry exists and has the correct format
  if (!req.session.data['app-history'][reference] || req.session.data['app-history'][reference].length === 0 || 
      (req.session.data['app-history'][reference].length > 0 && !req.session.data['app-history'][reference][0].action)) {
    
    // Clear and initialize
    req.session.data['app-history'][reference] = [];
    
    // Add initial application received entry
    let submittedDate = 'N/A';
    
    // Try to get submitted date from applicationData first
    if (applicationData && applicationData.submitted) {
      submittedDate = applicationData.submitted;
    } else if (req.session.data['open-applications']) {
      // Try to get from open-applications if not found in applicationData
      const openApp = req.session.data['open-applications'].find(app => app.ref === reference);
      if (openApp && openApp.submitted) {
        submittedDate = openApp.submitted;
      }
    }
    
    // If still not found, use current date as fallback
    if (submittedDate === 'N/A') {
      const now = new Date();
      submittedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const timeStr = String(randomHour).padStart(2, '0') + ':' + String(randomMin).padStart(2, '0');
    const datetime = submittedDate + ' ' + timeStr;
    
    req.session.data['app-history'][reference].push({
      timestamp: datetime,
      action: 'Initial application received',
      caseworker: 'N/A',
      details: null
    });
  }
  
  // Check if application is already assigned (in your list)
  const assignedApplications = req.session.data['assigned-applications'] || [];
  const isAssigned = assignedApplications.some(app => app.ref === reference && Boolean(app.isPriorAuthority) === requestedPriorAuthority);
  const isInitialApplicationAssigned = assignedApplications.some(app => app.ref === reference && !app.isPriorAuthority);
  const isPriorAuthorityAssigned = assignedApplications.some(app => app.ref === reference && app.isPriorAuthority);
  const statusApplication = requestedPriorAuthority && initialApplicationData ? initialApplicationData : application;
  const isStatusApplicationAssigned = requestedPriorAuthority && initialApplicationData ? isInitialApplicationAssigned : isAssigned;
  
  // Convert app-history to historyEvents format for template
  let historyEvents = [];
  if (req.session.data['app-history'] && req.session.data['app-history'][reference]) {
    const totalEvents = req.session.data['app-history'][reference].length;
    historyEvents = req.session.data['app-history'][reference].map((event, index) => {
      const action = event.action || event.title;
      const isPAEvent = action && (action.toLowerCase().includes('prior authority') || action.toLowerCase().includes('amendment') || action.toLowerCase().includes('appeal'));
      const tabAnchor = isPAEvent ? '#prior-authority' : '';
      const isLastEvent = index === totalEvents - 1;
      return {
        datetime: event.timestamp || event.datetime,
        caseworker: event.caseworker,
        title: action,
        versionLink: !isLastEvent ? `/v6/application/${reference}?viewVersion=${index}${tabAnchor}` : null,
        changes: event.changes || null,
        notes: event.notes || null,
        details: event.details || null,  // Pass details separately for notes
        justification: event.expandedText || event.justification || (event.type !== 'note' ? event.details : null) || null,
        oldValue: event.oldValue || null,
        newValue: event.newValue || null
      };
    });
  }
  
  // Check if viewing a previous version
  const viewVersion = req.query.viewVersion ? parseInt(req.query.viewVersion) : null;
  const isViewingPreviousVersion = viewVersion !== null && viewVersion < historyEvents.length - 1;
  
  // Get history array for reconstruction
  const historyArray = req.session.data['app-history'] && req.session.data['app-history'][reference] 
    ? req.session.data['app-history'][reference]
    : [];
  
  // If viewing a specific version, reconstruct the application state at that point
  let versionedApplication = application;
  let versionedTitle = null;
  
  if (isViewingPreviousVersion && viewVersion !== null) {
    // Reconstruct application state at this version
    versionedApplication = reconstructApplicationAtVersion(application, historyArray, viewVersion);
    
    // Get the event title for display
    if (historyArray[viewVersion]) {
      versionedTitle = historyArray[viewVersion].action || 'Unknown event';
    }
  }
  
  res.render('v6/application-details.njk', {
    pageTitle: reference,
    reference: reference,
    application: isViewingPreviousVersion ? versionedApplication : application,
    initialApplication: initialApplicationData,
    priorAuthorityApplication: priorAuthorityApplicationData,
    statusApplication: statusApplication,
    hasLinkedCases: hasLinkedCases,
    hasPriorAuthority: hasPriorAuthority,
    priorAuthorityType: priorAuthorityType,
    sessionData: req.session.data,
    isAssigned: isAssigned,
    isInitialApplicationAssigned: isInitialApplicationAssigned,
    isPriorAuthorityAssigned: isPriorAuthorityAssigned,
    isStatusApplicationAssigned: isStatusApplicationAssigned,
    requestedPriorAuthority: requestedPriorAuthority,
    historyEvents: historyEvents,
    isViewingPreviousVersion: isViewingPreviousVersion,
    viewVersion: viewVersion,
    versionedTitle: versionedTitle
  });
  
  // Clear toast after rendering so it only shows once (clear on next request to this route)
  if (req.session.data && req.session.data.toast) {
    req.session.data.toast = null;
  }
  
  console.log('APPLICATION REF:', application.ref, 'REFERENCE:', reference);
});

// GET /change/:reference/:field - Display change input form
router.get('/change/:reference/:field', function(req, res) {
  const { reference, field } = req.params;
  
  // Map field names to display names
  const fieldNames = {
    'first-name': 'First name',
    'last-name': 'Last name',
    'last-name-birth': 'Last name at birth',
    'date-of-birth': 'Date of birth',
    'ni-number': 'National Insurance number',
    'home-address': 'Home address',
    'correspondence-address': 'Correspondence address',
    'opponent-name': 'Opponent name',
    'child-name': 'Child 1 name',
    'child-1-dob': 'Child 1 date of birth',
    'child-2-name': 'Child 2 name',
    'child-2-dob': 'Child 2 date of birth'
  };
  
  if (!fieldNames[field]) {
    return res.status(404).send('Field not found');
  }
  
  res.render(`v6/change/${field}.njk`, {
    reference: reference,
    field: field,
    fieldName: fieldNames[field],
    sessionData: req.session.data
  });
});

// POST /change/:reference/:field - Save form input and redirect to confirm
router.post('/change/:reference/:field', function(req, res) {
  const { reference, field } = req.params;
  const { newValue, justification } = req.body;
  
  // Save to session
  req.session.data['change-reference'] = reference;
  req.session.data['change-field'] = field;
  req.session.data['change-new-value'] = newValue;
  req.session.data['change-justification'] = justification;
  
  res.redirect(`/v6/change/${reference}/${field}/confirm`);
});

// GET /change/:reference/:field/confirm - Display confirmation page
router.get('/change/:reference/:field/confirm', function(req, res) {
  const { reference, field } = req.params;
  
  const fieldNames = {
    'first-name': 'First name',
    'last-name': 'Last name',
    'last-name-birth': 'Last name at birth',
    'date-of-birth': 'Date of birth',
    'ni-number': 'National Insurance number',
    'home-address': 'Home address',
    'correspondence-address': 'Correspondence address',
    'opponent-name': 'Opponent name',
    'child-name': 'Child 1 name',
    'child-1-dob': 'Child 1 date of birth',
    'child-2-name': 'Child 2 name',
    'child-2-dob': 'Child 2 date of birth'
  };
  
  res.render('v6/change/confirm.njk', {
    reference: reference,
    field: field,
    fieldName: fieldNames[field] || field,
    sessionData: req.session.data
  });
});

// POST /change/:reference/:field/confirm - Confirm change and save to history
router.post('/change/:reference/:field/confirm', function(req, res) {
  const { reference, field } = req.params;
  const newValue = req.session.data['change-new-value'];
  const justification = req.session.data['change-justification'];
  
  // Find the application
  let application = null;
  if (req.session.data['assigned-applications']) {
    application = req.session.data['assigned-applications'].find(app => app.ref === reference);
  }
  if (!application && req.session.data['completed-applications']) {
    application = req.session.data['completed-applications'].find(app => app.ref === reference);
  }
  if (!application && req.session.data['open-applications']) {
    application = req.session.data['open-applications'].find(app => app.ref === reference);
  }
  
  // Get old value from application
  let oldValue = 'N/A';
  let displayField = field.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  if (field === 'first-name') oldValue = application?.firstName || 'N/A';
  else if (field === 'last-name') oldValue = application?.lastName || 'N/A';
  else if (field === 'last-name-birth') oldValue = application?.lastName || 'N/A';
  else if (field === 'date-of-birth') oldValue = application?.dob || 'N/A';
  else if (field === 'ni-number') oldValue = application?.niNumber || 'N/A';
  else if (field === 'home-address') oldValue = application?.homeAddress ? application.homeAddress.replace(/<br>/g, ' ') : 'N/A';
  else if (field === 'correspondence-address') oldValue = application?.correspondenceAddress ? application.correspondenceAddress.replace(/<br>/g, ' ') : 'N/A';
  else if (field === 'opponent-name') oldValue = application?.opponentName || 'N/A';
  else if (field === 'child-name') oldValue = application?.children?.[0]?.name || 'N/A';
  else if (field === 'child-1-dob') oldValue = application?.children?.[0]?.dob || 'N/A';
  else if (field === 'child-2-name') oldValue = application?.children?.[1]?.name || 'N/A';
  else if (field === 'child-2-dob') oldValue = application?.children?.[1]?.dob || 'N/A';
  
  // Update application data
  if (field === 'first-name') application.firstName = newValue;
  else if (field === 'last-name') application.lastName = newValue;
  else if (field === 'last-name-birth') application.lastName = newValue;
  else if (field === 'date-of-birth') application.dob = newValue;
  else if (field === 'ni-number') application.niNumber = newValue;
  else if (field === 'home-address') application.homeAddress = newValue.replace(/\n/g, '<br>');
  else if (field === 'correspondence-address') application.correspondenceAddress = newValue.replace(/\n/g, '<br>');
  else if (field === 'opponent-name') application.opponentName = newValue;
  else if (field === 'child-name' && application.children?.[0]) application.children[0].name = newValue;
  else if (field === 'child-1-dob' && application.children?.[0]) application.children[0].dob = newValue;
  else if (field === 'child-2-name' && application.children?.[1]) application.children[1].name = newValue;
  else if (field === 'child-2-dob' && application.children?.[1]) application.children[1].dob = newValue;
  
  // Add to history
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  if (!req.session.data['app-history'][reference]) {
    req.session.data['app-history'][reference] = [];
  }
  
  // Generate timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const datetime = dateStr + ' ' + timeStr;
  const caseworker = application?.caseworker || 'Mo Bradshaw';
  
  req.session.data['app-history'][reference].push({
    timestamp: datetime,
    action: `${displayField} updated`,
    caseworker: caseworker,
    details: justification || null
  });
  
  // Clear change session data
  delete req.session.data['change-reference'];
  delete req.session.data['change-field'];
  delete req.session.data['change-new-value'];
  delete req.session.data['change-justification'];
  
  res.redirect(`/v6/application/${reference}#people`);
});

// =========================================================
// PRIOR AUTHORITY (COUNSEL) - MAKE ASSESSMENT FLOW (V6)
// =========================================================

function findApplicationByReference(req, reference, isPriorAuthority) {
  const collections = [
    req.session.data['assigned-applications'] || [],
    req.session.data['completed-applications'] || [],
    req.session.data['open-applications'] || []
  ];

  for (const collection of collections) {
    const match = collection.find(app => app.ref === reference && Boolean(app.isPriorAuthority) === Boolean(isPriorAuthority));
    if (match) {
      return match;
    }
  }

  return null;
}

function defaultCounselTypeForApplication(application) {
  const priorAuthorityType = (application && application.priorAuthorityType) || '';
  if (priorAuthorityType.includes("King's Counsel and Two Junior Counsel")) return "King's Counsel and Two Junior Counsel";
  if (priorAuthorityType.includes("King's Counsel and Junior Counsel")) return "King's Counsel and Junior Counsel";
  if (priorAuthorityType.includes('Two Junior Counsel')) return 'Two Junior Counsel';
  if (priorAuthorityType.includes("King's Counsel")) return "King's Counsel alone";
  if (priorAuthorityType.includes('Junior Counsel')) return 'Two Junior Counsel';
  return "King's Counsel alone";
}

function updatePriorAuthorityStatusForReference(req, reference, decision) {
  const collections = [
    req.session.data['assigned-applications'] || [],
    req.session.data['completed-applications'] || [],
    req.session.data['open-applications'] || []
  ];

  const status = decision === 'Refuse' ? 'Refused' : 'Granted';
  const decisionType = decision === 'Refuse' ? 'Refuse' : 'Grant';

  collections.forEach(collection => {
    collection.forEach(app => {
      if (app.ref === reference && app.isPriorAuthority) {
        app.status = status;
        app.decisionType = decisionType;
      }
    });
  });
}

function removePriorAuthorityFromAssignedList(req, reference) {
  const assigned = req.session.data['assigned-applications'] || [];
  req.session.data['assigned-applications'] = assigned.filter(app => !(app.ref === reference && app.isPriorAuthority));
}

router.get('/counsel-assessment/decision', function (req, res) {
  const reference = req.query.reference || req.session.data['counsel-assessment-reference'] || '';
  if (reference) {
    // Entering from application details starts a fresh decision step; do not preselect Grant.
    delete req.session.data['counsel-decision'];
    delete req.session.data['counsel-covers'];
    delete req.session.data['counsel-justification'];
    req.session.data['counsel-assessment-reference'] = reference;
  }

  const priorAuthorityApplication = reference
    ? findApplicationByReference(req, reference, true)
    : null;

  const priorAuthorityAlreadyDecided = priorAuthorityApplication &&
    (priorAuthorityApplication.status === 'Granted' || priorAuthorityApplication.status === 'Refused');

  // Do not allow a new assessment when a decision already exists.
  if (reference && priorAuthorityAlreadyDecided) {
    res.redirect(`/v6/application/${reference}?isPriorAuthority=true#prior-authority`);
    return;
  }

  const defaultCounselType = defaultCounselTypeForApplication(priorAuthorityApplication);
  req.session.data['counsel-default-counsel-type'] = defaultCounselType;

  if (!req.session.data['counsel-type-granted']) {
    req.session.data['counsel-type-granted'] = defaultCounselType;
  }

  req.session.data['counsel-application-type'] = (priorAuthorityApplication && priorAuthorityApplication.priorAuthorityType)
    ? `Prior authority - ${priorAuthorityApplication.priorAuthorityType}`
    : 'Prior authority - Counsel';

  const errors = req.session.data['counsel-assessment-errors'] || null;
  delete req.session.data['counsel-assessment-errors'];

  res.render('v6/counsel-assessment/decision.njk', {
    pageTitle: 'Make your decision - Prior Authority',
    reference: reference,
    defaultCounselType: defaultCounselType,
    errors: errors
  });
});

router.post('/counsel-assessment/decision-handler', function (req, res) {
  const decision = req.body['counsel-decision'];

  const errors = {};
  if (!decision) {
    errors.decision = 'Select Grant or Refuse';
  }

  if (Object.keys(errors).length > 0) {
    req.session.data['counsel-assessment-errors'] = errors;
    res.redirect('/v6/counsel-assessment/decision');
    return;
  }

  // Counsel type should always resolve to a value (selected or pre-selected default).
  if (!req.session.data['counsel-type-granted']) {
    req.session.data['counsel-type-granted'] = req.session.data['counsel-default-counsel-type'] || "King's Counsel";
  }

  if (decision === 'Refuse') {
    res.redirect('/v6/counsel-assessment/refuse-justification');
    return;
  }

  res.redirect('/v6/counsel-assessment/what-it-covers');
});

router.get('/counsel-assessment/refuse-justification', function (req, res) {
  const errors = req.session.data['counsel-refuse-justification-errors'] || null;
  delete req.session.data['counsel-refuse-justification-errors'];

  res.render('v6/counsel-assessment/refuse-justification.njk', {
    pageTitle: 'Why are you refusing this request? - Prior Authority',
    reference: req.session.data['counsel-assessment-reference'] || '',
    errors: errors
  });
});

router.post('/counsel-assessment/refuse-justification-handler', function (req, res) {
  const justification = (req.body['counsel-refuse-justification'] || '').trim();

  const errors = {};
  if (!justification) {
    errors.justification = 'Enter justification for refusing this request';
  }

  if (Object.keys(errors).length > 0) {
    req.session.data['counsel-refuse-justification-errors'] = errors;
    res.redirect('/v6/counsel-assessment/refuse-justification');
    return;
  }

  req.session.data['counsel-refuse-justification'] = justification;
  res.redirect('/v6/counsel-assessment/check-your-answers');
});

router.get('/counsel-assessment/what-it-covers', function (req, res) {
  res.render('v6/counsel-assessment/what-it-covers.njk', {
    pageTitle: 'What does this application cover? - Prior Authority',
    reference: req.session.data['counsel-assessment-reference'] || ''
  });
});

router.post('/counsel-assessment/covers-handler', function (req, res) {
  res.redirect('/v6/counsel-assessment/check-your-answers');
});

router.get('/counsel-assessment/check-your-answers', function (req, res) {
  res.render('v6/counsel-assessment/check-your-answers.njk', {
    pageTitle: 'Check your answers - Prior Authority',
    reference: req.session.data['counsel-assessment-reference'] || ''
  });
});

router.post('/counsel-assessment/submit-assessment', function (req, res) {
  const reference = req.session.data['counsel-assessment-reference'];
  const decision = req.session.data['counsel-decision'];

  if (!decision) {
    res.redirect(`/v6/counsel-assessment/decision?reference=${reference || ''}`);
    return;
  }

  if (reference) {
    updatePriorAuthorityStatusForReference(req, reference, decision);
    removePriorAuthorityFromAssignedList(req, reference);
  }
  res.redirect('/v6/counsel-assessment/confirmation');
});

router.get('/counsel-assessment/confirmation', function (req, res) {
  res.render('v6/counsel-assessment/confirmation.njk', {
    pageTitle: 'Assessment for prior authority completed - Prior Authority',
    reference: req.session.data['counsel-assessment-reference'] || 'CRM4-Counsel-123'
  });
});

// =========================================================
// PRIOR AUTHORITY (EXPERT) - MAKE ASSESSMENT FLOW (V6)
// =========================================================

function expertDetailsForApplication(application) {
  const priorAuthorityType = (application && application.priorAuthorityType) || '';

  // Read from application data fields if present
  if (application && application.expertName) {
    return {
      requestType: priorAuthorityType || 'Expert',
      name: application.expertName,
      type: application.expertType || 'Not provided',
      location: application.expertLocation || 'Not provided',
      hours: application.expertHours || '00',
      minutes: application.expertMinutes || '00',
      rate: application.expertRate || '0',
      requestedAmount: application.expertRequestedAmount || '0'
    };
  }

  // Fallback defaults based on type
  if (priorAuthorityType.includes('Psychiatrist')) {
    return {
      requestType: priorAuthorityType || 'Expert - Psychiatrist',
      name: 'Dr Morley Calzoni',
      type: 'Psychiatrist',
      location: 'London',
      hours: '60',
      minutes: '00',
      rate: '100.80',
      requestedAmount: '6048.00'
    };
  }

  if (priorAuthorityType.includes('Physiotherapist')) {
    return {
      requestType: priorAuthorityType || 'Expert - Physiotherapist',
      name: 'Dr Rachel Thompson',
      type: 'Physiotherapist',
      location: 'Manchester',
      hours: '40',
      minutes: '00',
      rate: '85.50',
      requestedAmount: '3420.00'
    };
  }

  return {
    requestType: priorAuthorityType || 'Expert',
    name: 'Dr Andrew Wilson',
    type: 'Medical examiner',
    location: 'Birmingham',
    hours: '50',
    minutes: '00',
    rate: '95.00',
    requestedAmount: '4750.00'
  };
}

function formatCurrencyGBP(amountString) {
  const numeric = Number(String(amountString || '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return 'Not provided';
  return `£${numeric.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

router.get('/expert-assessment/decision', function (req, res) {
  const reference = req.query.reference || req.session.data['expert-assessment-reference'] || '';

  if (reference) {
    // Starting from the details page resets this flow.
    delete req.session.data['expert-decision'];
    delete req.session.data['expert-justification'];
    delete req.session.data['expert-amount-decision'];
    delete req.session.data['expert-new-amount'];
    delete req.session.data['expert-new-name'];
    delete req.session.data['expert-new-type'];
    delete req.session.data['expert-new-location'];
    delete req.session.data['expert-new-rate'];
    delete req.session.data['expert-new-hours'];
    delete req.session.data['expert-new-minutes'];
    delete req.session.data['expert-new-total-amount'];
    req.session.data['expert-assessment-reference'] = reference;
  }

  const priorAuthorityApplication = reference
    ? findApplicationByReference(req, reference, true)
    : null;

  const priorAuthorityAlreadyDecided = priorAuthorityApplication &&
    (priorAuthorityApplication.status === 'Granted' || priorAuthorityApplication.status === 'Refused');

  if (reference && priorAuthorityAlreadyDecided) {
    res.redirect(`/v6/application/${reference}?isPriorAuthority=true#prior-authority`);
    return;
  }

  const expertDetails = expertDetailsForApplication(priorAuthorityApplication);

  req.session.data['expert-application-type'] = (priorAuthorityApplication && priorAuthorityApplication.priorAuthorityType)
    ? `Prior authority - ${priorAuthorityApplication.priorAuthorityType}`
    : 'Prior authority - Expert';
  req.session.data['expert-request-type'] = expertDetails.requestType;
  req.session.data['expert-default-name'] = expertDetails.name;
  req.session.data['expert-default-type'] = expertDetails.type;
  req.session.data['expert-default-location'] = expertDetails.location;
  req.session.data['expert-default-rate'] = expertDetails.rate;
  req.session.data['expert-default-hours'] = expertDetails.hours;
  req.session.data['expert-default-minutes'] = expertDetails.minutes;
  req.session.data['expert-requested-amount'] = expertDetails.requestedAmount;

  const errors = req.session.data['expert-assessment-errors'] || null;
  delete req.session.data['expert-assessment-errors'];

  res.render('v6/expert-assessment/decision.njk', {
    pageTitle: 'Make a decision - Prior Authority',
    reference: reference,
    errors: errors
  });
});

router.post('/expert-assessment/decision-handler', function (req, res) {
  const decision = req.body['expert-decision'];

  const errors = {};
  if (!decision) errors.decision = 'Select Grant or Refuse';

  if (Object.keys(errors).length > 0) {
    req.session.data['expert-assessment-errors'] = errors;
    res.redirect('/v6/expert-assessment/decision');
    return;
  }

  if (decision === 'Refuse') {
    res.redirect('/v6/expert-assessment/refuse-justification');
    return;
  }

  res.redirect('/v6/expert-assessment/amount');
});

router.get('/expert-assessment/refuse-justification', function (req, res) {
  const errors = req.session.data['expert-refuse-justification-errors'] || null;
  delete req.session.data['expert-refuse-justification-errors'];

  res.render('v6/expert-assessment/refuse-justification.njk', {
    pageTitle: 'Why are you refusing this request? - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || '',
    errors: errors
  });
});

router.post('/expert-assessment/refuse-justification-handler', function (req, res) {
  const justification = (req.body['expert-refuse-justification'] || '').trim();

  const errors = {};
  if (!justification) {
    errors.justification = 'Enter justification for refusing this request';
  }

  if (Object.keys(errors).length > 0) {
    req.session.data['expert-refuse-justification-errors'] = errors;
    res.redirect('/v6/expert-assessment/refuse-justification');
    return;
  }

  req.session.data['expert-refuse-justification'] = justification;
  res.redirect('/v6/expert-assessment/check-your-answers');
});

router.get('/expert-assessment/amount', function (req, res) {
  const errors = req.session.data['expert-assessment-amount-errors'] || null;
  delete req.session.data['expert-assessment-amount-errors'];

  res.render('v6/expert-assessment/amount.njk', {
    pageTitle: 'Make a decision - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || '',
    requestedAmount: formatCurrencyGBP(req.session.data['expert-requested-amount']),
    errors: errors
  });
});

router.post('/expert-assessment/amount-handler', function (req, res) {
  const amountDecision = req.body['expert-amount-decision'];
  const justification = (req.body['expert-justification'] || '').trim();

  const errors = {};
  if (!amountDecision) errors.amountDecision = 'Select the amount to grant';
  if (!justification) errors.justification = 'Enter justification';

  if (Object.keys(errors).length > 0) {
    req.session.data['expert-assessment-amount-errors'] = errors;
    res.redirect('/v6/expert-assessment/amount');
    return;
  }

  req.session.data['expert-justification'] = justification;

  if (amountDecision === 'new') {
    req.session.data['expert-new-name'] = (req.body['expert-new-name'] || '').trim() || req.session.data['expert-default-name'] || 'Dr Andrew Wilson';
    req.session.data['expert-new-type'] = (req.body['expert-new-type'] || '').trim() || req.session.data['expert-default-type'] || 'Medical examiner';
    req.session.data['expert-new-location'] = (req.body['expert-new-location'] || '').trim() || req.session.data['expert-default-location'] || 'Birmingham';
    req.session.data['expert-new-rate'] = (req.body['expert-new-rate'] || '').trim() || req.session.data['expert-default-rate'] || '95.00';
    req.session.data['expert-new-hours'] = (req.body['expert-new-hours'] || '').trim() || req.session.data['expert-default-hours'] || '50';
    req.session.data['expert-new-minutes'] = (req.body['expert-new-minutes'] || '').trim() || req.session.data['expert-default-minutes'] || '00';

    const rawTotalAmount = (req.body['expert-new-total-amount'] || '').trim();
    req.session.data['expert-new-total-amount'] = rawTotalAmount;

    const normalized = rawTotalAmount.replace(/[£,\s]/g, '');
    const parsed = Number(normalized);
    req.session.data['expert-new-amount'] = Number.isFinite(parsed) && parsed > 0
      ? parsed.toFixed(2)
      : req.session.data['expert-requested-amount'];
  } else {
    delete req.session.data['expert-new-name'];
    delete req.session.data['expert-new-type'];
    delete req.session.data['expert-new-location'];
    delete req.session.data['expert-new-rate'];
    delete req.session.data['expert-new-hours'];
    delete req.session.data['expert-new-minutes'];
    delete req.session.data['expert-new-total-amount'];
    delete req.session.data['expert-new-amount'];
  }

  res.redirect('/v6/expert-assessment/check-your-answers');
});

router.get('/expert-assessment/new-amount', function (req, res) {
  const errors = req.session.data['expert-assessment-new-amount-errors'] || null;
  delete req.session.data['expert-assessment-new-amount-errors'];

  res.render('v6/expert-assessment/new-amount.njk', {
    pageTitle: 'Make a decision - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || '',
    requestedAmount: formatCurrencyGBP(req.session.data['expert-requested-amount']),
    errors: errors
  });
});

router.post('/expert-assessment/new-amount-handler', function (req, res) {
  const rawAmount = (req.body['expert-new-amount'] || '').trim();
  const normalized = rawAmount.replace(/[£,\s]/g, '');
  const parsed = Number(normalized);

  if (!normalized || !Number.isFinite(parsed) || parsed <= 0) {
    req.session.data['expert-assessment-new-amount-errors'] = {
      newAmount: 'Enter a valid new amount'
    };
    res.redirect('/v6/expert-assessment/new-amount');
    return;
  }

  req.session.data['expert-new-amount'] = parsed.toFixed(2);
  res.redirect('/v6/expert-assessment/check-your-answers');
});

router.get('/expert-assessment/check-your-answers', function (req, res) {
  const requestedAmount = req.session.data['expert-requested-amount'];
  const newAmount = req.session.data['expert-new-amount'];
  const amountDecision = req.session.data['expert-amount-decision'];

  let grantedAmount = null;
  if (req.session.data['expert-decision'] === 'Grant') {
    grantedAmount = amountDecision === 'new' ? newAmount : requestedAmount;
  }

  res.render('v6/expert-assessment/check-your-answers.njk', {
    pageTitle: 'Check your answers - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || '',
    requestedAmount: formatCurrencyGBP(requestedAmount),
    grantedAmount: formatCurrencyGBP(grantedAmount)
  });
});

router.post('/expert-assessment/submit-assessment', function (req, res) {
  const reference = req.session.data['expert-assessment-reference'];
  const decision = req.session.data['expert-decision'];

  if (!decision) {
    res.redirect(`/v6/expert-assessment/decision?reference=${reference || ''}`);
    return;
  }

  if (reference) {
    updatePriorAuthorityStatusForReference(req, reference, decision);
    removePriorAuthorityFromAssignedList(req, reference);
  }

  res.redirect('/v6/expert-assessment/confirmation');
});

router.get('/expert-assessment/confirmation', function (req, res) {
  res.render('v6/expert-assessment/confirmation.njk', {
    pageTitle: 'Assessment for prior authority completed - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || 'CRM4-Expert-123'
  });
});


module.exports = router
