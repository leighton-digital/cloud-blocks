#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TestProjectStack } from '../lib/test-project-stack';

const app = new cdk.App();
new TestProjectStack(app, 'TestProjectStack', {});
