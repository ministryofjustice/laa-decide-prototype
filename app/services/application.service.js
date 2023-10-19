/*
  * this is where we create a note that can be pushed to the application stack
*/
const moment = require('moment');

const create_note =  (user_display_name, title, content) => {
    const new_note = {
        'when': moment(),
        'who': user_display_name,
        'role': null,
        'title': title,
        'text': content
    };
    return new_note;
}

const find_application = (req) =>{
    return req.session.data.applications.find(currentApplication);
    function currentApplication(application) {
        return application.applicationDetails.refNo === req.session.data.refNo;
    }
}
const assign_application = async (req) =>
{
    const application = find_application(req);
    //only assign the application if it has not already been assigned
    if (!req.session.data.assignedApplications.includes(req.session.data.refNo))
    {
        req.session.data.assignedApplications.push(req.session.data.refNo);
        // add an item to the application history if not added before
        let new_note = create_note(
            'You',
            'Application added to workload',
            null);
        application.applicationDetails.notes.push(new_note);

    }
}

const unassign_application = async (req) =>
{
    const application = find_application(req);
    req.session.data.assignedApplications.splice(
        req.session.data.assignedApplications.indexOf(req.session.data.refNoToRemove), 1);

    // add an item to the application history
    let note = req.session.data['removal-reason'];
    if (req.session.data['removal-reason-other'])
    {
        note = note + ' - ' + req.session.data['removal-reason-other'];
    }

    application.applicationDetails.notes.push(
        create_note(
            'You',
            'Application removed from workload',
            note ));
}

const return_application_to_provider = async (req) => {
    let application = find_application(req);
    // we do not want to reject if this is a request for further information
    if (!(req.session.data['rejection-reason'] === 'RFI'))
    {
        application['applicationDetails']['meritsAssessmentResult'] = 'rejected';
        application['applicationDetails']['meansAssessmentResult'] = 'rejected';
    }
    else
    {
            application['applicationDetails']['meritsAssessmentResult'] = 'RFI';
            application['applicationDetails']['meansAssessmentResult'] = 'RFI';
            //display the banner to say more information has been requested
            req.session.data['request-more-information'] = 'display-banner-now';
    }

    let note = req.session.data['rejection-reason'];
    //the user may fill this note in for any reason
    if (req.session.data['request-more-information'] && req.session.data['request-more-information'].length>0){
        note = note + ' - ' + req.session.data['request-more-information'];
    }
    // add an item to the application history
    application.applicationDetails.notes.push(
        create_note(
        'You',
        'Application sent back to provider',
        note));
}

const update_merits_certificate_decisions = async (req) =>
{
    const application = find_application(req);
    for (const proceeding of application['applicationDetails']['proceedings'])
    {
        for (const certificate of proceeding['certificates']) {
            if (typeof req.session.data[certificate['id']] !== 'undefined' && req.session.data[certificate['id']] !== null)
            {
                certificate['meritsResult'] = req.session.data[certificate['id']];
            }
        }

    }
    return true;
}

const update_means_certificate_decisions = async (req) =>
{
    const application = find_application(req);
    for (const proceeding of application['applicationDetails']['proceedings']) {
        if (typeof req.session.data[proceeding['id']] !== 'undefined' && req.session.data[proceeding['id']] !== null) {
            proceeding['meansResult'] = req.session.data[proceeding['id']];
        }
    }
    return true;
}
const update_overall_decision = async (req, type) =>
{
    // update overall results
    // count the number of granted and refused proceedings
    let grants = 0;
    let refusals = 0;
    let total_proceedings = 0;
    let certificate_type = null;
    let overall_type = null;
    const application = find_application(req);

    if (type=='merit')
    {
        certificate_type = 'meritsResult';
        overall_type = 'meritsAssessmentResult';
        for (const proceeding of application['applicationDetails']['proceedings']){
            for (const certificate of proceeding['certificates']){
                if ((certificate[certificate_type] == 'granted') || (certificate[certificate_type] == 'amended')){
                    grants = grants + 1;
                }
                if (certificate[certificate_type] == 'refused'){
                    refusals = refusals + 1;
                }
                total_proceedings = total_proceedings + 1;
            }
        }
    }

    if (type=='means')
    {
        certificate_type = 'meansResult';
        overall_type = 'meansAssessmentResult';
        // count the number of granted and refused proceedings
        for (const proceeding of application['applicationDetails']['proceedings']){
          if (proceeding['meansResult'] == 'granted') {
              grants = grants + 1;
          }
          if (proceeding['meansResult'] == 'refused'){
            refusals = refusals + 1;
          }
          total_proceedings = total_proceedings + 1;
        }

    }

    // if all proceedings have been refused, the application is refused
    if (refusals === total_proceedings)
    {
        application['applicationDetails'][overall_type] = 'refused';
    }

    // if all proceedings have been granted, the application is granted
    if (grants === total_proceedings)
    {
        application['applicationDetails'][overall_type] = 'granted';
    }

    // if some proceedings have been refused, the application is partially granted
    if ((refusals > 0) && (grants > 0) && (refusals + grants == total_proceedings))
    {
        application['applicationDetails'][overall_type] = 'partially granted';
    }

    return true;
}

module.exports = {
    create_note,
    find_application,
    assign_application,
    unassign_application,
    update_merits_certificate_decisions,
    update_means_certificate_decisions,
    update_overall_decision,
    return_application_to_provider
}
