# laa-decide-prototype
Prototype for the LAA's 'Decide If An Applicant Can Get Legal Aid' service.

This deploys to: 
https://laa-decide-prototype.apps.live.cloud-platform.service.justice.gov.uk/

Published environments use the configured GOV.UK Prototype Kit password.

## Local Development

Install dependencies using `yarn install`
Run `yarn run dev` to spin up locally 

(Note, npm might have issues if you are on a Mac with an Apple Chip. Yarn doesn't seem to though)

To test signing back in after signing out locally, create an untracked `.env`
file in the project root containing `PASSWORD=your-local-test-password` and
restart the development server. Use that password on the research sign-in page.
The file is excluded from Git and Docker builds and does not set the published
environment's password.

### Views Folders

In the `app/views` folder, there are a number of different prototype views. `static` is the one that will be deployed and used when running this. All the others are historic versions. Confusingly, `latest` is in the fact the last `javascript` version, and not the actual latest. 

## Version 5 testing scenario

In `/v6-v5/open-applications`, `M-MDDT-WBYS` is a fixed mock application
with emergency protection order extension and discharge requests. Assign it to
your list to assess both requests. Its initial grant, provider answers and case
history are fixed for repeatable comparison tasks. Granting funding for both
requests does not mean asking the court to make both orders.

Refreshes preserve assignments, notes and decisions within the session. After
completion, find the reference through Version 5 search. A fresh browser session
(or clearing prototype session data) restores the undecided scenario.

`L-VXQO-YZBU` is the fixed change-proceeding scenario. It starts with one
undecided Secure accommodation order request. Assign it, use Change proceeding
to search for any replacement, then follow the existing decision, check answers,
confirmation and internal-note journey. No replacement is preselected. The same
session persistence and fresh-session reset rules apply.

`Y-HCMT-YBYZ` is the fixed mixed-decision scenario. It starts with three
undecided requests: Emergency protection order, Secure accommodation order and
Supervision order. The research task is to refuse the first two and change the
third using the existing journey. No decisions, refusal reasons or replacement
proceeding are preselected. The same session persistence, post-completion search
and fresh-session reset rules apply.

`L-YU5-UY3` is the Louise Bevan add-proceedings scenario, with Contact with a
child in care and Secure accommodation order requests. The free-text
justifications and initial care order role, delegated functions, level of
service and scope, dates, cost limit, personal and provider details are mock
details based on the walkthrough. Fictional initial and proceeding evidence
PDFs are provided for research.
The same session persistence and fresh-session reset rules apply.

In the stakeholder consolidated view, Your list includes an Assigned to others
tab. Search the mock caseworkers by name or email to view their example cases
and assign a case to your own list. Transfers and list contents persist in the
prototype session; a fresh session restores the example colleague lists.
Cases assigned to colleagues also appear in Search with their caseworker. They
are view-only until transferred to Your list.

Evidence links on application details open in a new tab. Some links point to
example documents.

## Deployment

Signing out of the stakeholder or Version 2-5 prototype clears prototype access
and returns to the research disclaimer/password page. Casework session data is
preserved; signing out does not reset research scenarios.

The research sign-in page is branded using a patch to GOV.UK Prototype Kit's
management template, applied during dependency installation. Review the patch
when upgrading the Kit. Authentication and password handling remain the Kit's.
The Kit does not enforce its password in local development.

This will automatically deploy to the above URL once merged into Main.