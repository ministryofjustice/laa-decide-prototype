//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// add an item to the application history

router.post('/decision-check', function(request, response) {

    var decisionCheck = request.session.data['overall-decision']
    if (decisionCheck == "refuse") {
        response.redirect("/latest/application-complete-error")
    }  else {
      response.redirect("/application-history")
    }
});

module.exports = router
