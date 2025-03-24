/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/
import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as constants from '../common/constants';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { BaseInfra } from '../base-infra';
import { Authentication } from '../auth';
import { WebSocket } from '../websocket';

export interface ApiProps {
    readonly baseInfra: BaseInfra;
    readonly authentication: Authentication;
    readonly rdsSecret?: secretsmanager.ISecret;
    readonly rdsEndpoint?: string;
    readonly knowledgeBaseId?: string;
    readonly conversationTable: ddb.ITable;
}

const defaultCorsPreflightOptions = {
    allowOrigins: apigw.Cors.ALL_ORIGINS,
    allowMethods: apigw.Cors.ALL_METHODS,
    allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'x-amz-content-sha256'],
};

export class Api extends Construct {
    public readonly restApi: apigw.RestApi;
    public readonly webSocket: WebSocket;
    public readonly inferenceLambda: lambda.IFunction;

    public constructor(scope: Construct, id: string, props: ApiProps) {
        super(scope, id);

        const apiGatewayAccessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
            removalPolicy: props.baseInfra.removalPolicy,
        });

        const api = new apigw.RestApi(this, 'RestApi', {
            restApiName: `${props.baseInfra.solutionInfo.solutionName} API`,
            defaultCorsPreflightOptions,
            defaultMethodOptions: {
                authorizationType: apigw.AuthorizationType.IAM,
            },
            cloudWatchRole: true,
            deployOptions: {
                metricsEnabled: true,
                tracingEnabled: true,
                accessLogDestination: new apigw.LogGroupLogDestination(
                    apiGatewayAccessLogs
                ),
                accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
            },
        });

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [corpusLambda, corpusLambdaAlias] = this.createCorpusResources(api, props);
        /* eslint-enable @typescript-eslint/no-unused-vars */

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [conversationLambda, conversationLambdaAlias] = this.createChatResources(
            api,
            props
        );
        /* eslint-enable @typescript-eslint/no-unused-vars */

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [inferenceLambda, inferenceLambdaAlias] = this.createInferenceResources(
            api,
            props,
            conversationLambda,
            corpusLambda
        );
        /* eslint-enable @typescript-eslint/no-unused-vars */

        this.inferenceLambda = inferenceLambda;
        this.webSocket = new WebSocket(this, 'WebSocket', {
            baseInfra: props.baseInfra,
            userPoolId: props.authentication.userPool.userPoolId,
            appClientId: props.authentication.appClientId,
            inferenceLambda,
        });

        // associate WAF WebACL to APIGateway if WebACL ARN is specified
        if (props.baseInfra.webAcl) {
            const webACLAssociation = new cdk.aws_wafv2.CfnWebACLAssociation(
                this,
                'WebACLAssociation',
                {
                    resourceArn: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/restapis/${api.restApiId}/stages/prod`,
                    webAclArn: props.baseInfra.webAcl.attrArn,
                }
            );
            webACLAssociation.node.addDependency(api);
        }

        new iam.Policy(this, 'ApiAuthenticatedRolePolicy', {
            roles: [props.authentication.identityPool.authenticatedRole],
            statements: [
                // Grant authenticated users in user pool "execute-api" permissions
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['execute-api:Invoke'],
                    resources: [api.arnForExecuteApi('*', '/*', '*')],
                }),
            ],
        });

        this.restApi = api;
    }

    private addMethod(
        resource: apigw.IResource,
        httpMethod: string,
        handler: lambda.IFunction
    ): void {
        resource.addMethod(httpMethod, new apigw.LambdaIntegration(handler), {
            authorizationType: apigw.AuthorizationType.IAM,
        });
    }

    private createChatResources(
        api: apigw.RestApi,
        props: ApiProps
    ): [lambda.Function, lambda.IFunction] {
        const chatResource = api.root.addResource('chat', {
            defaultCorsPreflightOptions,
        });

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [chatApiHandler, chatApiHandlerAlias] = this.createLambdaHandler(
            'conversation',
            props,
            {
                /* eslint-disable @typescript-eslint/naming-convention */
                ...(props.rdsSecret && {
                    RDS_SECRET_ARN: props.rdsSecret.secretArn,
                }),
                ...(props.rdsEndpoint && { RDS_ENDPOINT: props.rdsEndpoint }),
                CONVERSATION_TABLE_NAME: props.conversationTable.tableName,
                CONVERSATION_INDEX_NAME: constants.CONVERSATION_STORE_GSI_INDEX_NAME,
                COGNITO_USER_POOL_ID: props.authentication.userPool.userPoolId,
                /* eslint-enable @typescript-eslint/naming-convention */
            }
        );
        /* eslint-enable @typescript-eslint/no-unused-vars */
        props.conversationTable.grantReadWriteData(chatApiHandler);
        props.rdsSecret?.grantRead(chatApiHandler);
        props.authentication.grantUserPoolAccess(chatApiHandler);
        props.baseInfra.grantBedrockHandoffModelAccess(chatApiHandler);

        this.addMethod(chatResource, 'GET', chatApiHandler);
        this.addMethod(chatResource, 'PUT', chatApiHandler);

        const chatIdResource = chatResource.addResource('{chatId}', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatIdResource, 'GET', chatApiHandler);
        this.addMethod(chatIdResource, 'DELETE', chatApiHandler);
        this.addMethod(chatIdResource, 'POST', chatApiHandler);

        const exemptionTreeResource = chatIdResource.addResource('exemption-tree', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(exemptionTreeResource, 'GET', chatApiHandler);
        this.addMethod(exemptionTreeResource, 'POST', chatApiHandler);

        const chatMessageResource = chatIdResource.addResource('message', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageResource, 'PUT', chatApiHandler);

        const chatMessageIdResource = chatMessageResource.addResource('{messageId}', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageIdResource, 'DELETE', chatApiHandler);

        const feedbackResource = chatMessageIdResource.addResource('feedback', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(feedbackResource, 'PUT', chatApiHandler);

        const chatMessageSourceResource = chatMessageIdResource.addResource('source', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(chatMessageSourceResource, 'GET', chatApiHandler);

        const userResource = chatIdResource.addResource('user', {
            defaultCorsPreflightOptions,
        });

        const userIdResource = userResource.addResource('{userId}', {
            defaultCorsPreflightOptions,
        });

        const handoffResource = userIdResource.addResource('handoff', {
            defaultCorsPreflightOptions,
        });

        this.addMethod(handoffResource, 'GET', chatApiHandler);

        const feedbackDownloadResource = api.root.addResource('feedback', {
            defaultCorsPreflightOptions,
        });

        const downloadResource = feedbackDownloadResource.addResource('download', {
            defaultCorsPreflightOptions,
        });

        this.addMethod(downloadResource, 'GET', chatApiHandler);

        return [chatApiHandler, chatApiHandlerAlias];
    }

    private createCorpusResources(
        api: apigw.RestApi,
        props: ApiProps
    ): [lambda.Function, lambda.IFunction] {
        const corpusResource = api.root.addResource('corpus', {
            defaultCorsPreflightOptions,
        });

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [corpusApiHandler, corpusApiHandlerAlias] = this.createLambdaHandler(
            'corpus',
            props,
            {
                /* eslint-disable @typescript-eslint/naming-convention */
                ...(props.rdsSecret && {
                    RDS_SECRET_ARN: props.rdsSecret.secretArn,
                }),
                ...(props.rdsEndpoint && { RDS_ENDPOINT: props.rdsEndpoint }),
                ...(props.knowledgeBaseId && {
                    KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
                }),
                /* eslint-enable @typescript-eslint/naming-convention */
            }
        );
        /* eslint-enable @typescript-eslint/no-unused-vars */
        corpusApiHandler.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['bedrock:Retrieve'],
                resources: [
                    `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:knowledge-base/${props.knowledgeBaseId}`,
                ],
            })
        );
        props.rdsSecret?.grantRead(corpusApiHandler);
        props.baseInfra.grantSagemakerEmbeddingsModelAccess(corpusApiHandler);
        props.baseInfra.grantBedrockEmbeddingsModelAccess(corpusApiHandler);

        const embeddingResource = corpusResource.addResource('embedding', {
            defaultCorsPreflightOptions,
        });
        const embeddingDocumentsResource =
            embeddingResource.addResource('embedding-documents');
        this.addMethod(embeddingDocumentsResource, 'POST', corpusApiHandler);

        const embeddingQueryResource = embeddingResource.addResource('embedding-query', {
            defaultCorsPreflightOptions,
        });
        this.addMethod(embeddingQueryResource, 'POST', corpusApiHandler);

        return [corpusApiHandler, corpusApiHandlerAlias];
    }

    private createInferenceResources(
        api: apigw.RestApi,
        props: ApiProps,
        conversationLambda: lambda.IFunction,
        corpusLambda: lambda.IFunction
    ): [lambda.Function, lambda.IFunction] {
        const inferenceResource = api.root.addResource('inference', {
            defaultCorsPreflightOptions,
        });
        const inferenceChatResource = inferenceResource.addResource('{chat_id}', {
            defaultCorsPreflightOptions,
        });
        const sendMessageResource = inferenceChatResource.addResource('message', {
            defaultCorsPreflightOptions,
        });

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const [inferenceLambda, inferenceLambdaAlias] = this.createLambdaHandler(
            'inference',
            props,
            {
                /* eslint-disable @typescript-eslint/naming-convention */
                CONVERSATION_LAMBDA_FUNC_NAME: conversationLambda.functionName,
                CORPUS_LAMBDA_FUNC_NAME: corpusLambda.functionName,
                GUARDRAIL_ARN: props.baseInfra.guardrail?.attrGuardrailArn ?? '',
                /* eslint-enable @typescript-eslint/naming-convention */
            }
        );
        /* eslint-enable @typescript-eslint/no-unused-vars */
        props.baseInfra.grantBedrockTextModelAccess(inferenceLambda);
        props.baseInfra.grantSagemakerTextModelAccess(inferenceLambda);
        props.baseInfra.grantBedrockRerankingAccess(inferenceLambda);
        props.baseInfra.grantBedrockGuardrailAccess(inferenceLambda);
        props.baseInfra.grantBedrockExemptionModelAccess(inferenceLambda);

        conversationLambda.grantInvoke(inferenceLambda);
        corpusLambda.grantInvoke(inferenceLambda);
        this.addMethod(sendMessageResource, 'PUT', inferenceLambda);

        return [inferenceLambda, inferenceLambdaAlias];
    }

    private createLambdaHandler(
        resourceName: string,
        props: ApiProps,
        additionalEnvs?: Record<string, string>
    ): [lambda.Function, lambda.Alias] {
        const apiHandler = new lambda.Function(this, `${resourceName}ApiHandler`, {
            ...constants.LAMBDA_COMMON_PROPERTIES,
            vpc: props.baseInfra.vpc,
            runtime: constants.LAMBDA_PYTHON_RUNTIME,
            memorySize: 1024,
            code: lambda.Code.fromAsset(path.join(constants.BACKEND_DIR, resourceName)),
            handler: 'lambda.handler',
            layers: [
                props.baseInfra.powerToolsLayer,
                props.baseInfra.langchainLayer,
                props.baseInfra.toolkitLayer,
            ],
            environment: {
                ...constants.LAMBDA_COMMON_ENVIRONMENT,
                /* eslint-disable @typescript-eslint/naming-convention */
                POWERTOOLS_SERVICE_NAME: `${resourceName}-api`,
                EMBEDDINGS_SAGEMAKER_MODELS: JSON.stringify(
                    props.baseInfra.systemConfig.ragConfig.embeddingsModels
                ),
                CONFIG_TABLE_NAME: props.baseInfra.configTable.tableName,
                /* eslint-enable @typescript-eslint/naming-convention */
                ...additionalEnvs,
            },
        });
        props.baseInfra.configTable.grantReadData(apiHandler);

        // SnapStart requires that lambdas have published versions.
        // .currentVersion creates a version automatically.
        const alias = new lambda.Alias(this, `${resourceName}ApiHandlerAlias`, {
            aliasName: 'current',
            version: apiHandler.currentVersion,
        });

        return [apiHandler, alias];
    }
}
