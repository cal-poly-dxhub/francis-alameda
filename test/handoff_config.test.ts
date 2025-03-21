/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import Ajv from 'ajv';
import * as yaml from 'js-yaml';
import configSchema from '../bin/config-schema';
import { SystemConfig } from '../lib/infra/common/types';
import * as path from 'path';
import * as fs from 'fs';

test('config-with-summarizer', () => {
    // A config with handoff enabled and every handoffConfig option defined

    const configFilePath = path.join(__dirname, './test_config_summarizer.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    // Validity
    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeDefined();

    // Access some properties
    const handoffConfig = systemConfig.handoffConfig;
    const modelConfig = handoffConfig?.modelConfig;
    expect(modelConfig?.provider).toBe('bedrock');
    expect(modelConfig?.modelKwargs?.maxTokens).toBe(1024);
    expect(modelConfig?.modelKwargs?.temperature).toBe(0.1);
    expect(modelConfig?.modelKwargs?.topP).toBe(0.9);
    expect(modelConfig?.modelKwargs?.stopSequences).toStrictEqual([]);

    expect(handoffConfig?.details).toBeDefined();
    expect(handoffConfig?.modelConfig.supportsSystemPrompt).toBe(true);
    expect(handoffConfig?.handoffThreshold).toBe(1);
    expect(handoffConfig?.handoffPrompts).toBeDefined();
    expect(handoffConfig?.handoffPrompts.handoffRequested).toBeDefined();
    expect(handoffConfig?.handoffPrompts.handoffJustTriggered).toBeDefined();
    expect(handoffConfig?.handoffPrompts.handoffCompleting).toBeDefined();
});

test('config-default-kwargs', () => {
    // Configs without modelKwargs, handoffThreshold, or details are valid; they're either
    // filled with defaults or not used

    const configFilePath = path.join(__dirname, './test_config_defaults.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeDefined();
    expect(systemConfig.handoffConfig?.modelConfig.provider).toBe('bedrock');
    expect(systemConfig.handoffConfig?.modelConfig.modelKwargs).toBeUndefined();
    expect(systemConfig.handoffConfig?.modelConfig.supportsSystemPrompt).toBe(false);
    expect(systemConfig.handoffConfig?.handoffThreshold).toBe(1);
    expect(systemConfig.handoffConfig?.handoffPrompts).toBeDefined();
    expect(systemConfig.handoffConfig?.handoffPrompts.handoffRequested).toBeDefined();
    expect(systemConfig.handoffConfig?.handoffPrompts.handoffJustTriggered).toBeDefined();
    expect(systemConfig.handoffConfig?.handoffPrompts.handoffCompleting).toBeDefined();
});

test('no-handoff', () => {
    // Configs without handoffConfig are okay; this means handoff is disabled

    const configFilePath = path.join(__dirname, './test_config_no_handoff.yaml');

    const config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as Record<
        string,
        unknown
    >;
    const systemConfig = config.systemConfig as SystemConfig;

    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(configSchema);
    expect(validate(systemConfig)).toBe(true);
    expect(systemConfig.handoffConfig).toBeUndefined();
});
