//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your services here

const { NoteService } = require("../services");


// Add your routes here
router.get('/my-applications', function(req, res) {
  req.session.data['request-more-information'] = '';

  var refNo = req.session.data.refNo;
  var refNoToRemove = req.session.data.refNoToRemove;

  // if a refNo exists then we are assigning an application
  if (refNo != null){
    if (!req.session.data.assignedApplications.includes(refNo)){
      req.session.data.assignedApplications.push(refNo);
    }

    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    if (refNoToRemove == null){
      // add an item to the application history
      // this keeps being added
          let new_note =  NoteService.createNote(
          'You',
          'Application added to workload',
          null );
      application.applicationDetails.notes.push(new_note);
    }
  }


  // if a refNoToRemove exists then we are unassigning an application
  if (refNoToRemove != null){
    const index = req.session.data.assignedApplications.indexOf(refNoToRemove);
    if (index > -1) {
      req.session.data.assignedApplications.splice(index, 1);
    }

    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // add an item to the application history
    var other_reason = '';
    if (req.session.data['removal-reason-other']){
      other_reason = ' - ' + req.session.data['removal-reason-other'];
    }


    application.applicationDetails.notes.push(NoteService.createNote(
        'You',
        'Application removed from workload',
        req.session.data['removal-reason'] + other_reason ));
  }

  req.session.data.refNo = null;
  req.session.data.refNoToRemove = null;

  res.render('./latest/my-applications');
});

router.get('/request-info-note', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // if a request for further info has been made, add an item to the application history
  if (req.session.data['request-more-information']) {


    application.applicationDetails.notes.push(NoteService.createNote('You',
        'Further information requested',
        null ));
    req.session.data['request-more-information'] = 'display-banner-now';
  }
  res.redirect('./application-details');
});

router.get('/application-details', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // update substantive proceeding merits results
  for (const proceeding of application['applicationDetails']['proceedings']){
    for (const certificate of proceeding['certificates']){
      if (typeof req.session.data[certificate['id']] !== 'undefined' && req.session.data[certificate['id']] !== null){
          certificate['meritsResult'] = req.session.data[certificate['id']];
      }
    }
  }

  if ((req.session.data['merits_continue_button']) || (req.session.data['update_all_substantive'])){
    if (req.session.data['merits_continue_button'] != "Save and come back later"){
      // update overall merits results
      // count the numner of granted and refused proceedings
      var grants = 0;
      var refusals = 0;
      var total_proceedings = 0;

      for (const proceeding of application['applicationDetails']['proceedings']){
        for (const certificate of proceeding['certificates']){
          if ((certificate['meritsResult'] == 'granted') || (certificate['meritsResult'] == 'amended')){
            grants = grants + 1;
          }
          if (certificate['meritsResult'] == 'refused'){
            refusals = refusals + 1;
          }
          total_proceedings = total_proceedings + 1;
        }
      }

      // if all proceedings have been refused, the application is refused
      if (refusals === total_proceedings){
        application['applicationDetails']['meritsAssessmentResult'] = 'refused';
      }

      // if all proceedings have been granted, the application is granted
      if (grants === total_proceedings){
        application['applicationDetails']['meritsAssessmentResult'] = 'granted';
      }

      // if some proceedings have been refused, the application is partially granted
      if ((refusals > 0) && (grants > 0) && (refusals + grants == total_proceedings)){
        application['applicationDetails']['meritsAssessmentResult'] = 'partially granted';
      }

      if ((application['applicationDetails']['meritsAssessmentResult'] != "Not started")
          && (application['applicationDetails']['meritsAssessmentResult'] != "In progress")
          && (application['applicationDetails']['meritsAssessmentResult'] != "rejected")){

        var note_text = '';
        for(let proceeding of application['applicationDetails']['proceedings']) {
          note_text = note_text + proceeding['proceedingType'] + '<br><p class="govuk-hint">';
          for(let certificate of proceeding['certificates']) {
            note_text = note_text + '' + certificate['certificateType'] + ': ' + certificate['meritsResult'] + '<br>';
          }
          note_text = note_text + '</p>';
        }

        
        // note update
        if (req.session.data['emergency-note'] && req.session.data['emergency-note'].length>0) {
          note_text = note_text + 'Decision note<p class="govuk-hint">' + req.session.data['emergency-note'] + '</p>'
        }
        if (req.session.data['substantive-note'] && req.session.data['substantive-note'].length > 0) {
          note_text = note_text + 'Decision note<p class="govuk-hint">' + req.session.data['substantive-note'] + '</p>'
        }

        application.applicationDetails.notes.push(NoteService.createNote(
            'You',
            'Merits decision made',
            note_text ));
      }
    }
    req.session.data['merits_continue_button'] = '';
    req.session.data['update_all_substantive'] = '';
    req.session.data['granted-emergency'] = '';
    req.session.data['emergency-certificate-start-date'] = '';
    req.session.data['other-emergency-start-date-day'] = '';
    req.session.data['other-emergency-start-date-month'] = '';
    req.session.data['other-emergency-start-date-year'] = '';
    req.session.data['emergency-certificate-end-date'] = '';
    req.session.data['other-emergency-end-date-day'] = '';
    req.session.data['other-emergency-end-date-month'] = '';
    req.session.data['other-emergency-end-date-year'] = '';
    req.session.data['emergency-note'] = '';
    req.session.data['granted-substantive'] = '';
    req.session.data['substantive-certificate-start-date'] = '';
    req.session.data['other-substantive-start-date-day'] = '';
    req.session.data['other-substantive-start-date-month'] = '';
    req.session.data['other-substantive-start-date-year'] = '';
    req.session.data['substantive-note'] = '';
  }

  // update proceeding means results
  if ((req.session.data['means_continue_button'] === "Save decision") || (req.session.data['update_all_means'])) {
    for (const proceeding of application['applicationDetails']['proceedings']){
      if (typeof req.session.data[proceeding['id']] !== 'undefined' && req.session.data[proceeding['id']] !== null){
          proceeding['meansResult'] = req.session.data[proceeding['id']];
      }
    }

    // count the number of granted and refused proceedings
    var grants = 0;
    var refusals = 0;
    var total_proceedings = 0;

    for (const proceeding of application['applicationDetails']['proceedings']){
      if (proceeding['meansResult'] == 'granted') {
          grants = grants + 1;
      }
      if (proceeding['meansResult'] == 'refused'){
        refusals = refusals + 1;
      }
      total_proceedings = total_proceedings + 1;
    }

    // if all proceedings have been refused, the application is refused
    if (refusals === total_proceedings){
      application['applicationDetails']['meansAssessmentResult'] = 'refused';
    }

    // if all proceedings have been granted, the application is granted
    if (grants === total_proceedings){
      application['applicationDetails']['meansAssessmentResult'] = 'granted';
    }

    // if some proceedings have been refused, the application is partially granted
    if ((refusals > 0) && (grants > 0) && (refusals + grants == total_proceedings)){
      application['applicationDetails']['meansAssessmentResult'] = 'partially granted';
    }

    var note_text = '';
    for(let proceeding of application['applicationDetails']['proceedings']) {
      note_text = note_text + proceeding['proceedingType'] + ': ' + proceeding['meansResult'] + '<br>';
    }

    application.applicationDetails.notes.push(NoteService.createNote(
        'You',
        'Means decision made',
        note_text ));

    req.session.data['means_continue_button'] = '';
    req.session.data['update_all_means'] = '';
    req.session.data['contributionCorrect'] = '';
    req.session.data['amended-contribution'] = '';
    req.session.data['amended_contribution_frequency'] = '';
    req.session.data['means-note'] = '';
    req.session.data['means-note'] = '';
  }

  res.locals.data['application'] = application;
  // redirect to a final decision page if necessary
  const application_details = application['applicationDetails']
  const decided_states = ['granted', 'refused', 'partially granted', 'Passported']
  if (decided_states.includes(application_details['meritsAssessmentResult']) &&
      decided_states.includes(application_details['meansAssessmentResult'])
      && res.locals.data['merits_continue_button'] =='Save and continue' || res.locals.data['means_continue_button'] =='Save and continue')
  {
    res.render('./latest/open-applications');
  }
  else{
    res.render('./latest/application-details');}

}
);

router.get('/application-history', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./latest/application-history');
});

router.get('/people', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./latest/people');
});

router.get('/merits-assessment-emergency', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;

  if (application['applicationDetails']['certificateType'] === 'Substantive'){
    res.render('./latest/merits-assessment-substantive');
  }
  else {
    res.render('./latest/merits-assessment-emergency');
  }
});

router.get('/merits-assessment-substantive', function(req, res) {
  if (req.session.data.update_all_emergency === 'Refuse all'){
    res.render('./latest/refuse-application');
  }
  else if (req.session.data.update_all_emergency === 'Grant all'){
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // grant all emergency proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = 'granted';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress';
    res.locals.data['application'] = application;
    res.render('./latest/merits-assessment-substantive');
  }
  else {
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    res.locals.data['application'] = application;
    res.render('./latest/merits-assessment-substantive');
  }
});

router.post('/merits-assessment-substantive', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // update emergency proceeding merits results
  for (const proceeding of application['applicationDetails']['proceedings']){
    for (const certificate of proceeding['certificates']){
      if (typeof req.session.data[certificate['id']] !== 'undefined' && req.session.data[certificate['id']] !== null){
          certificate['meritsResult'] = req.session.data[certificate['id']];
      }
    }
  }

  // update overall merits assessment result
  application['applicationDetails']['meritsAssessmentResult'] = 'in progress';

  res.locals.data['application'] = application;

  // direct to correct page based on button clicked
  if (req.session.data['merits_continue_button'] == "Save and come back later"){
    res.render('./latest/application-details');
  }
  else {
    res.render('./latest/merits-assessment-substantive');
  }
});

router.post('/refuse-application', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  if (req.session.data['update_all_substantive'] === "Refuse all") {

    // refuse all substantive proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Substantive certificate'){
          certificate['meritsResult'] = 'refused';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress'
    res.locals.data['application'] = application;
    res.redirect('./application-details');
  }
  else if (req.session.data['update_all_emergency'] === "Refuse all"){

    // refuse all emergency proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = 'refused';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress';
    res.locals.data['application'] = application;
    res.redirect(307, './merits-assessment-substantive');
  }
});

router.get('/substantive-update-all', function(req, res) {
  if (req.session.data.update_all_substantive === 'Refuse all'){
    res.render('./latest/refuse-application');
  }
  else if (req.session.data.update_all_substantive === 'Grant all'){
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // grant all substantive proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Substantive certificate'){
          certificate['meritsResult'] = 'granted';
        }
      }
    }
    res.locals.data['application'] = application;
    res.redirect(307, './application-details');
  }
});

router.post('/reject-application', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  application['applicationDetails']['meritsAssessmentResult'] = 'rejected';
  application['applicationDetails']['meansAssessmentResult'] = 'rejected';

  var other_reason = '';
  if (req.session.data['rejection-reason-other']){
    other_reason = ' - ' + req.session.data['rejection-reason-other'];
  }
  else{
    if (req.session.data['incorrect-means']){
      other_reason = ' - ' + req.session.data['incorrect-means'];
    }
  }

  // add an item to the application history


  application.applicationDetails.notes.push(NoteService.createNote(
      'You',
      'Application sent back to provider',
      req.session.data['rejection-reason'] + other_reason ));
  res.redirect('./application-details');
});

router.post('/add-note', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // add an item to the application history

  application.applicationDetails.notes.push(NoteService.createNote(
      'You',
      'User note',
      req.session.data['note']));
  res.redirect('./application-history');
});

router.get('/means-assessment', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;

  res.render('./latest/means-assessment');
});


router.get('/means-update-all', function(req, res) {
  if (req.session.data.update_all_means === 'Refuse all'){
    res.render('./latest/refuse-means');
  }
  else if (req.session.data.update_all_means === 'Grant all'){
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // grant all proceeding means results
    for (const proceeding of application['applicationDetails']['proceedings']){
      proceeding['meansResult'] = 'granted';
    }
    res.locals.data['application'] = application;
    res.redirect(307, './application-details');
  }
});

router.get('/refuse-all-means', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // refuse all proceeding means results
  for (const proceeding of application['applicationDetails']['proceedings']){
    proceeding['meansResult'] = 'refused';
  }
  res.locals.data['application'] = application;
  res.redirect(307, './application-details');
});


// experimental index re-routing
router.get('/latest/home', function (req, res) {
  res.render('/latest/my-applications');
});

module.exports = router
