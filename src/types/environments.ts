/**
 * AWS region codes mapped to human-readable region names.
 * @readonly
 * @enum {string}
 */
export enum Region {
  dublin = 'eu-west-1',
  london = 'eu-west-2',
  frankfurt = 'eu-central-1',
  virginia = 'us-east-1',
  ohio = 'us-east-2',
  oregon = 'us-west-2',
  california = 'us-west-1',
  canada = 'ca-central-1',
  saoPaulo = 'sa-east-1',
  stockholm = 'eu-north-1',
  milan = 'eu-south-1',
  paris = 'eu-west-3',
  ireland = 'eu-west-1',
  capeTown = 'af-south-1',
  bahrain = 'me-south-1',
  singapore = 'ap-southeast-1',
  sydney = 'ap-southeast-2',
  jakarta = 'ap-southeast-3',
  tokyo = 'ap-northeast-1',
  seoul = 'ap-northeast-2',
  osaka = 'ap-northeast-3',
  mumbai = 'ap-south-1',
  hyderabad = 'ap-south-2',
  hongKong = 'ap-east-1',
  uae = 'me-central-1',
  zurich = 'eu-central-2',
  spain = 'eu-south-2',
  melbourne = 'ap-southeast-4',
  israel = 'il-central-1',
}

/**
 * Deployment stages for the application.
 * @readonly
 * @enum {string}
 */
export enum Stage {
  develop = 'develop',
  staging = 'staging',
  prod = 'prod',
  test = 'test',
}
