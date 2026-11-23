const currentCaseworker = 'Joann Barton';
const colleagues = [
  { name: 'Darren Horne', email: 'darren.horne@justice.gov.uk' },
  { name: 'Sarah Johnson', email: 'sarah.johnson@justice.gov.uk' },
  { name: 'Mike Chen', email: 'mike.chen@justice.gov.uk' },
  { name: 'Emma Wilson', email: 'emma.wilson@justice.gov.uk' },
  { name: 'David Brown', email: 'david.brown@justice.gov.uk' },
  { name: 'Darren Morris', email: 'darren.morris@justice.gov.uk' },
  { name: 'Danielle Horne', email: 'danielle.horne@justice.gov.uk' },
  { name: 'Aisha Ahmed', email: 'aisha.ahmed@justice.gov.uk' },
  { name: 'Amir Khan', email: 'amir.khan@justice.gov.uk' },
  { name: 'Charlotte Evans', email: 'charlotte.evans@justice.gov.uk' },
  { name: 'Daniel Hughes', email: 'daniel.hughes@justice.gov.uk' },
  { name: 'Emily Clarke', email: 'emily.clarke@justice.gov.uk' },
  { name: 'James Patel', email: 'james.patel@justice.gov.uk' },
  { name: 'Laura Williams', email: 'laura.williams@justice.gov.uk' },
  { name: 'Mohammed Ali', email: 'mohammed.ali@justice.gov.uk' },
  { name: 'Priya Shah', email: 'priya.shah@justice.gov.uk' },
  { name: 'Rebecca Taylor', email: 'rebecca.taylor@justice.gov.uk' },
  { name: 'Samuel Davies', email: 'samuel.davies@justice.gov.uk' },
  { name: 'Sophie Martin', email: 'sophie.martin@justice.gov.uk' },
  { name: 'Thomas Green', email: 'thomas.green@justice.gov.uk' }
];

const exampleCases = [
  { ref: 'W-YOB-I01', firstName: 'Alex', lastName: 'Taylor', submitted: '15 Sep 2024', caseworker: 'Darren Horne' },
  { ref: 'K-XPC-389', firstName: 'Morgan', lastName: 'Evans', submitted: '19 Sep 2024', caseworker: 'Darren Horne' },
  { ref: 'V-KL6-429', firstName: 'Robin', lastName: 'Jones', submitted: '16 Sep 2024', caseworker: 'Darren Horne' },
  { ref: 'M-N24-578', firstName: 'Sam', lastName: 'Patel', submitted: '18 Sep 2024', caseworker: 'Darren Horne' }
];

function ensureColleagueLists(data) {
  if (data['consolidated-colleague-applications-v6']) return;
  const existing = new Set([
    ...(data['assigned-applications'] || []),
    ...(data['open-applications-all'] || []),
    ...(data['open-applications'] || []),
    ...(data['completed-applications'] || []),
    ...(data['consolidated-extra-initial-applications-v6'] || [])
  ].map(app => `${app.ref}|${Boolean(app.isPriorAuthority)}`));
  data['consolidated-colleague-applications-v6'] = exampleCases
    .filter(app => !existing.has(`${app.ref}|false`))
    .map(app => ({
      ...app,
      reference: app.ref,
      dob: 'Not supplied',
      firm: 'Example solicitors',
      type: 'Initial application',
      delegatedFunctions: 'Used',
      matterType: { title: 'Family', subtext: 'Special Children Act' },
      isPriorAuthority: false
    }));
}

function findColleague(value) {
  const query = String(value || '').trim().toLowerCase();
  return colleagues.find(colleague => colleague.name.toLowerCase() === query
    || colleague.email.toLowerCase() === query
    || `${colleague.name} - ${colleague.email}`.toLowerCase() === query);
}

module.exports = { currentCaseworker, colleagues, ensureColleagueLists, findColleague };
