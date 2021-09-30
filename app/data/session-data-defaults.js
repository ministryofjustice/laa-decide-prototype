module.exports = {
  'applications': [
    // application #1
    {
      'applicationDetails':
      {
        'refNo': 'L-A1B-C2D',
        'dateSubmitted': '2021-08-18T00:00:00.000Z',
        'dateLastUpdated': '2021-08-29T00:00:00.000Z',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'One Test',
          'dob': '1993-03-19T00:00:00.000Z',
          'nino': 'QQ112233Q',
          'address':  '1 London Road</br>London</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Provider One',
          'firm': 'One & Co',
          'accountNumber': '0K514R',
          'address': '2 London Road</br>London</br>SW1A 1AA',
          'phone': '07123456789'
        },
        'opponent':
        {
          'name': 'Opponent One',
          'dob': '1987-11-23T00:00:00.000Z',
          'address': '1 London Road</br>London</br>SW1A 1AA',
          'relationship': 'Husband'
        },
        'children': [
          {
            'name': 'One Child',
            'dob': '2007-02-23T00:00:00.000Z',
            'address': '1 London Road</br>London</br>SW1A 1AA',
            'relationship': 'Child'
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
            'dateUsed': '2021-08-16T00:00:00.000Z'
          },
          {
            'proceedingType': 'Prohibitive steps order',
            'dateUsed': 'Not used'
           },
          {
            'proceedingType': 'Occupation order',
            'dateUsed': '2021-08-16T00:00:00.000Z'
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
                'workProviderCanDo': 'All steps up to and including the hearing on 21 September 2021.',
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
                'formOfService': 'Family Help (Higher)',
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
                'formOfService': 'Family Help (Higher)',
                'workProviderCanDo': 'Limited to Family Help (Higher) and to all steps necessary to negotiate and conclude a settlement. To include the issue of proceedings and representation in those proceedings save in relation to or at a contested final hearing.',
                'meritsResult': ''
              },
              {
                'id': 'application_1_proceeding_3_certificate_2',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Family Help (Higher)',
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
            'requestedCostLimit': '£25,000'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '2021-08-18T00:00:00.000Z'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '2021-08-18T00:00:00.000Z'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '2021-08-18T00:00:00.000Z'
          }
        ],
        'notes': []
      }
    },
    // application #2
    {
      'applicationDetails':
      {
        'refNo': 'L-W1X-Y2Z',
        'dateSubmitted': '2021-08-30T00:00:00.000Z',
        'dateLastUpdated': '2021-08-30T00:00:00.000Z',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Two Test',
          'dob': '2000-05-15T00:00:00.000Z',
          'nino': 'ZZ112233Z',
          'address': '1 High Street</br>London</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Provider Two',
          'firm': 'Two & Co',
          'accountNumber': '0X444X',
          'address': '2 High Street</br>London</br>SW1A 1AA',
          'phone': '07111111111'
        },
        'opponent':
        {
          'name': 'Opponent Two',
          'dob': '1980-06-22T00:00:00.000Z',
          'address': '1 High Street</br>London</br>SW1A 1AA',
          'relationship': 'Husband'
        },
        'children': [
          {
            'name': 'Two Test Child One',
            'dob': '2008-12-03T00:00:00.000Z',
            'address': '1 High Street</br>London</br>SW1A 1AA',
            'relationship': 'Son'
          },
          {
            'name': 'Two Test Child Two',
            'dob': '2010-05-04T00:00:00.000Z',
            'address': '1 High Street</br>London</br>SW1A 1AA',
            'relationship': 'Daughter'
          }
        ],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': '2021-08-28T00:00:00.000Z'
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
                'workProviderCanDo': 'All steps up to and including the hearing on 21 September 2021.',
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
            'requestedCostLimit': '£1,350'
          },
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '2021-08-30T00:00:00.000Z'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '2021-08-30T00:00:00.000Z'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '2021-08-30T00:00:00.000Z'
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
        'dateSubmitted': '2021-08-30T00:00:00.000Z',
        'dateLastUpdated': '2021-08-30T00:00:00.000Z',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Used',
        'categoryLaw': 'Family',
        'meansType': 'Passported',
        'certificateType': 'Emergency and substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Three Test',
          'dob': '1978-10-23T00:00:00.000Z',
          'nino': 'XX112233X',
          'address': '1 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
        },
        'provider':
        {
          'name': 'Provider Three',
          'firm': 'Three & Co',
          'accountNumber': '0D134K',
          'address': '2 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
          'phone': '07111111111'
        },
        'opponent':
        {
          'name': 'Opponent Three',
          'dob': '1980-06-22T00:00:00.000Z',
          'address': '1 Any Street</br>Some Town</br>Nowheresville</br>Out in the Sticks</br>SW1A 1AA',
          'relationship': 'Husband'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [
          {
            'proceedingType': 'Non-molestation order',
            'dateUsed': '2021-08-28T00:00:00.000Z'
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
                'workProviderCanDo': 'All steps up to and including the hearing on 21 September 2021.',
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
            'requestedCostLimit': '£1,350'
          },
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '2021-08-30T00:00:00.000Z'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '2021-08-30T00:00:00.000Z'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '2021-08-30T00:00:00.000Z'
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
        'dateSubmitted': '2021-08-31T00:00:00.000Z',
        'dateLastUpdated': '2021-08-31T00:00:00.000Z',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Not used',
        'categoryLaw': 'Family',
        'meansType': 'Passported',
        'certificateType': 'Substantive',
        'meansAssessmentResult': 'Passported',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Four Test',
          'dob': '1982-01-22T00:00:00.000Z',
          'nino': 'ZZ112233Z',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
        },
        'provider':
        {
          'name': 'Provider Four',
          'firm': 'Four & Co',
          'accountNumber': '0F114J',
          'address': 'Albany House</br>Petty France</br>London</br>SW1H 9AE',
          'phone': '07222222222'
        },
        'opponent':
        {
          'name': 'Opponent Four',
          'dob': '1991-06-14T00:00:00.000Z',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
          'relationship': 'Wife'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [],
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
            'requestedCostLimit': '£25,000'
          }
        ],
        'contributions': [],
        'documents': [
          {
            'title': 'means_report.pdf',
            'link': 'https://drive.google.com/file/d/16V-j11_Na8_bBz4fazl-TP5k8odpPbBX/view',
            'date': '2021-08-31T00:00:00.000Z'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '2021-08-31T00:00:00.000Z'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '2021-08-31T00:00:00.000Z'
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
        'dateSubmitted': '2021-08-31T00:00:00.000Z',
        'dateLastUpdated': '2021-08-31T00:00:00.000Z',
        'applicationType': 'Initial application',
        'delegatedFunctions': 'Not used',
        'categoryLaw': 'Family',
        'meansType': 'Non passported',
        'certificateType': 'Substantive',
        'meansAssessmentResult': 'Not started',
        'meritsAssessmentResult': 'Not started',
        'applicant':
        {
          'name': 'Five Test',
          'dob': '1981-04-15T00:00:00.000Z',
          'nino': 'AA111111Q',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
        },
        'provider':
        {
          'name': 'Provider Five',
          'firm': 'Five & Co',
          'accountNumber': '0P345F',
          'address': 'Albany House</br>Petty France</br>London</br>SW1H 9AE',
          'phone': '07333333333'
        },
        'opponent':
        {
          'name': 'Opponent Five',
          'dob': '1991-06-14T00:00:00.000Z',
          'address': '102 Petty France</br>London</br>SW1H 9AJ',
          'relationship': 'Partner'
        },
        'children': [],
        'linkedApplications': [],
        'delegatedFunctionsDates': [],
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
          },
          {
            'id': 'application_5_proceeding_2',
            'matterType': 'Domestic abuse',
            'proceedingType': 'Prohibited steps order',
            'meansResult': '',
            'certificates': [
              {
                'id': 'application_5_proceeding_2_certificate_1',
                'certificateType': 'Substantive certificate',
                'formOfService': 'Family Help (Higher)',
                'workProviderCanDo': 'Limited to Family Help (Higher) and to all steps necessary to negotiate and conclude a settlement. To include the issue of proceedings and representation in those proceedings save in relation to or at a contested final hearing.',
                'meritsResult': ''
              }
            ]
          }
        ],
        'costLimitations': [
          {
            'certificateType': 'Substantive certificate',
            'costLimit': '£25,000',
            'requestedCostLimit': '£25,000'
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
            'date': '2021-08-31T00:00:00.000Z'
          },
          {
            'title': 'merits_report.pdf',
            'link': 'https://drive.google.com/file/d/19TddAL5MpWAPhDqRCsbggQVVngEHCQA5/view',
            'date': '2021-08-31T00:00:00.000Z'
          },
          {
            'title': 'police_report.pdf',
            'link': 'https://drive.google.com/file/d/1m2SvoKEuJySNk3wxpjvfIYHqMTZlisQf/view',
            'date': '2021-08-31T00:00:00.000Z'
          }
        ],
        'notes': []
      }
    }
  ],
  assignedApplications: []
}
