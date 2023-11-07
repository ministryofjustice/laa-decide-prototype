//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const DECIDED_STATES = ['granted', 'refused', 'partially granted', 'Passported']
const NOT_DECIDED_STATES = ['Not started', 'In progress', 'rejected']
// Add your services here

const { ApplicationService } = require("../services");

// Add your routes here
router.get('/my-applications', async function(req, res) {
  req.session.data['request-more-information'] = '';

  var refNo = req.session.data.refNo;
  var refNoToRemove = req.session.data.refNoToRemove;

//if a refNo exists then we "may" be assigning, usually only if we came from open applications
  if (refNo != null){
    const is_assigned = await ApplicationService.assign_application(req)
  }

  // if a refNoToRemove exists then we are un-assigning an application
  if (refNoToRemove != null){
    const is_unassigned = await ApplicationService.unassign_application(req)
  }

  req.session.data.refNo = null;
  req.session.data.refNoToRemove = null;

  res.render('./latest/my-applications');
});

router.get('/request-info-note', function(req, res) {
  //this is no longer being used as it is done via the reject page
  let application = ApplicationService.find_application(req);

  // if a request for further info has been made, add an item to the application history
  if (req.session.data['request-more-information']) {
    application.applicationDetails.notes.push(
        ApplicationService.create_note('You',
        'Further information requested',
        null ));
    req.session.data['request-more-information'] = 'display-banner-now';
  }
  res.redirect('./application-details');
});

router.get('/application-details', async function(req, res)
{
  //update substantive proceeding merits results if have come from the merits page
  let application = ApplicationService.find_application(req);
  const considered_merits = await ApplicationService.update_merits_certificate_decisions(req);
  //so update_all_substantive not being used in latest (beyond v4)
  // merits_continue button is on both emergency and substantive pages
  if ((req.session.data['merits_continue_button']) || (req.session.data['update_all_substantive']))
  {
    if (req.session.data['merits_continue_button'] != "Save and come back later")
    {
      const merit_result_updated = await ApplicationService.update_overall_decision(req, 'merit');

      if (!NOT_DECIDED_STATES.includes(application['applicationDetails']['meritsAssessmentResult']))
      {
        //create an application note if merits decision made,
        // rejected application already sends a note so not needed
        let note_text = '';
        for(let proceeding of application['applicationDetails']['proceedings'])
        {
          note_text = note_text + proceeding['proceedingType'] + '<br><p class="govuk-hint">';
          for(let certificate of proceeding['certificates'])
          {
            note_text = note_text + '' + certificate['certificateType'] + ': ' + certificate['meritsResult'] + '<br>';
          }
          note_text = note_text + '</p>';
        }

        if (req.session.data['substantive-note'] && req.session.data['substantive-note'].length > 0)
        {
          note_text = note_text + 'Decision note<p class="govuk-hint">' + req.session.data['substantive-note'] + '</p>'
        }

        application.applicationDetails.notes.push(ApplicationService.create_note(
            'You',
            'Merits decision made',
            note_text ));
      }
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

  // update proceeding means results

  if ((req.session.data['means_continue_button'] === "Save decision") || (req.session.data['update_all_means']))
  {
    const considered_means = await ApplicationService.update_means_certificate_decisions(req);
    //update overall means decision
    const considered_overall_means_decision = await ApplicationService.update_overall_decision(req, 'means')

    var note_text = '';
    for(let proceeding of application['applicationDetails']['proceedings']) {
      note_text = note_text + proceeding['proceedingType'] + ': ' + proceeding['meansResult'] + '<br>';
    }

    application.applicationDetails.notes.push(ApplicationService.create_note(
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
  if (DECIDED_STATES.includes(application_details['meritsAssessmentResult']) &&
      DECIDED_STATES.includes(application_details['meansAssessmentResult'])
      && res.locals.data['merits_continue_button'] =='Save and continue' || res.locals.data['means_continue_button'] =='Save and continue')
  {
    res.render('./latest/decision');
  }
  else{
    res.render('./latest/application-details');}

}
);

router.get('/application-history', function(req, res) {
  res.locals.data['application'] = ApplicationService.find_application(req);
  res.render('./latest/application-history');
});

router.get('/people', function(req, res) {
  res.locals.data['application'] = ApplicationService.find_application(req);
  res.render('./latest/people');
});

router.get('/decision', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./latest/decision');
});

router.get('/merits-assessment-emergency', function(req, res) {
  let application = ApplicationService.find_application(req);

  res.locals.data['application'] = application;

  if (application['applicationDetails']['certificateType'] === 'Substantive'){
    res.render('./latest/merits-assessment-substantive');
  }
  else {
    res.render('./latest/merits-assessment-emergency');
  }
});

router.get('/merits-assessment-substantive', function(req, res) {
  if (!["Refuse all", "Grant all"].includes(req.session.data.update_all_emergency))
  {
    res.locals.data['application'] = ApplicationService.find_application(req);
    res.render('./latest/merits-assessment-substantive');
  }
  else
  {// update_all_emergency is likely not used beyond v4, so put that logic below
    if (req.session.data.update_all_emergency === 'Refuse all'){
      res.render('./latest/refuse-application');
    }
    else if (req.session.data.update_all_emergency === 'Grant all')
    {
      let application = ApplicationService.find_application(req);
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
  }

});

router.post('/merits-assessment-substantive', async function(req, res) {
  let application = ApplicationService.find_application(req);
  // update emergency proceeding merits results
  const can_continue = await ApplicationService.update_merits_certificate_decisions(req);

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

//not used beyond version 4
router.post('/refuse-application', function(req, res) {
  let application = ApplicationService.find_application(req);

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

//not used beyond v4?
router.get('/substantive-update-all', function(req, res) {
  if (req.session.data.update_all_substantive === 'Refuse all'){
    res.render('./latest/refuse-application');
  }
  else if (req.session.data.update_all_substantive === 'Grant all'){
    let application = ApplicationService.find_application(req);

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

router.post('/reject-application', async function(req, res) {
  const application_rejected = await ApplicationService.return_application_to_provider(req)
  res.redirect('./application-details');
});

router.post('/add-note', function(req, res) {
  let application = ApplicationService.find_application(req);

  // add an item to the application history

  application.applicationDetails.notes.push(ApplicationService.create_note(
      'You',
      'Caseworker note added',
      req.session.data['note']));
  res.redirect('./application-history');
});

router.get('/means-assessment', function(req, res) {
  let application = ApplicationService.find_application(req);

  res.locals.data['application'] = application;

  res.render('./latest/means-assessment');
});


router.get('/means-update-all', function(req, res) {
  if (req.session.data.update_all_means === 'Refuse all'){
    res.render('./latest/refuse-means');
  }
  else if (req.session.data.update_all_means === 'Grant all'){
    let application = ApplicationService.find_application(req);

    // grant all proceeding means results
    for (const proceeding of application['applicationDetails']['proceedings']){
      proceeding['meansResult'] = 'granted';
    }
    res.locals.data['application'] = application;
    res.redirect(307, './application-details');
  }
});

router.get('/refuse-all-means', function(req, res) {
  let application = ApplicationService.find_application(req);

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
