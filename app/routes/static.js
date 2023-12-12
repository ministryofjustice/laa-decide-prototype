//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// add an item to the application history

router.post('/send-back-check', function(request, response) {

    var sendbackCheck = request.session.data['rejection-reason']
    if (sendbackCheck == "rfi") {
        response.redirect("/static/my-applications-rfi")
    }  else if (sendbackCheck == "withdraw") {
      response.redirect("/static/my-applications-withdraw")
    }  else {
      response.redirect("/static/my-applications-rejected")
    }
});

router.post('/merits-check', function(request, response) {

    var meritsCheck = request.session.data['application_2_proceeding_1_certificate_1']
    if (meritsCheck == "granted") {
        response.redirect("/static/merits-assessment-emergency-costs")
    } else {
      response.redirect("/static/merits-assessment-substantive")
    }
});

router.post('/merits-check2', function(request, response) {

    var meritsCheck2 = request.session.data['application_1_proceeding_1_certificate_2']
    if (meritsCheck2 == "granted") {
        response.redirect("/static/merits-assessment-substantive-costs")
    } else {
      response.redirect("/static/decision-communication")
    }
});

router.post('/decision-check', function(request, response) {

    var decisionCheck = request.session.data['overall-decision']
    if (decisionCheck == "refuse") {
        response.redirect("/static/overall-decision-error")
    }  else {
      response.redirect("/static/confirmation-screen")
    }
});


module.exports = router
