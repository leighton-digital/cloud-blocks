#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { addTagsToStack } from '../../../src/aspects/add-tags-to-stack';
import { TestProjectStack } from '../lib/test-project-stack';

const app = new cdk.App();

const testStack = new TestProjectStack(app, 'TestProjectStack', {});

// Apply additional standard tags using the addTagsToStack utility
addTagsToStack(testStack, {
  Repository: 'https://github.com/leighton-digital/cloud-blocks',
  Component: 'test-project',
});
