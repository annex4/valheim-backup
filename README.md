# Description
Pushes a copy of a Valheim World to Amazon S3. Will also automatically backup user data if using the [ServerCharacters](https://valheim.thunderstore.io/package/Smoothbrain/ServerCharacters/) mod.

# Requirements
- [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli|Terraform)
- [AWS Credentials](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
    - I would recommend using a shared credentials file as you can specify which profile you would like to use.
- [IAM User](https://console.aws.amazon.com/iamv2/home?#/users)
    - Services used:
        - Lambda 
            - [Create] [Update]
        - CloudWatch Logs 
            - [Create]
        - S3 
            - [Create]
        - IAM Role 
            - [Create]

# Installation
- Clone the repo through git, or direct download.
- Open a command prompt and navigate to the folder where the repository now resides.
    - `cd Path/To/Where/I/Extracted/Or/Cloned`
- Navigate to /infrastructure
    - `cd infrastructure`
- Create a **terraform.tfvars** file based on the terraform.tfvars.example file
- Enter all of the required fields in the **terraform.tfvars** file
    - server_id: This is the ID of the server, 
        - This can be found in the Debug Information section in the settings tab for BisectHosting or other providers using [Pterodactyl](https://pterodactyl.io/). It will be in the format of a UUID.
    - api_key: This is the API key used to talk to the Pterodactly API.
        - Look around for API credentials and generate some if you need to.
        - [Bisect Account Page](https://games.bisecthosting.com/account/api).
    - host: This is the hostname where your server is located
        - If using bisect hosting you can enter: **games.bisecthosting.com**
    - bucket: This is the name of your s3 bucket. 
        - Be aware these names need to be globally unique, so make sure it's not something that someone else could be using.
    - world: This is the name of the world you wish to backup. Case sensitive. 
        - If you never entered a unique name it's likely **NewWorld**
    - account: This is the account ID of your AWS account. 
        - This can be found by clicking on the account in the top right of AWS and copying the ID.
    - region: This is the region you want to deploy the solution to. 
        - **us-east-1**, **us-west-1**, etc.
- Run "terraform init"
- Run "terraform apply" and follow the instructions to confirm. (Type yes)