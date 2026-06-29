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
            datetime: datetime,
            title: 'Initial application refused',
            caseworker: caseworker,
            changes: {
              From: 'Submitted',
              To: 'Refused'
            },
            expandedText: justification || null,
            notes: justification || null,
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
              datetime: datetime,
              title: 'Initial application granted',
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

router.get('/index', function(req, res) {
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

function generateMockApplications(count = 8) {
  const applications = [];
  const generatedRefs = new Set();
  const delegatedOptions = ['Used', 'Not used'];
  const priorAuthorityTypes = ['Expert (Psychiatrist)', 'Expert (Physiotherapist)', 'Counsel', 'King\'s Counsel'];
  
  for (let i = 0; i < count; i++) {
    let ref = generateRandomRef();
    while (generatedRefs.has(ref)) {
      ref = generateRandomRef();
    }
    generatedRefs.add(ref);
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const outcomes = ['In progress', 'Submitted', 'Returned'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const outcomeClasses = { 'In progress': 'light-blue', 'Submitted': 'purple', 'Returned': 'turquoise' };
    const submittedDate = generateRandomDate();
    
    // Create the initial application
    applications.push({
      ref: ref,
      reference: ref,
      firstName: firstName,
      lastName: lastName,
      dob: '12 Jan 1980',
      submitted: submittedDate,
      firm: 'WATKINS SOLICITORS INC<br>OK514R',
      outcome: outcome,
      outcomeClass: outcomeClasses[outcome],
      type: 'Initial application',
      delegatedFunctions: delegatedOptions[Math.floor(Math.random() * delegatedOptions.length)],
      matterType: { title: 'Family', subtext: 'Special Children\'s Act' },
      isPriorAuthority: false
    });
    
    // Randomly add 1-2 prior authority sub-applications for the same reference
    if (Math.random() > 0.5) {
      const numPriorAuth = Math.random() > 0.6 ? 2 : 1;
      for (let j = 0; j < numPriorAuth; j++) {
        applications.push({
          ref: ref,
          reference: ref,
          firstName: firstName,
          lastName: lastName,
          dob: '12 Jan 1980',
          submitted: submittedDate,
          firm: 'WATKINS SOLICITORS INC<br>OK514R',
          outcome: outcome,
          outcomeClass: outcomeClasses[outcome],
          type: 'Prior authority',
          priorAuthorityType: priorAuthorityTypes[Math.floor(Math.random() * priorAuthorityTypes.length)],
          delegatedFunctions: delegatedOptions[Math.floor(Math.random() * delegatedOptions.length)],
          matterType: { title: 'Family', subtext: 'Special Children\'s Act' },
          isPriorAuthority: true
        });
      }
    }
  }
  
  return applications;
}

router.get('/open-applications', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  // Always regenerate open applications on each request to ensure prior authority apps appear
  req.session.data['open-applications'] = generateMockApplications(8);
  
  // Restore any stored decisions from decision-store
  if (req.session.data['decision-store']) {
    req.session.data['open-applications'].forEach(app => {
      restoreDecisionData(app, req.session.data['decision-store']);
    });
  }
  
  res.render('v6/open-applications.njk', { 
    pageTitle: 'Open applications',
    applications: req.session.data['open-applications']
  });
});

router.get('/yourlist', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  // Restore any stored decisions from decision-store
  if (req.session.data['decision-store']) {
    req.session.data['assigned-applications'].forEach(app => {
      restoreDecisionData(app, req.session.data['decision-store']);
    });
  }
  
  res.render('v6/my-applications.html', { 
    pageTitle: 'Your list',
    applications: req.session.data['assigned-applications']
  });
});

router.get('/add-application/:reference', function(req, res) {
  if (!req.session.data['assigned-applications']) {
    req.session.data['assigned-applications'] = [];
  }
  
  const ref = req.params.reference;
  const appExists = req.session.data['assigned-applications'].find(app => app.ref === ref && app.isPriorAuthority === req.query.isPriorAuthority);
  
  if (!appExists) {
    const assignedCaseworker = caseworkers[Math.floor(Math.random() * caseworkers.length)];
    
    // Regenerate open applications to ensure we have current data
    if (!req.session.data['open-applications']) {
      req.session.data['open-applications'] = generateMockApplications(8);
    }
    
    // Get the full application data from open applications
    const openApp = req.session.data['open-applications'] ? req.session.data['open-applications'].find(app => app.ref === ref) : null;
    
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
      datetime: datetime,
      title: 'Application assigned to ' + assignedCaseworker,
      caseworker: assignedCaseworker
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
  const assignedApp = req.session.data['assigned-applications'] ? req.session.data['assigned-applications'].find(app => app.ref === ref) : null;
  const history = req.session.data['app-history'] && req.session.data['app-history'][ref] ? req.session.data['app-history'][ref] : [];
  
  res.render('v6/application-history.html', {
    reference: ref,
    assignedCaseworker: assignedApp ? assignedApp.caseworker : 'Unassigned',
    history: history
  });
});

router.post('/application/:reference/add-note', function(req, res) {
  const ref = req.params.reference;
  const note = req.body.note;
  const userInfo = 'Current User'; // In real scenario, get from session
  
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
    action: 'Caseworker note added',
    caseworker: userInfo,
    details: note
  });
  
  res.redirect('/v6/application/' + ref + '/history');
});

router.get('/search', function(req, res) {
  const showResults = Object.keys(req.query).length > 0;
  let results = [];
  
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
  const hasLinkedCases = reference === 'L-12Z-13P';
  
  // Get application data from assigned, completed, or open applications
  let applicationData = {};
  let hasPriorAuthority = false;
  
  if (req.session.data['assigned-applications']) {
    // Check if ANY application with this reference has prior authority
    const allAppsWithRef = req.session.data['assigned-applications'].filter(app => app.ref === reference);
    applicationData = allAppsWithRef.find(app => !app.isPriorAuthority) || allAppsWithRef[0] || {};
    hasPriorAuthority = allAppsWithRef.some(app => app.isPriorAuthority);
  }
  
  if (!applicationData.ref && req.session.data['completed-applications']) {
    // Check if ANY application with this reference has prior authority
    const allAppsWithRef = req.session.data['completed-applications'].filter(app => app.ref === reference);
    applicationData = allAppsWithRef.find(app => !app.isPriorAuthority) || allAppsWithRef[0] || {};
    hasPriorAuthority = allAppsWithRef.some(app => app.isPriorAuthority);
  }
  
  if (!applicationData.ref && req.session.data['open-applications']) {
    // Check if ANY application with this reference has prior authority
    const allAppsWithRef = req.session.data['open-applications'].filter(app => app.ref === reference);
    applicationData = allAppsWithRef.find(app => !app.isPriorAuthority) || allAppsWithRef[0] || {};
    hasPriorAuthority = allAppsWithRef.some(app => app.isPriorAuthority);
  }
  
  // Get prior authority type from the actual data
  let priorAuthorityType = 'expert';
  if (applicationData.isPriorAuthority) {
    priorAuthorityType = applicationData.priorAuthorityType || 'expert';
  } else if (req.session.data['open-applications']) {
    const priorAuthApp = req.session.data['open-applications'].find(app => app.ref === reference && app.isPriorAuthority);
    if (priorAuthApp) {
      priorAuthorityType = priorAuthApp.priorAuthorityType || 'expert';
    }
  }
  if (!priorAuthorityType && req.session.data['completed-applications']) {
    const priorAuthApp = req.session.data['completed-applications'].find(app => app.ref === reference && app.isPriorAuthority);
    if (priorAuthApp) {
      priorAuthorityType = priorAuthApp.priorAuthorityType || 'expert';
    }
  }
  if (!priorAuthorityType && req.session.data['assigned-applications']) {
    const priorAuthApp = req.session.data['assigned-applications'].find(app => app.ref === reference && app.isPriorAuthority);
    if (priorAuthApp) {
      priorAuthorityType = priorAuthApp.priorAuthorityType || 'expert';
    }
  }
  
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
    correspondenceAddress: `${nameLen} Armitage house<br>108 petty France<br>London<br>SW2 8QT`,
    homeAddress: `${nameLen * 2} Knightsbridge place<br>117A Russell Square<br>London<br>NW3 6BD`,
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
  
  // Restore any stored decision data to the application
  if (req.session.data['decision-store'] && req.session.data['decision-store'][reference]) {
    const stored = req.session.data['decision-store'][reference];
    application.status = stored.status;
    application.decisionDate = stored.decisionDate;
    application.decisionType = stored.decisionType;
    if (stored.certDate) application.certDate = stored.certDate;
    if (stored.refusalReason) application.refusalReason = stored.refusalReason;
  }
  
  // Initialize history with initial application received entry if it doesn't exist
  if (!req.session.data['app-history']) {
    req.session.data['app-history'] = {};
  }
  
  // Ensure the history entry exists and has the correct format
  if (!req.session.data['app-history'][reference] || req.session.data['app-history'][reference].length === 0 || 
      (req.session.data['app-history'][reference].length > 0 && !req.session.data['app-history'][reference][0].title)) {
    
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
      datetime: datetime,
      title: 'Initial application received',
      caseworker: 'N/A',
      versionLink: '/v6/application/' + reference
    });
  }
  
  // Check if application is already assigned (in your list)
  const isAssigned = req.session.data['assigned-applications'] && 
                     req.session.data['assigned-applications'].some(app => app.ref === reference);
  
  // Convert app-history to historyEvents format for template
  let historyEvents = [];
  if (req.session.data['app-history'] && req.session.data['app-history'][reference]) {
    historyEvents = req.session.data['app-history'][reference].map((event, index) => {
      return {
        datetime: event.datetime,
        caseworker: event.caseworker,
        title: event.title,
        versionLink: event.versionLink ? event.versionLink + '?viewVersion=' + index : null,
        changes: event.changes || null,
        notes: event.notes || null,
        justification: event.expandedText || event.justification || null,
        oldValue: event.oldValue || null,
        newValue: event.newValue || null
      };
    });
  }
  
  // Check if viewing a previous version
  const viewVersion = req.query.viewVersion ? parseInt(req.query.viewVersion) : null;
  const isViewingPreviousVersion = viewVersion !== null && viewVersion < historyEvents.length - 1;
  
  res.render('v6/application-details.njk', {
    pageTitle: reference,
    reference: reference,
    application: application,
    hasLinkedCases: hasLinkedCases,
    hasPriorAuthority: hasPriorAuthority,
    priorAuthorityType: priorAuthorityType,
    sessionData: req.session.data,
    isAssigned: isAssigned,
    historyEvents: historyEvents,
    isViewingPreviousVersion: isViewingPreviousVersion
  });
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
    datetime: datetime,
    title: `${displayField} updated`,
    caseworker: caseworker,
    oldValue: oldValue,
    newValue: newValue,
    justification: justification || null,
    versionLink: `/v6/application/${reference}`
  });
  
  // Clear change session data
  delete req.session.data['change-reference'];
  delete req.session.data['change-field'];
  delete req.session.data['change-new-value'];
  delete req.session.data['change-justification'];
  
  res.redirect(`/v6/application/${reference}#people`);
});


module.exports = router
