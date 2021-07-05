/*

Provide default values for user session data. These are automatically added
via the `autoStoreData` middleware. Values will only be added to the
session if a value doesn't already exist. This may be useful for testing
journeys where users are returning or logging in to an existing application.

============================================================================

Example usage:

"full-name": "Sarah Philips",

"options-chosen": [ "foo", "bar" ]

============================================================================

*/

module.exports = {
  'applications': [
    // application #1
    { 'applicationDetails':
      { 'refNo': '30000009020',
        'submitted': '19/03/2020',
        'lastUpdated': '26/03/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported'
      }
    },
    // application #2
    { 'applicationDetails':
      { 'refNo': '30000009021',
        'submitted': '19/03/2020',
        'lastUpdated': '02/04/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Non passported'
      }
    },
    // application #3
    { 'applicationDetails':
      { 'refNo': '30000009022',
        'submitted': '19/03/2020',
        'lastUpdated': '04/04/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported'
      }
    }
  ],
  assignedApplications: []
}
