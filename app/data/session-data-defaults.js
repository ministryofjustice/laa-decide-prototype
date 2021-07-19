module.exports = {
  'applications': [
    // application #1
    {
      'applicationDetails':
      {
        'refNo': 'L-A1B-C2D',
        'dateSubmitted': '19/03/2020',
        'dateLastUpdated': '26/03/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Rita Patel',
          'dob': '19/03/1993',
          'nino': 'QQ112233Q',
          'address':  '1 London Road</br>London</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Joe Bloggs',
          'firm': 'Joe Bloggs & Co',
          'accountNumber': '0K514R',
          'address': '2 London Road</br>London</br>SW1A 1AA',
          'phone': '07123456789'
        },
        'opponent':
        {
          'name': 'Jonathan Hunt',
          'dob': '23/11/1987',
          'address': '1 London Road</br>London</br>SW1A 1AA',
          'relationship': 'Father'
        },
        'children': [
          {
            'name': 'Sam Hunt',
            'dob': '23/02/2007',
            'address': '1 London Road</br>London</br>SW1A 1AA',
            'relationship': 'Son'
          }
        ],
        'linkedApplications': [
          {
            'refNo': 'L-E1F-G2H',
            'status': 'Pending merits assessment'
          },
          {
            'refNo': 'L-J1K-L2M',
            'status': 'Pending billing'
          },
          {
            'refNo': 'L-N1P-Q2R',
            'status': 'Closed'
          },
          {
            'refNo': 'L-S1T-U2V',
            'status': 'Closed'
          }
        ],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': '03/03/2020'
          },
          {
            'proceedingType': 'Prohibitive steps order',
            'dateUsed': 'Not used'
           },
          {
            'proceedingType': 'Occupation order',
            'dateUsed': '03/03/2020'
          }
        ],
        'proceedings': [
          {
            'id': 'application_1_proceeding_1',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Non-molestation order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_1_proceeding_1_certificate_1',
                'certificateType': 'Emergency certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including the hearing on 21 July 2020.',
                'meritsResult': ''
              },
              {
                'id': 'application_1_proceeding_1_certificate_2',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including getting and serving a final order. If the order is breached you can apply for power of arrest. You cannot apply for a warrant of arrest or contempt of court proceedings.',
                'meritsResult': ''
              }
            ]
          },
          {
            'id': 'application_1_proceeding_2',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Prohibited steps order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_1_proceeding_2_certificate_1',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Family help (higher)',
                'workProviderCanDo': 'Limited to Family Help (Higher) and to all steps necessary to negotiate and conclude a settlement. To include the issue of proceedings and representation in those proceedings save in relation to or at a contested final hearing.',
                'meritsResult': ''
              }
            ]
          },
          {
            'id': 'application_1_proceeding_3',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Occupation order',
            'meansResult': '',
              'certificates': [
              {
                'id': 'application_1_proceeding_3_certificate_1',
                'certificateType': 'Emergency certificate',
                'formOfService': 'Family help (higher)',
                'workProviderCanDo': 'Limited to Family Help (Higher) and to all steps necessary to negotiate and conclude a settlement. To include the issue of proceedings and representation in those proceedings save in relation to or at a contested final hearing.',
                'meritsResult': ''
              },
              {
                'id': 'application_1_proceeding_3_certificate_2',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Family help (higher)',
                'workProviderCanDo': 'Limited to Family Help (Higher) and to all steps necessary to negotiate and conclude a settlement. To include the issue of proceedings and representation in those proceedings save in relation to or at a contested final hearing.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Emergency certificate',
            'costLimit': '£1,350',
            'requestedCostLimit': '£4,500',
            'justification': 'I want more money'
          },
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000',
            'justification': 'n/a'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '23/02/2020'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '23/02/2020'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '12/03/2020'
          }
        ],
        'notes': [
          {
            'when': 'Wednesday 22 March 2021 12:21',
            'who': 'Helen Roy',
            'role': 'Customer service advisor',
            'title': 'Customer support note',
            'text': 'Provider called and chased on the case. Client is due to hearing tomorrow.'
          },
          {
            'when': 'Thursday 11 March 2021 11:00',
            'who': 'Mary Smith',
            'role': 'Provider',
            'title': 'New documents uploaded',
            'text': ''
          }
        ]
      }
    },
    // application #2
    {
      'applicationDetails':
      {
        'refNo': 'L-W1X-Y2Z',
        'dateSubmitted': '19/03/2020',
        'dateLastUpdated': '02/04/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Amelia Daugherty',
          'dob': '15/05/2000',
          'nino': 'ZZ112233Z',
          'address': '1 High Street</br>London</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Sarah Shylock',
          'firm': 'Shylock & Co',
          'accountNumber': '0X444X',
          'address': '2 High Street</br>London</br>SW1A 1AA',
          'phone': '07111111111'
        },
        'opponent':
        {
          'name': 'Uriah Daugherty',
          'dob': '22/06/1980',
          'address': '1 High Street</br>London</br>SW1A 1AA',
          'relationship': 'Husband'
        },
        'children': [
          {
            'name': 'Bert Daugherty',
            'dob': '03/12/2008',
            'address': '1 High Street</br>London</br>SW1A 1AA',
            'relationship': 'Son'
          },
          {
            'name': 'Madaline Daugherty',
            'dob': '04/05/2010',
            'address': '1 High Street</br>London</br>SW1A 1AA',
            'relationship': 'Daughter'
          }
        ],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': '03/03/2020'
          }
        ],
        'proceedings': [
          {
            'id': 'application_2_proceeding_1',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Non-molestation order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_2_proceeding_1_certificate_1',
                'certificateType': 'Emergency certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including the hearing on 21 July 2020.',
                'meritsResult': ''
              },
              {
                'id': 'application_2_proceeding_1_certificate_2',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including getting and serving a final order. If the order is breached you can apply for power of arrest. You cannot apply for a warrant of arrest or contempt of court proceedings.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Emergency certificate',
            'costLimit': '£1,350',
            'requestedCostLimit': '£1,350',
            'justification': 'n/a'
          },
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000',
            'justification': 'n/a'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '23/02/2020'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '23/02/2020'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '12/03/2020'
          }
        ],
        'notes': []
      }
    },
    // application #3
    {
      'applicationDetails':
      {
        'refNo': 'L-A2G-H4Q',
        'dateSubmitted': '19/03/2020',
        'dateLastUpdated': '04/04/2020',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Nina Lamb',
          'dob': '25/10/1978',
          'nino': 'XX112233X',
          'address': '1 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Atticus Finch',
          'firm': 'Finch & Co',
          'accountNumber': '0D134K',
          'address': '2 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
          'phone': '07111111111'
        },
        'opponent':
        {
          'name': 'Uriah Daugherty',
          'dob': '22/06/1980',
          'address': '1 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
          'relationship': 'Husband'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': '03/03/2020'
          }
        ],
        'proceedings': [
          {
            'id': 'application_3_proceeding_1',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Non-molestation order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_3_proceeding_1_certificate_1',
                'certificateType': 'Emergency certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including the hearing on 21 July 2020.',
                'meritsResult': ''
              },
              {
                'id': 'application_3_proceeding_1_certificate_2',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including getting and serving a final order. If the order is breached you can apply for power of arrest. You cannot apply for a warrant of arrest or contempt of court proceedings.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Emergency certificate',
            'costLimit': '£1,350',
            'requestedCostLimit': '£1,350',
            'justification': 'n/a'
          },
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000',
            'justification': 'n/a'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '23/02/2020'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '23/02/2020'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '12/03/2020'
          }
        ],
        'notes': []
      }
    },
    // application #4
    {
      'applicationDetails':
      {
        'refNo': 'L-F4R-E5M',
        'dateSubmitted': '01/07/2021',
        'dateLastUpdated': '01/07/2021',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Not used',
        'categoryLaw': 'Family law',
        'meansType': 'Passported',
        'certificateType': 'Substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Kevin MacFarlane',
          'dob': '22/01/1982',
          'nino': 'ZZ112233Z',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
        },
        'provider':
        {
          'name': 'Saul Goodman',
          'firm': 'Hamlin, Hamlin and McGill',
          'accountNumber': '0F114J',
          'address': 'Albany House</br>Petty France</br>London</br>SW1H 9AE',
          'phone': '07222222222'
        },
        'opponent':
        {
          'name': 'Luciana MacFarlane',
          'dob': '14/06/1991',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
          'relationship': 'Wife'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': 'Not used'
          }
        ],
        'proceedings': [
          {
            'id': 'application_4_proceeding_1',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Non-molestation order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_4_proceeding_1_certificate_1',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including getting and serving a final order. If the order is breached you can apply for power of arrest. You cannot apply for a warrant of arrest or contempt of court proceedings.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000',
            'justification': 'n/a'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '23/02/2020'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '23/02/2020'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '12/03/2020'
          }
        ],
        'notes': []
      }
    },
    // application #5
    {
      'applicationDetails':
      {
        'refNo': 'L-D5A-A6L',
        'dateSubmitted': '21/07/2021',
        'dateLastUpdated': '21/07/2021',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Not used',
        'categoryLaw': 'Family law',
        'meansType': 'Non passported',
        'certificateType': 'Substantive',
        'meansAssessmentResult': 'Not started',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Brittany Boyd',
          'dob': '15/4/1981',
          'nino': 'AA111111Q',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
        },
        'provider':
        {
          'name': 'Lawyer McLawyerFace',
          'firm': 'Lawyers R Us',
          'accountNumber': '0P345F',
          'address': 'Albany House</br>Petty France</br>London</br>SW1H 9AE',
          'phone': '07333333333'
        },
        'opponent':
        {
          'name': 'Bob Boyd',
          'dob': '14/06/1991',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
          'relationship': 'Partner'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': 'Not used'
          }
        ],
        'proceedings': [
          {
            'id': 'application_5_proceeding_1',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Non-molestation order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_5_proceeding_1_certificate_1',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Full representation',
                'workProviderCanDo': 'All steps up to and including getting and serving a final order. If the order is breached you can apply for power of arrest. You cannot apply for a warrant of arrest or contempt of court proceedings.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000',
            'justification': 'n/a'
          }
        ],
        'contributions': [
          {
            'description': 'per month from their disposable income',
            'amount': '25.68'
          },
          {
            'description': 'from their disposable capital',
            'amount': '4,500'
          }
        ],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '23/02/2020'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '23/02/2020'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '12/03/2020'
          }
        ],
        'notes': []
      }
    }
  ],
  assignedApplications: []
}
