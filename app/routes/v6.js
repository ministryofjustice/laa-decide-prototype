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

  function setHistoricalField(field, value) {
    switch (field) {
      case 'firstName': reconstructed.firstName = value; break;
      case 'lastName': reconstructed.lastName = value; break;
      case 'dob': reconstructed.dob = value; break;
      case 'niNumber': reconstructed.niNumber = value; break;
      case 'homeAddress': reconstructed.homeAddress = value; break;
      case 'address': reconstructed.address = value; break;
      case 'correspondenceAddress': reconstructed.correspondenceAddress = value; break;
      case 'opponentName': reconstructed.opponentName = value; break;
      case 'priorAuthorityType': reconstructed.priorAuthorityType = value; break;
    }
  }

  // Reverse edits made after this version before replaying its event stream.
  for (let i = history.length - 1; i > versionIndex; i--) {
    const event = history[i];
    if (event.fieldChanged && typeof event.oldValue !== 'undefined') {
      setHistoricalField(event.fieldChanged, event.oldValue);
    }
  }

  reconstructed.status = 'Submitted';
  reconstructed.decisionType = null;
  if (application.isPriorAuthority) reconstructed.priorAuthorityStatus = 'Submitted';
  
  // Apply all events up to and including the specified version
  for (let i = 0; i <= versionIndex && i < history.length; i++) {
    const event = history[i];
    
    // Handle status changes (for main application or PA decisions)
    if (event.statusAfter) {
      if (event.type === 'pa_decision') {
        if (application.isPriorAuthority) {
          reconstructed.status = event.statusAfter;
          reconstructed.decisionType = event.statusAfter === 'Granted' ? 'Grant' : 'Refuse';
        }
        reconstructed.priorAuthorityStatus = event.statusAfter;
      } else if (!application.isPriorAuthority) {
        reconstructed.status = event.statusAfter;
        reconstructed.decisionType = event.statusAfter === 'Granted' ? 'Grant' : 
                                     event.statusAfter === 'Refused' ? 'Refuse' : null;
      }
    }
    
    // Handle data changes (name, address, etc.)
    if (event.fieldChanged) {
      setHistoricalField(event.fieldChanged, event.newValue);
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
  const currentReference = req.session.data['decision-reference'];

  if (reference && reference !== currentReference) {
    delete req.session.data['overall-decision'];
    delete req.session.data['overall-decision-errors'];
    delete req.session.data['cert-date-type'];
    delete req.session.data['cert-date-day'];
    delete req.session.data['cert-date-month'];
    delete req.session.data['cert-date-year'];
    delete req.session.data['cert-date-display'];
    delete req.session.data['refusal-reason'];
    delete req.session.data['refuse-justification'];
    delete req.session.data['refuse-reason-errors'];
  }

  if (reference) {
    req.session.data['decision-reference'] = reference;
  }
  res.redirect('/v6/overall-decision');
});

router.post('/decision-check', function(request, response) {
  var decisionCheck = request.body['overall-decision']
  var errors = {}

  if (!decisionCheck) {
    errors.overallDecision = 'Select grant or refuse to continue'
  }

  if (Object.keys(errors).length > 0) {
    request.session.data['overall-decision-errors'] = errors
    response.redirect('/v6/overall-decision')
    return
  }

  if (decisionCheck == "refuse") {
    response.redirect("/v6/refuse-reason")
  } else {
    response.redirect("/v6/grant-certificate-date")
  }
});

router.post('/grant-date-submit', function(request, response) {
  var certDateType = request.body['cert-date-type']
  var certDateDay = (request.body['cert-date-day'] || '').trim()
  var certDateMonth = (request.body['cert-date-month'] || '').trim()
  var certDateYear = (request.body['cert-date-year'] || '').trim()
  var errors = {}

  if (!certDateType) {
    errors.certDateType = 'Select when the substantive certificate should be granted from'
  }

  if (certDateType === 'another-date') {
    if (!certDateDay || !certDateMonth || !certDateYear) {
      errors.certDate = 'Enter the date the substantive certificate should be granted from'
    }
  }

  if (Object.keys(errors).length > 0) {
    request.session.data['grant-certificate-date-errors'] = errors
    response.redirect('/v6/grant-certificate-date')
    return
  }

    // Certificate date data stored in session from form
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
      displayDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
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
  var refusalReason = request.body['refusal-reason']
  var refuseJustification = (request.body['refuse-justification'] || '').trim()
  var errors = {}

  if (!refusalReason) {
    errors.refusalReason = 'You must select a refusal reason to continue'
  }

  if (!refuseJustification) {
    errors.refuseJustification = 'A justification reason must be entered'
  }

  if (Object.keys(errors).length > 0) {
    request.session.data['refuse-reason-errors'] = errors
    response.redirect('/v6/refuse-reason')
    return
  }

  request.session.data['refuse-justification'] = refuseJustification

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
            type: 'decision',
            statusAfter: 'Refused',
            changes: {
              From: 'Submitted',
              To: 'Refused'
            },
            justification: justification || null,
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
              type: 'decision',
              statusAfter: 'Granted',
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
  const errors = req.session.data['grant-certificate-date-errors'] || null;
  delete req.session.data['grant-certificate-date-errors'];

  if (!errors) {
    delete req.session.data['cert-date-type'];
    delete req.session.data['cert-date-day'];
    delete req.session.data['cert-date-month'];
    delete req.session.data['cert-date-year'];
  }

  res.render('v6/grant-certificate-date.html', {
    pageTitle: 'Make a decision',
    decisionReference: decisionReference,
    errors: errors
  });
});

router.get('/refuse-reason', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  const errors = req.session.data['refuse-reason-errors'] || null;
  delete req.session.data['refuse-reason-errors'];

  res.render('v6/refuse-reason.html', {
    pageTitle: 'Make a decision',
    decisionReference: decisionReference,
    errors: errors
  });
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
  const errors = req.session.data['overall-decision-errors'] || null;
  delete req.session.data['overall-decision-errors'];

  res.render('v6/overall-decision.html', {
    pageTitle: 'Make a decision',
    decisionReference: decisionReference,
    errors: errors
  });
});

router.get('/confirmation-screen', function(req, res) {
  const decisionReference = req.session.data['decision-reference'] || 'L-12Z-13P';
  res.render(req.session.data['consolidated-v6'] === true
    ? 'v6/consolidated-confirmation.njk'
    : 'v6/confirmation-screen.html', {
    pageTitle: 'Confirmation',
    decisionReference: decisionReference
  });
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

router.get('/sign-out', function(req, res) {
  if (req.session.data) {
    delete req.session.data['v6-authenticated'];
  }
  res.redirect('/v6/');
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

function historyTimestamp(date, time = '09:00') {
  const fallbackDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  return `${date || fallbackDate} ${time}`;
}

function currentHistoryTimestamp() {
  const now = new Date();
  return now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function applicationsForReference(req, reference) {
  const collections = [
    req.session.data['assigned-applications'] || [],
    req.session.data['completed-applications'] || [],
    req.session.data['open-applications'] || [],
    req.session.data['open-applications-all'] || [],
    req.session.data['consolidated-extra-initial-applications-v6'] || []
  ];
  return collections.flat().filter(application => application && application.ref === reference);
}

function stableConsolidatedCaseworker(req, reference, variant = 'initial') {
  if (!req.session.data['consolidated-caseworkers-v6']) {
    req.session.data['consolidated-caseworkers-v6'] = {};
  }
  const key = `${reference}|${variant}`;
  if (!req.session.data['consolidated-caseworkers-v6'][key]) {
    req.session.data['consolidated-caseworkers-v6'][key] = caseworkers[Math.floor(Math.random() * caseworkers.length)];
  }
  return req.session.data['consolidated-caseworkers-v6'][key];
}

function ensureConsolidatedHistory(req, reference, currentApplication = null) {
  if (req.session.data['consolidated-v6'] !== true || !reference) return;

  if (!req.session.data['app-history']) req.session.data['app-history'] = {};
  const existingHistory = req.session.data['app-history'][reference] || [];
  const applications = applicationsForReference(req, reference);
  const initialApplication = applications.find(application => !application.isPriorAuthority && !application.isRedetermination) || null;
  const assignedInitialApplication = (req.session.data['assigned-applications'] || [])
    .find(application => application.ref === reference && !application.isPriorAuthority && !application.isRedetermination) || null;
  const laterApplication = currentApplication && (currentApplication.isPriorAuthority || currentApplication.isRedetermination)
    ? currentApplication
    : applications.find(application => application.isPriorAuthority || application.isRedetermination) || null;
  const requiresGrantedInitial = Boolean(laterApplication);
  const initialDate = (initialApplication && initialApplication.submitted) || (laterApplication && laterApplication.initialApplicationSubmitted) || null;
  const existingInitialAssignment = existingHistory.find(event => /initial application assigned|^application assigned/i.test(event.action || ''));
  const initialCaseworker = (assignedInitialApplication && assignedInitialApplication.caseworker)
    || (initialApplication && initialApplication.caseworker)
    || (existingInitialAssignment && existingInitialAssignment.caseworker !== 'Caseworker name' && existingInitialAssignment.caseworker)
    || stableConsolidatedCaseworker(req, reference);
  const remainingEvents = [...existingHistory];

  function takeExisting(predicate, fallback) {
    const index = remainingEvents.findIndex(predicate);
    return index >= 0 ? remainingEvents.splice(index, 1)[0] : fallback;
  }

  const requiredEvents = [
    takeExisting(
      event => /^(initial )?application received$/i.test(event.action || ''),
      {
        timestamp: historyTimestamp(initialDate, '09:00'),
        action: 'Initial application received',
        caseworker: 'N/A',
        type: 'status_change',
        statusAfter: 'Submitted',
        justification: 'Initial application submitted by provider.'
      }
    )
  ];
  requiredEvents[0].action = 'Initial application received';

  const isInitialAssignment = event => /initial application assigned|^application assigned/i.test(event.action || '');
  const hasInitialAssignment = Boolean(assignedInitialApplication) || remainingEvents.some(isInitialAssignment);

  if (requiresGrantedInitial || hasInitialAssignment) {
    requiredEvents.push(takeExisting(
      event => isInitialAssignment(event) && (event.caseworker === initialCaseworker || initialCaseworker === 'Caseworker name'),
      {
        timestamp: historyTimestamp(initialDate, '10:00'),
        action: `Initial application assigned to ${initialCaseworker}`,
        caseworker: initialCaseworker,
        type: 'assignment'
      }
    ));
    requiredEvents[1].action = `Initial application assigned to ${requiredEvents[1].caseworker || initialCaseworker}`;
    requiredEvents[1].type = 'assignment';
    for (let index = remainingEvents.length - 1; index >= 0; index--) {
      if (isInitialAssignment(remainingEvents[index])) remainingEvents.splice(index, 1);
    }
  }

  if (requiresGrantedInitial) {
    requiredEvents.push(takeExisting(
      event => /initial application granted|decision to grant application/i.test(event.action || ''),
      {
        timestamp: historyTimestamp(initialDate, '11:00'),
        action: 'Initial application granted',
        caseworker: initialCaseworker,
        type: 'decision',
        statusAfter: 'Granted',
        changes: { From: 'Submitted', To: 'Granted' }
      }
    ));
    const grantedEvent = requiredEvents[requiredEvents.length - 1];
    grantedEvent.action = 'Initial application granted';
    grantedEvent.type = 'decision';
    grantedEvent.statusAfter = 'Granted';

    const isRedetermination = Boolean(laterApplication.isRedetermination);
    const receivedLabel = isRedetermination ? 'Redetermination received' : 'Prior authority received';
    requiredEvents.push(takeExisting(
      event => isRedetermination
        ? /redetermination received/i.test(event.action || '')
        : /prior authority( request)? received/i.test(event.action || ''),
      {
        timestamp: historyTimestamp(laterApplication.submitted, '09:00'),
        action: receivedLabel,
        caseworker: 'N/A',
        type: isRedetermination ? 'redetermination_status_change' : 'pa_status_change',
        statusAfter: 'Submitted',
        justification: isRedetermination
          ? 'Redetermination request submitted by provider.'
          : 'Prior authority request submitted by provider.'
      }
    ));
    requiredEvents[requiredEvents.length - 1].action = receivedLabel;
  }

  req.session.data['app-history'][reference] = [...requiredEvents, ...remainingEvents];
}

function appendConsolidatedHistory(req, reference, event, currentApplication = null) {
  if (req.session.data['consolidated-v6'] !== true || !reference) return;
  ensureConsolidatedHistory(req, reference, currentApplication);
  req.session.data['app-history'][reference].push({
    timestamp: currentHistoryTimestamp(),
    caseworker: 'Caseworker name',
    ...event
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

function generateDateAfter(dateText, daysAfter) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return generateRandomDate();
  date.setDate(date.getDate() + daysAfter);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
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
  const openApplications = [];
  const completedApplications = [];
  const generatedRefs = new Set();
  const priorAuthorityTypes = ['Expert - Psychiatrist', 'Expert - Physiotherapist', 'Expert - Medical examiner', 'Disbursement', 'Counsel', "King's Counsel"];

  function uniqueRef() {
    let ref = generateRandomRef();
    while (generatedRefs.has(ref)) ref = generateRandomRef();
    generatedRefs.add(ref);
    return ref;
  }

  // Split: roughly half are pending initial applications,
  // the other half are Granted initial apps with 1-2 pending PA requests.
  const initialPendingCount = Math.ceil(count / 2);
  const paScenarioCount = count - initialPendingCount;

  // --- Pending initial applications (no status — awaiting decision) ---
  for (let i = 0; i < initialPendingCount; i++) {
    const ref = uniqueRef();
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
    const submittedDate = generateRandomDate();

    openApplications.push({
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
      // No status — awaiting assessment
    });
  }

  // --- PA scenarios: Granted initial app (completed) + 1-2 pending PA requests (open) ---
  for (let i = 0; i < paScenarioCount; i++) {
    const ref = uniqueRef();
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
    const initialSubmitted = generateRandomDate();

    // Granted initial application — goes into completed, not open
    completedApplications.push({
      ref,
      reference: ref,
      firstName,
      lastName,
      dob: '12 Jan 1980',
      submitted: initialSubmitted,
      firm: 'WATKINS SOLICITORS INC<br>OK514R',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      matterType: { title: 'Family', subtext: "Special Children's Act" },
      isPriorAuthority: false,
      status: 'Granted',
      decisionType: 'Grant'
    });

    // 1 or 2 pending PA requests — same ref, different expert types
    const numPA = Math.random() > 0.5 ? 2 : 1;
    // Pick distinct PA types for this scenario
    const shuffled = [...priorAuthorityTypes].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numPA; j++) {
      const paType = shuffled[j];
      const isExpert = paType.includes('Expert');
      const expertProfile = isExpert ? pickExpertProfile(paType) : null;
      const paSubmitted = generateDateAfter(initialSubmitted, 7 + (j * 7));

      const paApp = {
        ref,
        reference: ref,
        firstName,
        lastName,
        dob: '12 Jan 1980',
        submitted: paSubmitted,
        firm: 'WATKINS SOLICITORS INC<br>OK514R',
        type: 'Prior authority',
        priorAuthorityType: paType,
        delegatedFunctions: 'N/A',
        matterType: { title: 'Family', subtext: "Special Children's Act" },
        isPriorAuthority: true
        // No status — awaiting PA assessment
      };

      if (paType === 'Disbursement') {
        paApp.disbursementType = 'Travel';
        paApp.disbursementAmount = '680';
        paApp.disbursementJustification = 'The client resides in a remote rural location with no access to public transport. The travel is essential to obtain detailed instructions and review sensitive case documents that cannot be shared electronically.';
      }

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

      openApplications.push(paApp);
    }
  }

  return { open: openApplications, completed: completedApplications };
}

const LINKED_CASE_COUNT_PATTERN = [1, 2, 3, 4, 2];
const STANDALONE_CASE_INTERVAL = 4;
const DEMO_REPLACEMENT_SCENARIOS = ['linked-initial', 'late-linked-initial', 'prior-authority'];

function assignLinkedCaseMetadata(openApplications, existingLinkedCases = {}) {
  if (!Array.isArray(openApplications) || openApplications.length === 0) {
    return existingLinkedCases;
  }

  const usedRefs = new Set(openApplications.map(app => app.ref));
  Object.keys(existingLinkedCases).forEach(ref => usedRefs.add(ref));
  // Carry forward previously generated groups so the same lead keeps the same
  // associated cases on every reload, instead of reshuffling them each time.
  const linkedCasesByReference = { ...existingLinkedCases };
  const metadataByRef = {};
  const linkedRows = openApplications.length;

  function uniqueSyntheticRef() {
    let synthetic = generateRandomRef();
    while (usedRefs.has(synthetic)) {
      synthetic = generateRandomRef();
    }
    usedRefs.add(synthetic);
    return synthetic;
  }

  for (let i = 0; i < linkedRows; i++) {
    const app = openApplications[i];
    if (!app || !app.ref) continue;

    if (typeof app.isStandaloneLinkedCase === 'undefined') {
      app.isStandaloneLinkedCase = !app.isPriorAuthority && (i + 1) % STANDALONE_CASE_INTERVAL === 0;
    }

    if (app.isStandaloneLinkedCase) {
      if (!app.lateLinkedCaseRows) {
        const leadReference = uniqueSyntheticRef();
        const existingAssociatedReference = uniqueSyntheticRef();
        app.linkedCaseGroupId = `LG-LATE-${i + 1}-${app.ref}`;
        app.linkedCaseRole = 'Associated';
        app.lateLinkedCaseRows = [
          {
            role: 'Lead',
            firstName: firstNames[(i + 1) % firstNames.length],
            middleName: '',
            lastName: lastNames[(i + 1) % lastNames.length],
            reference: leadReference,
            status: 'Granted',
            statusClass: 'govuk-tag--green'
          },
          {
            role: 'Associated',
            firstName: firstNames[(i + 3) % firstNames.length],
            middleName: '',
            lastName: lastNames[(i + 3) % lastNames.length],
            reference: existingAssociatedReference,
            status: 'Refused',
            statusClass: 'govuk-tag--red'
          },
          {
            role: 'Associated',
            firstName: app.firstName || 'Unknown',
            middleName: '',
            lastName: app.lastName || 'Unknown',
            reference: app.ref,
            status: 'Submitted',
            statusClass: 'govuk-tag--pink'
          }
        ];
      }

      app.linkedCaseCount = app.lateLinkedCaseRows.length - 1;
      app.linkedCaseRefs = app.lateLinkedCaseRows.map(row => row.reference);
      app.lateLinkedCaseRows.forEach(row => {
        linkedCasesByReference[row.reference] = app.lateLinkedCaseRows;
      });
      continue;
    }

    // Already has a stable group from a previous call — don't regenerate it.
    const existingGroup = linkedCasesByReference[app.ref];
    const existingLeadRow = existingGroup && existingGroup.find(row => row.reference === app.ref);
    if (existingLeadRow && existingLeadRow.role === 'Lead') {
      continue;
    }

    if (!metadataByRef[app.ref]) {
      const linkedCaseCount = LINKED_CASE_COUNT_PATTERN[i % LINKED_CASE_COUNT_PATTERN.length];
      const associatedRefs = [];

      for (let j = 0; j < linkedCaseCount; j++) {
        associatedRefs.push(uniqueSyntheticRef());
      }

      metadataByRef[app.ref] = {
        groupId: `LG-${i + 1}-${app.ref}`,
        linkedCaseCount: linkedCaseCount,
        associatedRefs: associatedRefs,
        leadFirstName: app.firstName || 'Unknown',
        leadLastName: app.lastName || 'Unknown'
      };
    }
  }

  openApplications.forEach(app => {
    const metadata = app && app.ref ? metadataByRef[app.ref] : null;

    if (!metadata) {
      // Keep decorations consistent for apps whose group already existed.
      const existingGroup = app && app.ref ? linkedCasesByReference[app.ref] : null;
      if (existingGroup) {
        const ownRow = existingGroup.find(row => row.reference === app.ref);
        if (ownRow) {
          app.linkedCaseGroupId = app.linkedCaseGroupId || `LG-EXISTING-${app.ref}`;
          app.linkedCaseCount = existingGroup.length - 1;
          app.linkedCaseRole = ownRow.role;
          app.linkedCaseRefs = existingGroup.map(row => row.reference);
        }
        return;
      }
      if (app && app.isStandaloneLinkedCase && app.lateLinkedCaseRows) {
        return;
      }
      delete app.linkedCaseGroupId;
      delete app.linkedCaseCount;
      delete app.linkedCaseRole;
      delete app.linkedCaseRefs;
      return;
    }

    app.linkedCaseGroupId = metadata.groupId;
    app.linkedCaseCount = metadata.linkedCaseCount;
    app.linkedCaseRole = 'Lead';
    app.linkedCaseRefs = [app.ref, ...metadata.associatedRefs];

    if (!linkedCasesByReference[app.ref]) {
      const groupedRows = [
        {
          role: 'Lead',
          firstName: metadata.leadFirstName,
          middleName: '',
          lastName: metadata.leadLastName,
          reference: app.ref,
          status: 'Submitted',
          statusClass: 'govuk-tag--pink'
        },
        ...metadata.associatedRefs.map((ref, index) => ({
          role: 'Associated',
          firstName: firstNames[(index + 2) % firstNames.length],
          middleName: '',
          lastName: lastNames[(index + 4) % lastNames.length],
          reference: ref,
          status: 'Submitted',
          statusClass: 'govuk-tag--pink'
        }))
      ];

      // Persist lookups for both lead and associated references so details pages
      // can show linked cases regardless of which ref is opened.
      linkedCasesByReference[app.ref] = groupedRows;
      metadata.associatedRefs.forEach(associatedRef => {
        linkedCasesByReference[associatedRef] = groupedRows;
      });
    }
  });

  return linkedCasesByReference;
}

function assignRealLinkedCaseGroups(applications, decisionStore = {}) {
  const uniqueInitialApplications = [...new Map(
    applications
      .filter(application => {
        if (!application || application.isPriorAuthority || application.isRedetermination) return false;
        const storedStatus = decisionStore[application.ref] && decisionStore[application.ref].status;
        return application.status !== 'Granted' && storedStatus !== 'Granted';
      })
      .map(application => [application.ref, application])
  ).values()];

  const shuffled = [...uniqueInitialApplications].sort(() => Math.random() - 0.5);
  const standaloneCount = Math.min(Math.max(2, Math.floor(shuffled.length / 4)), shuffled.length);
  const groupedApplications = shuffled.slice(standaloneCount);
  const linkedCasesByReference = {};

  while (groupedApplications.length >= 2) {
    let groupSize = Math.min(2 + Math.floor(Math.random() * 4), groupedApplications.length);
    if (groupedApplications.length - groupSize === 1) groupSize -= 1;
    if (groupSize < 2) break;

    const group = groupedApplications.splice(0, groupSize);
    const rows = group.map((application, index) => ({
      role: index === 0 ? 'Lead' : 'Associated',
      firstName: application.firstName || 'Unknown',
      middleName: '',
      lastName: application.lastName || 'Unknown',
      reference: application.ref,
      status: application.status || 'Submitted',
      statusClass: application.status === 'Refused' ? 'govuk-tag--red' : 'govuk-tag--pink'
    }));

    rows.forEach(row => {
      linkedCasesByReference[row.reference] = rows;
    });
  }

  return linkedCasesByReference;
}

function applicationVariantKey(app) {
  return `${app.ref}|${Boolean(app.isPriorAuthority)}`;
}

function isCounselPriorAuthority(application) {
  return Boolean(application && application.isPriorAuthority && application.priorAuthorityType && application.priorAuthorityType.includes('Counsel'));
}

function generateReplacementOpenApplication(preferredType, existingVariantKeys = new Set(), scenario = 'linked-initial') {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const refillData = generateMockApplications(6);
    let candidates = refillData.open;

    if (scenario === 'prior-authority') {
      candidates = candidates.filter(app => app.isPriorAuthority);
    } else {
      candidates = candidates.filter(app => !app.isPriorAuthority);
    }

    candidates = candidates.filter(app => !existingVariantKeys.has(applicationVariantKey(app)));

    if (candidates.length > 0) {
      const replacement = candidates[Math.floor(Math.random() * candidates.length)];
      if (scenario === 'late-linked-initial') {
        replacement.isStandaloneLinkedCase = true;
      }
      return {
        replacement: replacement,
        completed: refillData.completed
      };
    }
  }

  const fallback = generateMockApplications(6);
  const fallbackCandidates = scenario === 'prior-authority'
    ? fallback.open.filter(app => app.isPriorAuthority)
    : fallback.open.filter(app => !app.isPriorAuthority);
  const fallbackReplacement = fallbackCandidates.find(app => !existingVariantKeys.has(applicationVariantKey(app))) || fallbackCandidates[0] || fallback.open[0];
  if (scenario === 'late-linked-initial') {
    fallbackReplacement.isStandaloneLinkedCase = true;
  }
  return {
    replacement: fallbackReplacement,
    completed: fallback.completed
  };
}

router.get('/open-applications', function(req, res) {
  const consolidated = req.query.consolidated === 'true' || req.session.data['consolidated-v6'] === true;

  if (req.query.consolidated === 'true') {
    req.session.data['consolidated-v6'] = true;
  }

  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  // Keep a stable open-applications source for the session so references remain searchable.
  if (!req.session.data['open-applications-all']) {
    const mockData = generateMockApplications(8);
    req.session.data['open-applications-all'] = mockData.open;
    if (!consolidated) {
      req.session.data['linked-cases-by-reference-v6'] = assignLinkedCaseMetadata(
        req.session.data['open-applications-all'],
        req.session.data['linked-cases-by-reference-v6'] || {}
      );
    }
    req.session.data['open-applications'] = null; // reset derived copy
    // Seed completed-applications with the granted initial apps linked to PA requests
    if (!req.session.data['completed-applications']) {
      req.session.data['completed-applications'] = [];
    }
    // Remove any previously seeded mock completed entries and re-add fresh ones
    req.session.data['completed-applications'] = req.session.data['completed-applications']
      .filter(a => a._mockGenerated !== true);
    mockData.completed.forEach(a => {
      a._mockGenerated = true;
      req.session.data['completed-applications'].push(a);
    });
  }
  let applications = [...req.session.data['open-applications-all']]
    .filter(app => !app.isRedetermination);

  if (consolidated) {
    req.session.data['open-applications-all'] = req.session.data['open-applications-all'].filter(app => !isCounselPriorAuthority(app));
    req.session.data['assigned-applications'] = req.session.data['assigned-applications'].filter(app => !isCounselPriorAuthority(app));
    applications = applications.filter(app => !isCounselPriorAuthority(app));

    if (!req.session.data['consolidated-extra-initial-applications-v6']) {
      const existingRefs = new Set(applications.map(app => app.ref));
      req.session.data['consolidated-extra-initial-applications-v6'] = generateMockApplications(8).open
        .filter(app => !app.isPriorAuthority && !existingRefs.has(app.ref))
        .slice(0, 4);
    }
    applications = applications.concat(req.session.data['consolidated-extra-initial-applications-v6']);
    if (!req.session.data['consolidated-disbursement-application-v6']) {
      const existingReferences = new Set(applications.map(app => app.ref));
      let reference = generateRandomRef();
      while (existingReferences.has(reference)) reference = generateRandomRef();
      req.session.data['consolidated-disbursement-application-v6'] = {
        ref: reference,
        reference: reference,
        firstName: 'Angel',
        lastName: 'Philips',
        dob: '12 Jan 1980',
        submitted: '15 Feb 2026',
        firm: 'WATKINS SOLICITORS INC<br>OK514R',
        type: 'Prior authority',
        priorAuthorityType: 'Disbursement',
        delegatedFunctions: 'N/A',
        matterType: { title: 'Family', subtext: "Special Children's Act" },
        isPriorAuthority: true,
        disbursementType: 'Travel',
        disbursementAmount: '680',
        disbursementJustification: 'The client resides in a remote rural location with no access to public transport. The travel is essential to obtain detailed instructions and review sensitive case documents that cannot be shared electronically.'
      };
    }
    const disbursement = req.session.data['consolidated-disbursement-application-v6'];
    if (!req.session.data['completed-applications'].some(app => app.ref === disbursement.ref && !app.isPriorAuthority)) {
      req.session.data['completed-applications'].push({
        ...disbursement,
        submitted: generateDateAfter(disbursement.submitted, -12),
        type: 'Initial application',
        priorAuthorityType: null,
        isPriorAuthority: false,
        status: 'Granted',
        decisionType: 'Grant',
        caseworker: 'Caseworker name'
      });
    }
    if (!req.session.data['open-applications-all'].some(app => app.ref === disbursement.ref && app.isPriorAuthority)) {
      req.session.data['open-applications-all'].push(disbursement);
    }
    if (!applications.some(app => app.ref === disbursement.ref && app.isPriorAuthority)) {
      applications.push(disbursement);
    }

    const expertApplications = applications.filter(app => app.isPriorAuthority && app.priorAuthorityType && app.priorAuthorityType.includes('Expert'));
    const apportionedCount = Math.floor(expertApplications.length / 2);
    expertApplications.forEach((app, index) => {
      app.apportioned = index < apportionedCount;
      if (app.apportioned) {
        app.numberOfParties = String(2 + (index % 3));
        app.amountClaimedForPriorAuthority = (Number(app.expertRequestedAmount) / Number(app.numberOfParties)).toFixed(2);
      } else {
        delete app.numberOfParties;
        delete app.amountClaimedForPriorAuthority;
      }
    });
  }

  // Remove applications already in a caseworker's list from open applications.
  const assignedKeys = new Set((req.session.data['assigned-applications'] || []).map(app => `${app.ref}|${Boolean(app.isPriorAuthority)}`));
  applications = applications.filter(app => !assignedKeys.has(`${app.ref}|${Boolean(app.isPriorAuthority)}`));
  
  // Restore any stored decisions from decision-store
  if (req.session.data['decision-store']) {
    applications.forEach(app => {
      restoreDecisionData(app, req.session.data['decision-store']);
    });
  }

  if (consolidated && !req.session.data['real-linked-cases-v6-initialized']) {
    const realApplications = [
      ...req.session.data['open-applications-all'],
      ...(req.session.data['consolidated-extra-initial-applications-v6'] || []),
      ...(req.session.data['assigned-applications'] || [])
    ];
    req.session.data['linked-cases-by-reference-v6'] = assignRealLinkedCaseGroups(
      realApplications,
      req.session.data['decision-store'] || {}
    );
    req.session.data['real-linked-cases-v6-initialized'] = true;
  } else if (!consolidated) {
    req.session.data['linked-cases-by-reference-v6'] = assignLinkedCaseMetadata(
      applications,
      req.session.data['linked-cases-by-reference-v6'] || {}
    );
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

  if (consolidated) {
    filteredApps = filteredApps.filter(app => {
      return !app.isRedetermination && (!app.priorAuthorityType || !app.priorAuthorityType.includes('Counsel'));
    });
  }
  
  console.log('Final filtered apps:', filteredApps.length);
  
  // Keep full, unfiltered open applications in session for routes like search and add-by-reference.
  req.session.data['open-applications'] = applications;
  
  res.render('v6/open-applications.njk', { 
    pageTitle: 'Open applications',
    applications: filteredApps,
    query: req.query,
    consolidated,
    toast: req.session.data.toast
  });

  req.session.data.toast = null;
});

// Isolated reassignment prototype flow (uses auto-stored form data)
router.get('/your-list', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }

  const reassigned = req.session.data['reassigned'];
  const reassignedTo = req.session.data['reassign-to'];
  const reassignedCaseCount = Number(req.session.data['reassigned-case-count'] || 0);
  req.session.data['reassigned'] = null;
  req.session.data['reassign-to'] = null;
  req.session.data['reassigned-case-count'] = null;

  res.render('v6/your-list.html', {
    pageTitle: 'Your list',
    applications: req.session.data['assigned-applications'],
    reassigned: reassigned,
    reassignedTo: reassignedTo,
    reassignedCaseCount: reassignedCaseCount
  });
});

router.get('/reassign', function(req, res) {
  const ref = req.query.reference || req.session.data['reassign-reference'] || null;
  const queryIsPriorAuthority = req.query.isPriorAuthority;
  const requestedIsPriorAuthority = queryIsPriorAuthority === 'true';
  const hasVariantQuery = typeof queryIsPriorAuthority !== 'undefined';
  if (req.query.reference) {
    req.session.data['reassign-reference'] = req.query.reference;
  }
  if (hasVariantQuery) {
    req.session.data['reassign-is-prior-authority'] = requestedIsPriorAuthority;
  }

  let application = null;
  if (ref && req.session.data['assigned-applications']) {
    if (hasVariantQuery) {
      application = req.session.data['assigned-applications'].find(app => app.ref === ref && Boolean(app.isPriorAuthority) === requestedIsPriorAuthority) || null;
    }
    if (!application && typeof req.session.data['reassign-is-prior-authority'] !== 'undefined') {
      application = req.session.data['assigned-applications'].find(app => app.ref === ref && Boolean(app.isPriorAuthority) === Boolean(req.session.data['reassign-is-prior-authority'])) || null;
    }
    if (!application) {
      application = req.session.data['assigned-applications'].find(app => app.ref === ref) || null;
    }
  }

  const isPriorAuthority = application ? Boolean(application.isPriorAuthority) : requestedIsPriorAuthority;
  req.session.data['reassign-is-prior-authority'] = isPriorAuthority;

  res.render('v6/reassign.html', {
    pageTitle: 'Select who you want to reassign this case to',
    reference: ref,
    application: application,
    isPriorAuthority: isPriorAuthority
  });
});

router.post('/confirm-reassign', function(req, res) {
  if (req.body.reference) {
    req.session.data['reassign-reference'] = req.body.reference;
  }
  if (typeof req.body.isPriorAuthority !== 'undefined') {
    req.session.data['reassign-is-prior-authority'] = req.body.isPriorAuthority === 'true';
  }
  res.redirect('/v6/confirm-reassign');
});

router.get('/confirm-reassign', function(req, res) {
  const ref = req.session.data['reassign-reference'] || null;
  const isPriorAuthority = Boolean(req.session.data['reassign-is-prior-authority']);
  let application = null;

  if (ref && req.session.data['assigned-applications']) {
    application = req.session.data['assigned-applications'].find(app => app.ref === ref && Boolean(app.isPriorAuthority) === isPriorAuthority) || null;
    if (!application) {
      application = req.session.data['assigned-applications'].find(app => app.ref === ref) || null;
    }
  }

  res.render('v6/confirm-reassign.html', {
    pageTitle: 'Confirm you want to reassign this case?',
    reference: ref,
    application: application,
    isPriorAuthority: application ? Boolean(application.isPriorAuthority) : isPriorAuthority
  });
});

router.post('/your-list', function(req, res) {
  const ref = req.body.reference || req.session.data['reassign-reference'];
  const isPriorAuthority = (typeof req.body.isPriorAuthority !== 'undefined')
    ? req.body.isPriorAuthority === 'true'
    : Boolean(req.session.data['reassign-is-prior-authority']);

  const assignedApplications = req.session.data['assigned-applications'] || [];
  const beforeCount = assignedApplications.length;
  const reassignedApplications = [];

  if (ref && assignedApplications.length > 0) {
    const linkedGroupRows = req.session.data['linked-cases-by-reference-v6'] && req.session.data['linked-cases-by-reference-v6'][ref]
      ? req.session.data['linked-cases-by-reference-v6'][ref]
      : [];
    const linkedGroupRefs = [...new Set(linkedGroupRows.map(row => row.reference).filter(Boolean))];

    req.session.data['assigned-applications'] = assignedApplications.filter(app => {
      let shouldRemove = false;
      if (isPriorAuthority) {
        shouldRemove = app.ref === ref && Boolean(app.isPriorAuthority);
      } else if (!Boolean(app.isPriorAuthority)) {
        shouldRemove = linkedGroupRefs.length > 0 ? linkedGroupRefs.includes(app.ref) : app.ref === ref;
      }
      if (shouldRemove) reassignedApplications.push(app);
      return !shouldRemove;
    });
  }

  const afterCount = (req.session.data['assigned-applications'] || []).length;
  req.session.data['reassigned-case-count'] = Math.max(beforeCount - afterCount, 0);

  if (req.body['reassigned']) {
    req.session.data['reassigned'] = req.body['reassigned'];
  }
  if (req.body['reassign-to']) {
    req.session.data['reassign-to'] = req.body['reassign-to'];
  }

  if (req.session.data['consolidated-v6'] === true) {
    const newCaseworker = req.body['reassign-to'] || 'another caseworker';
    reassignedApplications.forEach(application => {
      appendConsolidatedHistory(req, application.ref, {
        action: `${application.isPriorAuthority ? 'Prior authority' : 'Initial application'} reassigned to ${newCaseworker}`,
        caseworker: application.caseworker || 'Caseworker name',
        type: application.isPriorAuthority ? 'pa_assignment' : 'assignment',
        justification: `Reassigned to ${newCaseworker}.`
      }, application);
    });
  }

  req.session.data['reassign-reference'] = null;
  req.session.data['reassign-is-prior-authority'] = null;

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
  const reassignedCaseCount = Number(req.session.data['reassigned-case-count'] || 0);
  req.session.data['reassigned'] = null;
  req.session.data['reassign-to'] = null;
  req.session.data['reassigned-case-count'] = null;
  
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
    reassignedTo: reassignedTo,
    reassignedCaseCount: reassignedCaseCount
  });
});

router.get('/add-application/:reference', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }

  const ref = req.params.reference;
  const isPriorAuthorityRequested = req.query.isPriorAuthority === 'true';
  const hasPriorAuthorityParam = typeof req.query.isPriorAuthority !== 'undefined';
  const assignedCaseworker = caseworkers[Math.floor(Math.random() * caseworkers.length)];
  if (!req.session.data['consolidated-caseworkers-v6']) {
    req.session.data['consolidated-caseworkers-v6'] = {};
  }
  req.session.data['consolidated-caseworkers-v6'][`${ref}|${isPriorAuthorityRequested ? 'prior-authority' : 'initial'}`] = assignedCaseworker;

  // Regenerate open applications to ensure we have current data
  if (!req.session.data['open-applications']) {
    req.session.data['open-applications'] = req.session.data['open-applications-all'] || [];
  }

  if (!req.session.data['open-applications-all']) {
    req.session.data['open-applications-all'] = [];
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

  // Prior authority requests are always added on their own — linked-case
  // grouping only ever applies to the initial application variant.
  const linkedGroupRows = (!isPriorAuthorityRequested && req.session.data['linked-cases-by-reference-v6'] && req.session.data['linked-cases-by-reference-v6'][ref])
    ? req.session.data['linked-cases-by-reference-v6'][ref]
    : [];
  const targetRefs = (isPriorAuthorityRequested || (openApp && openApp.isStandaloneLinkedCase))
    ? [ref]
    : linkedGroupRows.length > 0
    ? [...new Set(linkedGroupRows.map(item => item.reference).filter(Boolean))]
    : [ref];

  const linkedRowByRef = {};
  linkedGroupRows.forEach(row => {
    if (row && row.reference) linkedRowByRef[row.reference] = row;
  });

  const addedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const addedRefs = [];

  function isAlreadyAssigned(targetRef, isPriorAuthority) {
    return req.session.data['assigned-applications'].some(app => app.ref === targetRef && Boolean(app.isPriorAuthority) === Boolean(isPriorAuthority));
  }

  function buildAssignedApp(targetRef) {
    const isPrimaryRef = targetRef === ref;
    const linkedRow = linkedRowByRef[targetRef] || null;

    const firstName = isPrimaryRef
      ? (openApp ? openApp.firstName : 'Unknown')
      : (linkedRow ? linkedRow.firstName : 'Unknown');
    const lastName = isPrimaryRef
      ? (openApp ? openApp.lastName : 'Unknown')
      : (linkedRow ? linkedRow.lastName : 'Unknown');

    return {
      ...(isPrimaryRef && openApp ? openApp : {}),
      ref: targetRef,
      reference: targetRef,
      firstName: firstName,
      lastName: lastName,
      dob: openApp ? openApp.dob : 'N/A',
      submitted: openApp ? openApp.submitted : 'N/A',
      type: isPrimaryRef && openApp ? openApp.type : 'Initial application',
      delegatedFunctions: isPrimaryRef && openApp ? openApp.delegatedFunctions : 'Used',
      matterType: openApp ? openApp.matterType : { title: 'Family', subtext: "Special Children's Act" },
      isPriorAuthority: isPrimaryRef && openApp ? Boolean(openApp.isPriorAuthority) : false,
      priorAuthorityType: isPrimaryRef && openApp ? openApp.priorAuthorityType : null,
      linkedCaseGroupId: openApp && openApp.linkedCaseGroupId ? openApp.linkedCaseGroupId : null,
      caseworker: assignedCaseworker,
      addedDate: addedDate,
      lastUpdated: addedDate
    };
  }

  targetRefs.forEach(targetRef => {
    const isPrimaryRef = targetRef === ref;
    const isPriorAuthorityTarget = isPrimaryRef && openApp ? Boolean(openApp.isPriorAuthority) : false;

    if (isAlreadyAssigned(targetRef, isPriorAuthorityTarget)) {
      return;
    }

    const assignedApp = buildAssignedApp(targetRef);

    if (req.session.data['decision-store'] && req.session.data['decision-store'][targetRef]) {
      const stored = req.session.data['decision-store'][targetRef];
      assignedApp.status = stored.status;
      assignedApp.decisionDate = stored.decisionDate;
      assignedApp.decisionType = stored.decisionType;
      if (stored.certDate) assignedApp.certDate = stored.certDate;
      if (stored.refusalReason) assignedApp.refusalReason = stored.refusalReason;
    }

    req.session.data['assigned-applications'].push(assignedApp);
    addedRefs.push(targetRef);
  });

  req.session.data['open-applications-all'] = req.session.data['open-applications-all'].filter(app => {
    if (app.ref !== ref) return true;
    if (hasPriorAuthorityParam) return app.isPriorAuthority !== isPriorAuthorityRequested;
    return false;
  });

  if (req.session.data['consolidated-extra-initial-applications-v6']) {
    req.session.data['consolidated-extra-initial-applications-v6'] = req.session.data['consolidated-extra-initial-applications-v6'].filter(app => {
      if (app.ref !== ref) return true;
      if (hasPriorAuthorityParam) return app.isPriorAuthority !== isPriorAuthorityRequested;
      return false;
    });
  }

  const remainingOpenApplications = req.session.data['open-applications-all'];
  const initialCount = remainingOpenApplications.filter(app => !app.isPriorAuthority).length;
  const priorCount = remainingOpenApplications.filter(app => app.isPriorAuthority).length;
  const preferredReplacementType = initialCount > priorCount
    ? 'prior'
    : priorCount > initialCount
      ? 'initial'
      : (Math.random() > 0.5 ? 'initial' : 'prior');

  const existingVariantKeys = new Set();
  (req.session.data['open-applications-all'] || []).forEach(app => {
    existingVariantKeys.add(applicationVariantKey(app));
  });
  (req.session.data['assigned-applications'] || []).forEach(app => {
    existingVariantKeys.add(applicationVariantKey(app));
  });

  const replacementScenarioIndex = req.session.data['demo-replacement-scenario-index-v6'] || 0;
  const replacementScenario = DEMO_REPLACEMENT_SCENARIOS[
    replacementScenarioIndex % DEMO_REPLACEMENT_SCENARIOS.length
  ];
  req.session.data['demo-replacement-scenario-index-v6'] = replacementScenarioIndex + 1;
  const refillData = generateReplacementOpenApplication(preferredReplacementType, existingVariantKeys, replacementScenario);
  req.session.data['open-applications-all'].push(refillData.replacement);
  if (req.session.data['consolidated-v6'] !== true) {
    req.session.data['linked-cases-by-reference-v6'] = assignLinkedCaseMetadata(
      req.session.data['open-applications-all'],
      req.session.data['linked-cases-by-reference-v6'] || {}
    );
  }

  if (!req.session.data['completed-applications']) {
    req.session.data['completed-applications'] = [];
  }

  refillData.completed.forEach(app => {
    app._mockGenerated = true;
    req.session.data['completed-applications'].push(app);
  });

  // Log assignment to caseworker history when they add it to their list
  if (req.session.data['consolidated-v6'] === true) {
    addedRefs.forEach(addedRef => {
      const assignedApplication = req.session.data['assigned-applications'].find(app => app.ref === addedRef && Boolean(app.isPriorAuthority) === Boolean(addedRef === ref && isPriorAuthorityRequested));
      appendConsolidatedHistory(req, addedRef, {
        action: assignedApplication && assignedApplication.isPriorAuthority
          ? `Prior authority assigned to ${assignedCaseworker}`
          : `Initial application assigned to ${assignedCaseworker}`,
        caseworker: assignedCaseworker,
        type: assignedApplication && assignedApplication.isPriorAuthority ? 'pa_assignment' : 'assignment'
      }, assignedApplication);
    });
  } else {
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  if (!req.session.data['app-history'][ref]) {
    req.session.data['app-history'][ref] = [];
  }

  const openAppForHistory = req.session.data['open-applications'] ? req.session.data['open-applications'].find(app => app.ref === ref) : null;
  let datetime;

  if (openAppForHistory) {
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const timeStr = String(randomHour).padStart(2, '0') + ':' + String(randomMin).padStart(2, '0');
    datetime = openAppForHistory.submitted + ' ' + timeStr;
  } else {
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

  req.session.data['app-history'][ref].push({
    timestamp: datetime,
    action: 'Application assigned to ' + assignedCaseworker,
    caseworker: assignedCaseworker,
    details: null
  });
  }

  req.session.data.toast = {
    show: true,
    message: addedRefs.length > 1
      ? `You have added ${ref} and ${addedRefs.length - 1} linked ${addedRefs.length - 1 === 1 ? 'case' : 'cases'} to your list`
      : `You have added ${ref} to your list`,
    type: 'success'
  };

  // Check if AJAX request (from fetch)
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.xhr) {
    const assignedApplication = req.session.data['assigned-applications'].find(app =>
      app.ref === ref && Boolean(app.isPriorAuthority) === isPriorAuthorityRequested
    );
    res.status(200).json({
      success: true,
      ref: ref,
      addedCount: addedRefs.length,
      linkedAddedCount: Math.max(0, addedRefs.length - 1),
      assignedCaseworker: assignedApplication ? assignedApplication.caseworker : null
    });
  } else {
    res.redirect('/v6/open-applications');
  }
});

router.get('/remove-application/:reference', function(req, res) {
  const ref = req.params.reference;
  const removedApplications = (req.session.data['assigned-applications'] || []).filter(app => app.ref === ref);
  if (req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = req.session.data['assigned-applications'].filter(app => app.ref !== ref);
  }
  removedApplications.forEach(application => {
    appendConsolidatedHistory(req, ref, {
      action: `${application.isPriorAuthority ? 'Prior authority' : 'Initial application'} removed from your list`,
      caseworker: application.caseworker || 'Caseworker name',
      type: application.isPriorAuthority ? 'pa_assignment' : 'assignment'
    }, application);
  });
  
  res.redirect('/v6/yourlist');
});

router.get('/select-lead-case', function(req, res) {
  const reference = req.query.reference;
  const linkedReference = req.query.linkedReference;
  const leadReference = req.query.leadReference || reference;
  const existingGroup = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const groupReferences = [...new Set([
    ...existingGroup.map(row => row.reference),
    reference,
    linkedReference
  ].filter(Boolean))];
  const applications = [
    ...(req.session.data['open-applications'] || []),
    ...(req.session.data['open-applications-all'] || []),
    ...(req.session.data['assigned-applications'] || []),
    ...(req.session.data['completed-applications'] || [])
  ];
  const uniqueApplications = [...new Map(
    applications
      .filter(application => application && groupReferences.includes(application.ref))
      .map(application => [applicationVariantKey(application), application])
  ).values()];

  res.render('v6/select-lead-case.njk', {
    pageTitle: 'Select the lead case',
    reference: reference,
    linkedReference: linkedReference,
    leadReference: leadReference,
    applications: uniqueApplications
  });
});

router.post('/select-lead-case', function(req, res) {
  const reference = req.body.reference;
  const linkedReference = req.body.linkedReference;
  const leadReference = req.body.leadReference;
  const existingGroup = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const groupReferences = [...new Set([
    ...existingGroup.map(row => row.reference),
    reference,
    linkedReference
  ].filter(Boolean))];
  const applications = [
    ...(req.session.data['open-applications'] || []),
    ...(req.session.data['open-applications-all'] || []),
    ...(req.session.data['assigned-applications'] || []),
    ...(req.session.data['completed-applications'] || [])
  ];
  const groupApplications = [...new Map(
    applications
      .filter(application => application && groupReferences.includes(application.ref))
      .map(application => [applicationVariantKey(application), application])
  ).values()];
  const leadApplication = groupApplications.find(application => application.ref === leadReference);

  if (!leadApplication || groupApplications.length < 2) {
    res.redirect('/v6/select-lead-case?reference=' + encodeURIComponent(reference) + '&linkedReference=' + encodeURIComponent(linkedReference));
    return;
  }

  res.redirect('/v6/confirm-link-cases?reference=' + encodeURIComponent(reference) + '&linkedReference=' + encodeURIComponent(linkedReference) + '&leadReference=' + encodeURIComponent(leadReference));
});

router.get('/confirm-link-cases', function(req, res) {
  const reference = req.query.reference;
  const linkedReference = req.query.linkedReference;
  const leadReference = req.query.leadReference;
  const existingGroup = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const groupReferences = [...new Set([
    ...existingGroup.map(row => row.reference),
    reference,
    linkedReference
  ].filter(Boolean))];
  const applications = [
    ...(req.session.data['open-applications'] || []),
    ...(req.session.data['open-applications-all'] || []),
    ...(req.session.data['assigned-applications'] || []),
    ...(req.session.data['completed-applications'] || [])
  ];
  const groupApplications = [...new Map(
    applications
      .filter(application => application && groupReferences.includes(application.ref))
      .map(application => [applicationVariantKey(application), application])
  ).values()];
  const leadApplication = groupApplications.find(application => application.ref === leadReference);
  const associatedApplications = groupApplications.filter(application => application.ref !== leadReference);

  if (!leadApplication || !associatedApplications.length) {
    res.redirect('/v6/select-lead-case?reference=' + encodeURIComponent(reference) + '&linkedReference=' + encodeURIComponent(linkedReference));
    return;
  }

  res.render('v6/confirm-link-cases.njk', {
    pageTitle: 'Confirm linked cases',
    reference: reference,
    linkedReference: linkedReference,
    leadReference: leadReference,
    leadApplication: leadApplication,
    associatedApplications: associatedApplications
  });
});

router.post('/confirm-link-cases', function(req, res) {
  const reference = req.body.reference;
  const linkedReference = req.body.linkedReference;
  const leadReference = req.body.leadReference;
  const existingGroup = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const groupReferences = [...new Set([
    ...existingGroup.map(row => row.reference),
    reference,
    linkedReference
  ].filter(Boolean))];
  const applications = [
    ...(req.session.data['open-applications'] || []),
    ...(req.session.data['open-applications-all'] || []),
    ...(req.session.data['assigned-applications'] || []),
    ...(req.session.data['completed-applications'] || [])
  ];
  const groupApplications = [...new Map(
    applications
      .filter(application => application && groupReferences.includes(application.ref))
      .map(application => [applicationVariantKey(application), application])
  ).values()];
  const leadApplication = groupApplications.find(application => application.ref === leadReference);
  const associatedApplications = groupApplications.filter(application => application.ref !== leadReference);

  if (!leadApplication || !associatedApplications.length) {
    res.redirect('/v6/select-lead-case?reference=' + encodeURIComponent(reference) + '&linkedReference=' + encodeURIComponent(linkedReference));
    return;
  }

  const linkedCases = [leadApplication, ...associatedApplications].map((application, index) => ({
    role: index === 0 ? 'Lead' : 'Associated',
    firstName: application.firstName || 'Unknown',
    middleName: '',
    lastName: application.lastName || 'Unknown',
    reference: application.ref,
    status: 'Submitted',
    statusClass: 'govuk-tag--pink'
  }));
  const linkedCasesByReference = req.session.data['linked-cases-by-reference-v6'] || {};
  linkedCases.forEach(linkedCase => {
    linkedCasesByReference[linkedCase.reference] = linkedCases;
  });
  req.session.data['linked-cases-by-reference-v6'] = linkedCasesByReference;

  linkedCases.forEach(linkedCase => {
    appendConsolidatedHistory(req, linkedCase.reference, {
      action: linkedCase.role === 'Lead' ? 'Application selected as lead case' : 'Application linked as an associated case',
      type: 'linked_case',
      justification: `Linked case group: ${linkedCases.map(row => row.reference).join(', ')}. Lead application: ${leadReference}.`
    }, groupApplications.find(application => application.ref === linkedCase.reference));
  });

  req.session.data.toast = {
    show: true,
    message: `You have linked this application ${linkedReference} to ${leadReference}`,
    detail: 'Cost limits have been updated.'
  };

  res.redirect('/v6/application/' + encodeURIComponent(leadReference));
});

function findInitialApplication(req, reference) {
  const applications = [
    ...(req.session.data['assigned-applications'] || []),
    ...(req.session.data['open-applications'] || []),
    ...(req.session.data['open-applications-all'] || []),
    ...(req.session.data['consolidated-extra-initial-applications-v6'] || []),
    ...(req.session.data['completed-applications'] || [])
  ];
  return applications.find(application => application.ref === reference && !application.isPriorAuthority) || null;
}

function replaceLinkedGroup(req, previousRows, nextRows) {
  const linkedCasesByReference = req.session.data['linked-cases-by-reference-v6'] || {};
  previousRows.forEach(row => delete linkedCasesByReference[row.reference]);
  if (nextRows.length >= 2) {
    nextRows.forEach(row => {
      linkedCasesByReference[row.reference] = nextRows;
    });
  }
  req.session.data['linked-cases-by-reference-v6'] = linkedCasesByReference;
}

function reorderLinkedGroup(rows, leadReference) {
  const selectedLead = rows.find(row => row.reference === leadReference);
  if (!selectedLead) return null;
  return [selectedLead, ...rows.filter(row => row.reference !== leadReference)].map((row, index) => ({
    ...row,
    role: index === 0 ? 'Lead' : 'Associated'
  }));
}

router.get('/change-linked-lead/:reference', function(req, res) {
  const reference = req.params.reference;
  const mode = req.query.mode === 'unlink' ? 'unlink' : 'change';
  const linkedCases = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const leadCase = linkedCases.find(row => row.role === 'Lead');
  const associatedCases = linkedCases
    .filter(row => row.role === 'Associated')
    .map(row => findInitialApplication(req, row.reference))
    .filter(Boolean);

  if (!leadCase || !associatedCases.length) {
    res.redirect('/v6/manage-linked-cases/' + encodeURIComponent(reference));
    return;
  }

  res.render('v6/select-new-lead.njk', {
    pageTitle: 'Select a new lead case',
    reference: reference,
    currentLeadReference: leadCase.reference,
    applications: associatedCases,
    mode: mode
  });
});

router.post('/change-linked-lead/:reference', function(req, res) {
  const reference = req.params.reference;
  const mode = req.body.mode === 'unlink' ? 'unlink' : 'change';
  const selectedLeadReference = req.body.leadReference;
  const linkedCases = (req.session.data['linked-cases-by-reference-v6'] || {})[reference] || [];
  const currentLead = linkedCases.find(row => row.role === 'Lead');
  let nextRows = linkedCases;

  if (mode === 'unlink' && currentLead) {
    nextRows = linkedCases.filter(row => row.reference !== currentLead.reference);
  }
  nextRows = reorderLinkedGroup(nextRows, selectedLeadReference);

  if (!nextRows) {
    res.redirect('/v6/change-linked-lead/' + encodeURIComponent(reference) + '?mode=' + mode);
    return;
  }

  replaceLinkedGroup(req, linkedCases, nextRows);
  nextRows.forEach(row => {
    appendConsolidatedHistory(req, row.reference, {
      action: row.reference === selectedLeadReference ? 'Application selected as new lead case' : 'Linked case lead changed',
      type: 'linked_case',
      justification: `The lead application was changed from ${currentLead.reference} to ${selectedLeadReference}.`
    }, findInitialApplication(req, row.reference));
  });
  if (mode === 'unlink' && currentLead) {
    appendConsolidatedHistory(req, currentLead.reference, {
      action: 'Application unlinked',
      type: 'linked_case',
      justification: 'The application is now standalone and has its own cost limit.'
    }, findInitialApplication(req, currentLead.reference));
  }
  req.session.data.toast = {
    show: true,
    message: mode === 'unlink'
      ? `You have unlinked ${currentLead.reference} and selected ${selectedLeadReference} as the new lead case`
      : `You have selected a new lead case ${selectedLeadReference}`,
    detail: 'Cost limits have been updated.'
  };
  res.redirect('/v6/application/' + encodeURIComponent(selectedLeadReference));
});

router.get('/unlink-linked-case/:reference', function(req, res) {
  const caseReference = req.params.reference;
  const linkedCases = (req.session.data['linked-cases-by-reference-v6'] || {})[caseReference] || [];
  const currentRow = linkedCases.find(row => row.reference === caseReference);
  const leadCase = linkedCases.find(row => row.role === 'Lead');

  if (!currentRow || !leadCase) {
    res.redirect('/v6/application/' + encodeURIComponent(caseReference));
    return;
  }

  if (currentRow.role === 'Lead') {
    res.redirect('/v6/change-linked-lead/' + encodeURIComponent(caseReference) + '?mode=unlink');
    return;
  }

  res.redirect('/v6/confirm-unlink-case/' + encodeURIComponent(caseReference));
});

router.get('/confirm-unlink-case/:reference', function(req, res) {
  const caseReference = req.params.reference;
  const linkedCases = (req.session.data['linked-cases-by-reference-v6'] || {})[caseReference] || [];
  const currentRow = linkedCases.find(row => row.reference === caseReference && row.role === 'Associated');
  const application = findInitialApplication(req, caseReference);

  if (!currentRow || !application) {
    res.redirect('/v6/manage-linked-cases/' + encodeURIComponent(caseReference));
    return;
  }

  res.render('v6/confirm-unlink-case.njk', {
    pageTitle: 'Confirm unlink case',
    application: application,
    reference: caseReference
  });
});

router.post('/confirm-unlink-case/:reference', function(req, res) {
  const caseReference = req.params.reference;
  const linkedCases = (req.session.data['linked-cases-by-reference-v6'] || {})[caseReference] || [];
  const currentRow = linkedCases.find(row => row.reference === caseReference && row.role === 'Associated');
  const leadCase = linkedCases.find(row => row.role === 'Lead');

  if (!currentRow || !leadCase) {
    res.redirect('/v6/application/' + encodeURIComponent(caseReference));
    return;
  }

  if (linkedCases.length === 2) {
    replaceLinkedGroup(req, linkedCases, []);
    linkedCases.forEach(row => {
      appendConsolidatedHistory(req, row.reference, {
        action: 'Application unlinked',
        type: 'linked_case',
        justification: 'The application is now standalone and has its own cost limit.'
      }, findInitialApplication(req, row.reference));
    });
    req.session.data.toast = {
      show: true,
      message: `You have unlinked ${caseReference}`,
      detail: 'Both applications are now standalone and have been assigned their own cost limits.'
    };
    res.redirect('/v6/application/' + encodeURIComponent(caseReference));
    return;
  }

  const nextRows = linkedCases.filter(row => row.reference !== caseReference);
  replaceLinkedGroup(req, linkedCases, nextRows);
  appendConsolidatedHistory(req, caseReference, {
    action: 'Application unlinked',
    type: 'linked_case',
    justification: 'The application is now standalone and has its own cost limit.'
  }, findInitialApplication(req, caseReference));
  nextRows.forEach(row => {
    appendConsolidatedHistory(req, row.reference, {
      action: `Associated application ${caseReference} unlinked`,
      type: 'linked_case',
      justification: `Application ${caseReference} was removed from this linked case group.`
    }, findInitialApplication(req, row.reference));
  });
  req.session.data.toast = {
    show: true,
    message: `You have unlinked ${caseReference}`,
    detail: 'The application is now standalone and has been assigned its own cost limit.'
  };
  res.redirect('/v6/application/' + encodeURIComponent(leadCase.reference));
});

router.get('/manage-linked-cases/:reference', function(req, res) {
  const reference = req.params.reference;
  const linkedCasesByReference = req.session.data['linked-cases-by-reference-v6'] || {};
  let linkedCases = linkedCasesByReference[reference] || [];

  const linkReference = req.query.linkReference;
  if (!linkedCases.length && linkReference && linkReference !== reference) {
    const applications = [
      ...(req.session.data['open-applications'] || []),
      ...(req.session.data['open-applications-all'] || []),
      ...(req.session.data['assigned-applications'] || []),
      ...(req.session.data['completed-applications'] || [])
    ];
    const currentApplication = applications.find(application => application.ref === reference);
    const linkedApplication = applications.find(application => application.ref === linkReference);

    if (currentApplication && linkedApplication) {
      linkedCases = [
        {
          role: 'Lead',
          firstName: currentApplication.firstName || 'Unknown',
          middleName: '',
          lastName: currentApplication.lastName || 'Unknown',
          reference: reference,
          status: 'Submitted',
          statusClass: 'govuk-tag--pink'
        },
        {
          role: 'Associated',
          firstName: linkedApplication.firstName || 'Unknown',
          middleName: '',
          lastName: linkedApplication.lastName || 'Unknown',
          reference: linkReference,
          status: 'Submitted',
          statusClass: 'govuk-tag--pink'
        }
      ];
      linkedCases.forEach(linkedCase => {
        linkedCasesByReference[linkedCase.reference] = linkedCases;
      });
      req.session.data['linked-cases-by-reference-v6'] = linkedCasesByReference;
      linkedCases.forEach(linkedCase => {
        appendConsolidatedHistory(req, linkedCase.reference, {
          action: linkedCase.role === 'Lead' ? 'Application selected as lead case' : 'Application linked as an associated case',
          type: 'linked_case',
          justification: `Linked case group: ${linkedCases.map(row => row.reference).join(', ')}. Lead application: ${reference}.`
        }, findInitialApplication(req, linkedCase.reference));
      });
    }
  }

  const leadCase = linkedCases.find(row => row.role === 'Lead') || null;
  const leadApplication = leadCase && findInitialApplication(req, leadCase.reference);
  const associatedApplications = linkedCases
    .filter(row => row.role === 'Associated')
    .map(row => findInitialApplication(req, row.reference))
    .filter(Boolean);

  res.render('v6/manage-linked-cases.njk', {
    pageTitle: 'Manage linked cases',
    reference: reference,
    hasLinkedCases: linkedCases.length > 0,
    leadApplication: leadApplication,
    associatedApplications: associatedApplications
  });
});

router.post('/manage-linked-cases/:reference', function(req, res) {
  const reference = req.params.reference;
  const newLinkedReference = req.body['new-linked-reference'];
  const linkedCasesByReference = req.session.data['linked-cases-by-reference-v6'] || {};
  const linkedCases = linkedCasesByReference[reference] || [];
  const newLinkedApplication = (req.session.data['open-applications-all'] || [])
    .find(application => application.ref === newLinkedReference && application.isStandaloneLinkedCase && !application.isPriorAuthority);

  if (!newLinkedApplication || linkedCases.length === 0) {
    res.redirect('/v6/manage-linked-cases/' + encodeURIComponent(reference));
    return;
  }

  const existingReferences = new Set(linkedCases.map(linkedCase => linkedCase.reference));
  if (!existingReferences.has(newLinkedReference)) {
    linkedCases.push({
      role: 'New link',
      firstName: newLinkedApplication.firstName,
      middleName: '',
      lastName: newLinkedApplication.lastName,
      reference: newLinkedReference,
      status: 'In progress',
      statusClass: 'govuk-tag--light-blue'
    });
  }

  linkedCases.forEach(linkedCase => {
    linkedCasesByReference[linkedCase.reference] = linkedCases;
  });
  req.session.data['linked-cases-by-reference-v6'] = linkedCasesByReference;

  const leadCase = linkedCases.find(linkedCase => linkedCase.role === 'Lead');
  const leadApplication = (req.session.data['assigned-applications'] || [])
    .find(application => application.ref === (leadCase && leadCase.reference));
  const assignedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  if (!req.session.data['assigned-applications'].some(application => application.ref === newLinkedReference)) {
    req.session.data['assigned-applications'].push({
      ...newLinkedApplication,
      linkedCaseGroupId: leadApplication && leadApplication.linkedCaseGroupId,
      linkedCaseRole: 'New link',
      linkedCaseRefs: linkedCases.map(linkedCase => linkedCase.reference),
      caseworker: leadApplication && leadApplication.caseworker ? leadApplication.caseworker : 'Caseworker name',
      addedDate: assignedDate,
      lastUpdated: assignedDate
    });
  }

  req.session.data['open-applications-all'] = req.session.data['open-applications-all']
    .filter(application => application.ref !== newLinkedReference);
  req.session.data['open-applications'] = (req.session.data['open-applications'] || [])
    .filter(application => application.ref !== newLinkedReference);

  linkedCases.forEach(linkedCase => {
    appendConsolidatedHistory(req, linkedCase.reference, {
      action: linkedCase.reference === newLinkedReference
        ? 'Application linked as an associated case'
        : `Application ${newLinkedReference} linked to case group`,
      type: 'linked_case',
      justification: `Linked case group: ${linkedCases.map(row => row.reference).join(', ')}.`
    }, findInitialApplication(req, linkedCase.reference));
  });

  res.redirect('/v6/application/' + encodeURIComponent(reference));
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
  const referenceApplications = applicationsForReference(req, ref);
  const currentReferenceApplication = referenceApplications.find(application => application.isPriorAuthority || application.isRedetermination)
    || referenceApplications[0]
    || null;
  ensureConsolidatedHistory(req, ref, currentReferenceApplication);
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
  const caseworkerName = 'Joann Barton';
  
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
  if (req.session.data['consolidated-v6'] === true) {
    appendConsolidatedHistory(req, ref, {
      action: 'Note added',
      caseworker: caseworkerName,
      type: 'note',
      details: note
    });
  } else {
    req.session.data['app-history'][ref].push({
      timestamp: timestamp,
      action: 'Note Added',
      caseworker: caseworkerName,
      type: 'note',
      details: note
    });
  }
  
  // Set toast message for success notification
  req.session.data.toast = {
    show: true,
    message: 'Your notes have been successfully added',
    type: 'success'
  };
  
  res.redirect('/v6/application/' + ref + '#application-history');
});

router.get('/search', function(req, res) {
  const searchFields = ['reference', 'firstName', 'lastName', 'dob-day', 'dob-month', 'dob-year'];
  const showResults = searchFields.some(field => req.query[field]);
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
      if (req.query.linkToReference) {
        const storedStatus = req.session.data['decision-store'] && req.session.data['decision-store'][app.ref] && req.session.data['decision-store'][app.ref].status;
        if (app.isPriorAuthority || app.status === 'Granted' || storedStatus === 'Granted') match = false;
        const linkedGroup = req.session.data['linked-cases-by-reference-v6'] && req.session.data['linked-cases-by-reference-v6'][app.ref];
        const currentGroup = req.session.data['linked-cases-by-reference-v6'] && req.session.data['linked-cases-by-reference-v6'][req.query.linkToReference];
        if (linkedGroup && linkedGroup !== currentGroup) match = false;
      }
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
      
      const firm = app.firm || app.providerFirm
        ? (app.firm || app.providerFirm)
        : 'WATKINS SOLICITORS INC<br>OK514R';
      const [firmName, firmNumber] = firm.split('<br>');

      return {
        ref: app.ref,
        firstName: app.firstName,
        lastName: app.lastName,
        dob: app.dob,
        submitted: app.submitted,
        type: app.type || (app.isPriorAuthority ? 'Prior authority' : 'Initial application'),
        delegatedFunctions: app.delegatedFunctions || (app.isPriorAuthority ? 'N/A' : 'Used'),
        matterTypeTitle: app.matterType && app.matterType.title,
        matterTypeSubtext: app.matterType && app.matterType.subtext,
        firmName: firmName,
        firmNumber: firmNumber || 'OK514R',
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

router.get('/application-details', function(req, res) {
  const reference = req.query.reference || req.query.ref || req.session.data['decision-reference'] || 'L-12Z-13P';
  res.redirect('/v6/application/' + encodeURIComponent(reference));
});

router.get('/application/:reference', function(req, res) {
  const reference = req.params.reference;
  const requestedPriorAuthority = req.query.isPriorAuthority === 'true';
  const defaultLinkedCasesByReference = {
    'L-12Z-13P': [
      { role: 'Lead', firstName: 'Haylie', middleName: '', lastName: 'Septimus', reference: 'L-12Z-13P', status: 'In progress', statusClass: 'govuk-tag--light-blue' },
      { role: 'Associated', firstName: 'Jocelyn Bergson', middleName: '', lastName: 'Puran', reference: 'L-12Z-14X', status: 'In progress', statusClass: 'govuk-tag--light-blue' },
      { role: 'Associated', firstName: 'Davis David Allen George', middleName: '', lastName: 'Devine Schleifer', reference: 'L-12Z-15Y', status: 'In progress', statusClass: 'govuk-tag--light-blue' },
      { role: 'Associated', firstName: 'Mira Saris', middleName: '', lastName: 'Howell', reference: 'L-12Z-16Z', status: 'In progress', statusClass: 'govuk-tag--light-blue' }
    ]
  };

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
    req.session.data['open-applications'] || [],
    req.session.data['open-applications-all'] || [],
    req.session.data['consolidated-extra-initial-applications-v6'] || []
  ];

  const linkedCasesByReference = {
    ...defaultLinkedCasesByReference,
    ...(req.session.data['linked-cases-by-reference-v6'] || {})
  };
  const linkedCases = linkedCasesByReference[reference] || [];
  const hasLinkedCases = linkedCases.length > 0;
  const currentLinkedCase = linkedCases.find(linkedCase => linkedCase.reference === reference) || null;
  const isAssociatedLinkedCase = Boolean(currentLinkedCase && currentLinkedCase.role === 'Associated');
  const leadLinkedCase = linkedCases.find(linkedCase => linkedCase.role === 'Lead') || null;
  const linkedLeadReference = leadLinkedCase ? leadLinkedCase.reference : null;
  const linkedStatusAssignedApplications = req.session.data['assigned-applications'] || [];

  function getLinkedCaseStatus(targetRef, fallbackStatus) {
    const storedDecision = req.session.data['decision-store'] && req.session.data['decision-store'][targetRef];
    if (storedDecision && storedDecision.status === 'Granted') {
      return { text: 'Granted', className: 'govuk-tag--green' };
    }
    if (storedDecision && storedDecision.status === 'Refused') {
      return { text: 'Refused', className: 'govuk-tag--red' };
    }
    const assignedMatch = linkedStatusAssignedApplications.find(app => app.ref === targetRef && !app.isPriorAuthority);
    if (assignedMatch && assignedMatch.status === 'Granted') {
      return { text: 'Granted', className: 'govuk-tag--green' };
    }
    if (assignedMatch && assignedMatch.status === 'Refused') {
      return { text: 'Refused', className: 'govuk-tag--red' };
    }
    if (assignedMatch) {
      return { text: 'In progress', className: 'govuk-tag--light-blue' };
    }
    // A stored fallback status is only trustworthy for refs with no real
    // application record (purely decorative demo rows) — otherwise a stale
    // value could disagree with the actual application's live status.
    const hasRealApplication = applicationCollections.some(collection => collection.some(app => app.ref === targetRef));
    if (!hasRealApplication) {
      if (fallbackStatus === 'Granted') {
        return { text: 'Granted', className: 'govuk-tag--green' };
      }
      if (fallbackStatus === 'Refused') {
        return { text: 'Refused', className: 'govuk-tag--red' };
      }
    }
    return { text: 'Submitted', className: 'govuk-tag--pink' };
  }

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

  ensureConsolidatedHistory(req, reference, applicationData);
  
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

  // The row for the application currently being viewed must always match the
  // status shown at the top of the page — never re-derive it independently.
  const currentPageStatus = statusApplication.status === 'Granted'
    ? { text: 'Granted', className: 'govuk-tag--green' }
    : statusApplication.status === 'Refused'
      ? { text: 'Refused', className: 'govuk-tag--red' }
      : isStatusApplicationAssigned
        ? { text: 'In progress', className: 'govuk-tag--light-blue' }
        : { text: 'Submitted', className: 'govuk-tag--pink' };

  const linkedCasesForView = linkedCases.map(linkedCase => {
    const linkedStatus = linkedCase.reference === reference
      ? currentPageStatus
      : getLinkedCaseStatus(linkedCase.reference, linkedCase.status);
    return {
      ...linkedCase,
      status: linkedStatus.text,
      statusClass: linkedStatus.className
    };
  });
  
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

  const renderedInitialApplication = isViewingPreviousVersion
    ? reconstructApplicationAtVersion(initialApplicationData, historyArray, viewVersion)
    : initialApplicationData;
  const renderedPriorAuthorityApplication = isViewingPreviousVersion
    ? reconstructApplicationAtVersion(priorAuthorityApplicationData, historyArray, viewVersion)
    : priorAuthorityApplicationData;
  const renderedStatusApplication = requestedPriorAuthority && renderedInitialApplication
    ? renderedInitialApplication
    : versionedApplication;
  const selectedAssignedApplication = assignedApplications.find(app => app.ref === reference && Boolean(app.isPriorAuthority) === requestedPriorAuthority) || null;
  const selectedCompletedApplication = (req.session.data['completed-applications'] || [])
    .find(app => app.ref === reference && Boolean(app.isPriorAuthority) === requestedPriorAuthority) || null;
  const relevantCaseworkerEvent = [...historyArray].reverse().find(event => {
    if (!event.caseworker || event.caseworker === 'N/A' || event.caseworker === 'Caseworker name') return false;
    if (requestedPriorAuthority) return event.type === 'pa_assignment' || event.type === 'pa_decision';
    return (event.type === 'assignment' || event.type === 'decision') && !/prior authority/i.test(event.action || '');
  });
  const assignedCaseworker = (selectedAssignedApplication && selectedAssignedApplication.caseworker)
    || (selectedCompletedApplication && selectedCompletedApplication.caseworker)
    || (relevantCaseworkerEvent && relevantCaseworkerEvent.caseworker)
    || 'Unassigned';
  
  res.render('v6/application-details.njk', {
    pageTitle: reference,
    reference: reference,
    application: isViewingPreviousVersion ? versionedApplication : application,
    initialApplication: renderedInitialApplication,
    priorAuthorityApplication: renderedPriorAuthorityApplication,
    statusApplication: renderedStatusApplication,
    hasLinkedCases: hasLinkedCases,
    linkedCases: linkedCasesForView,
    isAssociatedLinkedCase: isAssociatedLinkedCase,
    linkedLeadReference: linkedLeadReference,
    applicationRoutePrefix: '/v6',
    hasPriorAuthority: hasPriorAuthority,
    priorAuthorityType: priorAuthorityType,
    sessionData: req.session.data,
    isAssigned: isAssigned,
    isInitialApplicationAssigned: isInitialApplicationAssigned,
    isPriorAuthorityAssigned: isPriorAuthorityAssigned,
    isStatusApplicationAssigned: isStatusApplicationAssigned,
    assignedCaseworker: assignedCaseworker,
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
    type: 'data_change',
    fieldChanged: {
      'first-name': 'firstName',
      'last-name': 'lastName',
      'date-of-birth': 'dob',
      'home-address': 'homeAddress',
      'correspondence-address': 'correspondenceAddress',
      'opponent-name': 'opponentName'
    }[field] || field,
    oldValue: oldValue,
    newValue: newValue,
    justification: justification || null
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

function recordPriorAuthorityDecision(req, reference, decision, justification, decisionDetails = null) {
  const application = findApplicationByReference(req, reference, true);
  const status = decision === 'Refuse' ? 'Refused' : 'Granted';
  const detailLines = [];
  if (justification) detailLines.push(justification);
  if (decisionDetails) detailLines.push(decisionDetails);

  appendConsolidatedHistory(req, reference, {
    action: `Prior authority ${status.toLowerCase()}`,
    caseworker: (application && application.caseworker) || 'Caseworker name',
    type: 'pa_decision',
    statusAfter: status,
    changes: { From: 'In progress', To: status },
    justification: detailLines.join(' ') || null
  }, application);
}

router.get('/disbursement-assessment/decision', function(req, res) {
  const reference = req.query.reference || req.session.data['disbursement-assessment-reference'] || '';
  const application = findApplicationByReference(req, reference, true);
  if (!application || !String(application.priorAuthorityType).includes('Disbursement')) {
    res.redirect('/v6/open-applications');
    return;
  }
  req.session.data['disbursement-assessment-reference'] = reference;
  const errors = req.session.data['disbursement-decision-errors'] || null;
  delete req.session.data['disbursement-decision-errors'];
  res.render('v6/disbursement-assessment/decision.njk', { reference, errors, consolidated: req.session.data['consolidated-v6'] === true });
});

router.post('/disbursement-assessment/decision', function(req, res) {
  const decision = req.body['disbursement-decision'];
  if (!decision) {
    req.session.data['disbursement-decision-errors'] = { decision: 'Select grant or refuse to continue' };
    res.redirect('/v6/disbursement-assessment/decision');
    return;
  }
  req.session.data['disbursement-decision'] = decision;
  res.redirect(decision === 'Refuse' ? '/v6/disbursement-assessment/review' : '/v6/disbursement-assessment/review');
});

router.get('/disbursement-assessment/review', function(req, res) {
  const reference = req.session.data['disbursement-assessment-reference'] || '';
  const application = findApplicationByReference(req, reference, true);
  const errors = req.session.data['disbursement-review-errors'] || null;
  delete req.session.data['disbursement-review-errors'];
  res.render('v6/disbursement-assessment/review.njk', { reference, application, errors, data: req.session.data });
});

router.post('/disbursement-assessment/review', function(req, res) {
  const amountDecision = req.body['disbursement-amount-decision'];
  const justification = (req.body['disbursement-justification'] || '').trim();
  const newType = (req.body['disbursement-new-type'] || '').trim();
  const newAmount = (req.body['disbursement-new-amount'] || '').trim();
  if (!amountDecision || !justification || (amountDecision === 'new' && (!newType || !newAmount))) {
    req.session.data['disbursement-review-errors'] = {
      amount: !amountDecision ? 'Select the amount to grant' : null,
      justification: !justification ? 'Enter justification' : null,
      newAmount: amountDecision === 'new' && (!newType || !newAmount) ? 'Enter the new disbursement type and amount' : null
    };
    res.redirect('/v6/disbursement-assessment/review');
    return;
  }
  req.session.data['disbursement-amount-decision'] = amountDecision;
  req.session.data['disbursement-justification'] = justification;
  req.session.data['disbursement-new-type'] = newType;
  req.session.data['disbursement-new-amount'] = newAmount;
  res.redirect('/v6/disbursement-assessment/check-your-answers');
});

router.get('/disbursement-assessment/check-your-answers', function(req, res) {
  const reference = req.session.data['disbursement-assessment-reference'] || '';
  const application = findApplicationByReference(req, reference, true);
  res.render('v6/disbursement-assessment/check-your-answers.njk', { reference, application, data: req.session.data });
});

router.post('/disbursement-assessment/submit', function(req, res) {
  const reference = req.session.data['disbursement-assessment-reference'] || '';
  const decision = req.session.data['disbursement-decision'];
  if (!reference || !decision) {
    res.redirect('/v6/disbursement-assessment/decision');
    return;
  }
  const application = findApplicationByReference(req, reference, true);
  const grantedAmount = req.session.data['disbursement-amount-decision'] === 'new'
    ? req.session.data['disbursement-new-amount']
    : application && application.disbursementAmount;
  const decisionDetails = decision === 'Grant' && grantedAmount
    ? `Amount granted: £${grantedAmount}.`
    : null;
  updatePriorAuthorityStatusForReference(req, reference, decision);
  recordPriorAuthorityDecision(req, reference, decision, req.session.data['disbursement-justification'], decisionDetails);
  removePriorAuthorityFromAssignedList(req, reference);
  res.redirect('/v6/disbursement-assessment/confirmation');
});

router.get('/disbursement-assessment/confirmation', function(req, res) {
  const reference = req.session.data['disbursement-assessment-reference'] || '';
  res.render(req.session.data['consolidated-v6'] === true ? 'v6/consolidated-confirmation.njk' : 'v6/expert-assessment/confirmation.njk', { reference });
});

router.get('/counsel-assessment/decision', function (req, res) {
  const reference = req.query.reference || req.session.data['counsel-assessment-reference'] || '';
  const currentReference = req.session.data['counsel-assessment-reference'];

  if (reference && reference !== currentReference) {
    // Entering from application details starts a fresh decision step; do not preselect Grant.
    delete req.session.data['counsel-decision'];
    delete req.session.data['counsel-covers'];
    delete req.session.data['counsel-justification'];
    delete req.session.data['counsel-refuse-justification'];
    delete req.session.data['counsel-type-granted'];
    delete req.session.data['counsel-assessment-errors'];
    delete req.session.data['counsel-refuse-justification-errors'];
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
    errors.decision = 'Select grant or refuse to continue';
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
    recordPriorAuthorityDecision(
      req,
      reference,
      decision,
      decision === 'Refuse' ? req.session.data['counsel-refuse-justification'] : req.session.data['counsel-justification'],
      decision === 'Grant' && req.session.data['counsel-type-granted']
        ? `Counsel granted: ${req.session.data['counsel-type-granted']}.`
        : null
    );
    removePriorAuthorityFromAssignedList(req, reference);
  }
  res.redirect('/v6/counsel-assessment/confirmation');
});

router.get('/counsel-assessment/confirmation', function (req, res) {
  res.render(req.session.data['consolidated-v6'] === true
    ? 'v6/consolidated-confirmation.njk'
    : 'v6/counsel-assessment/confirmation.njk', {
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
      location: 'SW1A 1AA',
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
      location: 'M1 1AE',
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
    location: 'B1 1AA',
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

function postcodeForExpertLocation(location, priorAuthorityType) {
  const locationText = String(location || '');
  const typeText = String(priorAuthorityType || '');

  if (/[A-Z]{1,2}\d/.test(locationText)) {
    return locationText;
  }

  if (locationText === 'Manchester' || typeText.includes('Physiotherapist')) {
    return 'M1 1AE';
  }

  if (locationText === 'Birmingham') {
    return 'B1 1AA';
  }

  return 'SW1A 1AA';
}

router.get('/expert-assessment/decision', function (req, res) {
  const reference = req.query.reference || req.session.data['expert-assessment-reference'] || '';
  const currentReference = req.session.data['expert-assessment-reference'];

  if (reference && reference !== currentReference) {
    // Starting from the details page resets this flow.
    delete req.session.data['expert-decision'];
    delete req.session.data['expert-justification'];
    delete req.session.data['expert-refuse-justification'];
    delete req.session.data['expert-amount-decision'];
    delete req.session.data['expert-new-amount'];
    delete req.session.data['expert-new-name'];
    delete req.session.data['expert-new-type'];
    delete req.session.data['expert-new-location'];
    delete req.session.data['expert-new-rate'];
    delete req.session.data['expert-new-hours'];
    delete req.session.data['expert-new-minutes'];
    delete req.session.data['expert-new-total-amount'];
    delete req.session.data['expert-new-apportioned-amount'];
    delete req.session.data['expert-assessment-errors'];
    delete req.session.data['expert-refuse-justification-errors'];
    delete req.session.data['expert-assessment-amount-errors'];
    delete req.session.data['expert-assessment-new-amount-errors'];
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
  req.session.data['expert-default-location'] = postcodeForExpertLocation(expertDetails.location, priorAuthorityApplication && priorAuthorityApplication.priorAuthorityType);
  req.session.data['expert-default-rate'] = expertDetails.rate;
  req.session.data['expert-default-hours'] = expertDetails.hours;
  req.session.data['expert-default-minutes'] = expertDetails.minutes;
  req.session.data['expert-requested-amount'] = expertDetails.requestedAmount;
  req.session.data['expert-apportioned'] = Boolean(priorAuthorityApplication && priorAuthorityApplication.apportioned);
  req.session.data['expert-number-of-parties'] = priorAuthorityApplication && priorAuthorityApplication.numberOfParties;
  req.session.data['expert-amount-claimed'] = priorAuthorityApplication && priorAuthorityApplication.amountClaimedForPriorAuthority;

  const errors = req.session.data['expert-assessment-errors'] || null;
  delete req.session.data['expert-assessment-errors'];

  res.render('v6/expert-assessment/decision.njk', {
    pageTitle: 'Make a decision - Prior Authority',
    reference: reference,
    errors: errors,
    consolidated: req.session.data['consolidated-v6'] === true
  });
});

router.post('/expert-assessment/decision-handler', function (req, res) {
  const decision = req.body['expert-decision'];

  const errors = {};
  if (!decision) errors.decision = 'Select grant or refuse to continue';

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
    consolidated: req.session.data['consolidated-v6'] === true,
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
    req.session.data['expert-new-location'] = (req.body['expert-new-location'] || '').trim() || req.session.data['expert-default-location'] || 'B1 1AA';
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
    req.session.data['expert-new-apportioned-amount'] = (req.body['expert-new-apportioned-amount'] || '').trim();
  } else {
    delete req.session.data['expert-new-name'];
    delete req.session.data['expert-new-type'];
    delete req.session.data['expert-new-location'];
    delete req.session.data['expert-new-rate'];
    delete req.session.data['expert-new-hours'];
    delete req.session.data['expert-new-minutes'];
    delete req.session.data['expert-new-total-amount'];
    delete req.session.data['expert-new-amount'];
    delete req.session.data['expert-new-apportioned-amount'];
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
    const grantedAmount = req.session.data['expert-amount-decision'] === 'new'
      ? (req.session.data['expert-new-apportioned-amount'] || req.session.data['expert-new-amount'])
      : (req.session.data['expert-amount-claimed'] || req.session.data['expert-requested-amount']);
    recordPriorAuthorityDecision(
      req,
      reference,
      decision,
      decision === 'Refuse' ? req.session.data['expert-refuse-justification'] : req.session.data['expert-justification'],
      decision === 'Grant' && grantedAmount ? `Amount granted: £${grantedAmount}.` : null
    );
    removePriorAuthorityFromAssignedList(req, reference);
  }

  res.redirect('/v6/expert-assessment/confirmation');
});

router.get('/expert-assessment/confirmation', function (req, res) {
  res.render(req.session.data['consolidated-v6'] === true
    ? 'v6/consolidated-confirmation.njk'
    : 'v6/expert-assessment/confirmation.njk', {
    pageTitle: 'Assessment for prior authority completed - Prior Authority',
    reference: req.session.data['expert-assessment-reference'] || 'CRM4-Expert-123'
  });
});


module.exports = router
