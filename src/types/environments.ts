/**
 * AWS region codes mapped to human-readable region names.
 * @readonly
 * @enum {string}
 */
export enum Region {
  Dublin = 'eu-west-1',
  London = 'eu-west-2',
  Frankfurt = 'eu-central-1',
  Virginia = 'us-east-1',
  Ohio = 'us-east-2',
  Oregon = 'us-west-2',
  California = 'us-west-1',
  Canada = 'ca-central-1',
  SaoPaulo = 'sa-east-1',
  Stockholm = 'eu-north-1',
  Milan = 'eu-south-1',
  Paris = 'eu-west-3',
  Ireland = 'eu-west-1',
  CapeTown = 'af-south-1',
  Bahrain = 'me-south-1',
  Singapore = 'ap-southeast-1',
  Sydney = 'ap-southeast-2',
  Jakarta = 'ap-southeast-3',
  Tokyo = 'ap-northeast-1',
  Seoul = 'ap-northeast-2',
  Osaka = 'ap-northeast-3',
  Mumbai = 'ap-south-1',
  Hyderabad = 'ap-south-2',
  HongKong = 'ap-east-1',
  Uae = 'me-central-1',
  Zurich = 'eu-central-2',
  Spain = 'eu-south-2',
  Melbourne = 'ap-southeast-4',
  Israel = 'il-central-1',
}

/**
 * Deployment stages for the application.
 * @readonly
 * @enum {string}
 */
export enum Stage {
  Develop = 'develop',
  Staging = 'staging',
  Prod = 'prod',
  Test = 'test',
}
