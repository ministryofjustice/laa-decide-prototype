# laa-decide-prototype
Prototype for the LAA's 'Decide If An Applicant Can Get Legal Aid' service.

This deploys to: 
https://laa-decide-prototype.apps.live.cloud-platform.service.justice.gov.uk/

Username: decide

Password: prototype

## Local Development

Install dependencies using `yarn install`
Run `yarn run dev` to spin up locally 

(Note, npm might have issues if you are on a Mac with an Apple Chip. Yarn doesn't seem to though)

### Views Folders

In the `app/views` folder, there are a number of different prototype views. `static` is the one that will be deployed and used when running this. All the others are historic versions. Confusingly, `latest` is in the fact the last `javascript` version, and not the actual latest. 

## Deployment

This will automatically deploy to the above URL once merged into Main. 