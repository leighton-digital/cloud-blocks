import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { IdempotencyTable } from '../../../src/constructs/idempotency-table';

export class IdempotencyTableNestedStack extends cdk.NestedStack {
  public readonly idempotencyTable: IdempotencyTable;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    this.idempotencyTable = new IdempotencyTable(this, 'IdempotencyTable', {});
  }
}
