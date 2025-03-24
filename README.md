### Table of contents

-   [Francis GenAI RAG ChatBot on AWS](#francis-genai-rag-chatbot-on-aws)
-   [Licence](#licence)
-   [Key Features](#key-features)
-   [Architecture overview](#architecture-overview)
    -   [Architecture reference diagram](#architecture-reference-diagram)
    -   [Solution components](#solution-components)
-   [Prerequisites](#prerequisites)
    -   [Build environment specifications](#build-environment-specifications)
    -   [AWS account](#aws-account)
-   [How to build and deploy the solution](#how-to-build-and-deploy-the-solution)
    -   [Build and deploy](#build-and-deploy)
    -   [Configuration](#configuration)
-   [RAG Processing Flows](#rag-processing-flows)
-   [Access the solution web UI](#access-the-solution-web-ui)
-   [File structure](#file-structure)
-   [Uninstall the solution](#uninstall-the-solution)

---

## Francis GenAI RAG ChatBot on AWS

Francis is a GenAI RAG ChatBot reference architecture provided by AWS, designed to help developers quickly prototype, deploy, and launch Generative AI-powered products and services using Retrieval-Augmented Generation (RAG). By integrating advanced information retrieval with large language models, this architecture delivers accurate, contextually relevant natural language responses to user queries.

You can use this README file to find out how to build, deploy, use and test the code. You can also contribute to this project in various ways such as reporting bugs, submitting feature requests or additional documentation. For more information, refer to the [Contributing](CONTRIBUTING.md) topic.

## Licence

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.

## Key Features

1. **Flexible Document Ingestion Pipeline**: The chatbot offers two powerful ingestion paths:

    > NOTE: The Alameda Assessor's Office's implementation of Francis only supports the default pipeline. The managed Knowledge Base pipeline is unsupported.

    - **Default Pipeline**: A customizable pipeline that processes various document formats (CSV, plain text) using Lambda functions and stores embeddings in Aurora PostgreSQL.
    - **Amazon Bedrock Knowledge Base**: A managed ingestion path that leverages Amazon Bedrock's built-in capabilities for document processing and storage in OpenSearch Serverless.

2. **Dual Vector Store Support**:

    > NOTE: The Alameda Assessor's Office's implementation of Francis only supports Postgres pgvector as the vector store. OpenSearch is not supported.

    - **Postgres pgvector**: Efficient vector similarity search using Aurora PostgreSQL with the pgvector extension, ideal for smaller to medium-sized datasets and cost-sensitive deployments.
    - **OpenSearch Serverless**: Managed vector search solution that seamlessly integrates with Amazon Bedrock Knowledge Base, offering better scalability for larger datasets.

3. **AWS Bedrock Integration**:

    - Direct access to state-of-the-art foundation models through AWS Bedrock
    - Seamless integration with Bedrock Knowledge Base for enhanced RAG capabilities
    - Support for various embedding models, text generation and reranking models
    - Built-in document processing and chunking capabilities when using Bedrock Knowledge Base
    - Support for Bedrock Guardrails to filter harmful content and redact sensitive information

4. **Interactive Chatbot Interface**: User-friendly interface supporting:

    - Natural language conversations
    - Context-aware responses
    - Real-time document querying
    - Follow-up questions and clarifications

5. **Enterprise-Ready Features**:
    - High availability options with OpenSearch Serverless standby replicas
    - Scalable architecture supporting both serverless and provisioned resources
    - Comprehensive security controls and encryption
    - Flexible deployment options to match your requirements

---

## Architecture overview

### Architecture reference diagram

The following diagram represents the solution's architecture design.

![Diagram](docs/images/solution_architecture_diagram.png)

### Solution components

The solution deploys the following components:

-   **Web Application Firewall**: AWS WAF is utilized to safeguard web frontend and API endpoints from prevalent web vulnerabilities and automated bots that could potentially impact availability, compromise security, or overutilize resources.

-   **Amazon CloudFront Distribution**: Amazon CloudFront distribution is used to serve the ChatBot Web UI. CloudFront delivers low latency, high performance, and secure static web hosting. An Amazon Simple Storage Service (Amazon S3) web UI bucket hosts the static web application artifacts.

-   **Amazon Cognito**: An Amazon Cognito user pool to provide customers a quick and convenient authentication mechanism to explore the solution's functionalities without extensive configuration.

-   **Amazon API Gateway**: It exposes a set of RESTful APIs and routes incoming requests to the backend lambda functions.

-   **Chat Lambda Function**: This lambda function stores and retrieves chat messages for user's chat sessions in a DynamoDB table, enabling the maintenance of conversational context.

-   **Inference Lambda Function**: The Inference Lambda Function handles user queries and provides natural language responses. It interacts with either the similarity search function or Bedrock Knowledge Base to retrieve relevant context information based on the user's query and fetches the user's chat session messages from the chat lambda function. By combining context retrieval, chat session awareness, and leveraging large language models, the Inference Lambda Function ensures accurate and contextually relevant answers to user queries.

-   **Vector Store**: The solution supports two vector store options:
    -   **Amazon Aurora PostgreSQL**: A serverless cluster with the PGVector extension to store document chunks and embeddings when using the default ingestion pipeline.
    -   **Amazon OpenSearch Serverless**: A managed vector search service that integrates with Bedrock Knowledge Base, offering enhanced scalability and built-in high availability through standby replicas.

> NOTE: The Alameda Assessor's Office's implementation of Francis only supports Postgres pgvector as the vector store. OpenSearch is not supported.

-   **Document Ingestion**: The solution provides two ingestion paths:
    -   **Default Pipeline**: An AWS Step Function that orchestrates document processing, including:
        -   Document chunking and preprocessing
        -   Embedding generation
        -   Vector store ingestion (Aurora PostgreSQL)
    -   **Amazon Bedrock Knowledge Base**: A managed document ingestion service that provides:
        -   Built-in document processing and chunking
        -   Automatic embedding generation
        -   Direct integration with OpenSearch Serverless
        -   Simplified management through Bedrock console

> NOTE: The Alameda Assessor's Office's implementation of Francis only supports the default pipeline. The managed Knowledge Base pipeline is unsupported.

-   **Chat History Data Store**: A DynamoDB table which stores the user's chat session messages.

-   **Amazon Bedrock**: Provides access to:
    -   Foundation Models for text generation
    -   Embedding Models for vector generation
    -   Knowledge Base for document ingestion and retrieval
    -   Built-in RAG capabilities when using Knowledge Base

The solution architecture adapts based on the chosen ingestion path and vector store configuration:

1. **Default Pipeline with Aurora PostgreSQL**:

    - Uses Step Functions for document processing
    - Stores vectors in Aurora PostgreSQL
    - Provides full control over the ingestion process

2. **Bedrock Knowledge Base with OpenSearch Serverless**:
    - Leverages managed document processing
    - Stores vectors in OpenSearch Serverless
    - Offers simplified management and scalability
    - Enables built-in Bedrock RAG capabilities

> NOTE: The Alameda Assessor's Office's implementation of Francis only supports Postgres pgvector as the vector store. OpenSearch is not supported.

Both configurations maintain the same high-level architecture while offering different trade-offs in terms of management overhead, scalability, and control.

---

## Prerequisites

### Build environment specifications

-   The computer used to build the solution must be able to access the internet
-   It must also run on an ARM architecture
-   The computer must have Docker and Docker Compose installed (tested versions: Docker 25.0.8 with Docker Compose 2.34.0)
-   You should also have the Git CLI installed and clone permissions for this repository

The recommended system configuration is a `t4g.large` Amazon EC2 instance running Amazon Linux 2023 (AMI: `ami-0345469b8a1ca112a`), with 100 GiB EBS gp3 storage. On this configuration, `deployment/docker_amazon_linux_2023.sh` installs the tested versions of Docker and Docker Compose. See [this link](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-instance-wizard.html) for instructions on configuring such a system. 

### AWS account

-   **Access to Amazon Bedrock foundation models**: Access to Amazon Bedrock foundation models isn't granted by default. In order to gain access to a foundation model, an IAM user with sufficient permissions needs to request access to it through the console. Once access is provided to a model, it is available for all users in the account. To manage model access, sign into the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/). Then select Model access at the bottom of the left navigation pane.
-   **Lambda concurrency limits**: In the AWS Console's top search bar, search for "Service Quotas". Ensure that this value is a significant amount above 50 (the number of Lambda functions this deployment is configured to use during document ingestion). The AWS account default is 1000.

---

## How to build and deploy the solution

### Build and deploy

- Install `git` (on Amazon Linux 2023: `sudo dnf install git`)

- Run a Git clone:
```
git clone -b deployment https://github.com/cal-poly-dxhub/francis-alameda && cd francis-alameda
``` 

- If installing Docker and Docker Compose using the provided script on an ARM Amazon Linux 2023 instance, run:

```bash
bash deployment/docker_amazon_linux_2023.sh && newgrp docker
```

-   Set your AWS credentials and an administrator email in `deployment/credentials.env`.

-   Run `docker-compose run deployment`.

These steps will build the solution, deploy it to your AWS account, and ingest the following:

-   The Alameda Assessor's Handbook, whose chapters' public download links are configured in `tools/urls.txt`.
-   Tax code information, which is synced from a public S3 bucket in a DxHub development account.

### Configuration

Use the `bin/config.yaml` file to configure the solution. This repository has a recommended configuration already placed in `bin/config.yaml`, but information about the settings it contains is provided below.

**Data retention policy configuration (optional)**

By default, all solution data (S3 buckets, Aurora DB instances, Aurora DB snapshots etc.) will be kept when you uninstall the solution. To remove this data, in the configuration file, set the `retainData` flag to `false`. You are liable for the service charges when solution data is retained in the default configuration.

```yaml
retainData: false,
```

**Application name (optional)**

An unique identifier, composed of ASCII characters, is used to support multiple deployments within the same account. The application name will be appended to the CloudFormation stack name, ensuring each CloudFormation stack remains unique.

```yaml
applicationName: <string>
```

**LLM configuration**

Specify settings for the large language models, including streaming, conversation history length, corpus document limits, similarity thresholds, and prompt configurations for standalone question rephrasing and question-answering chains.

-   **streaming (optional)**: Whether to enable streaming responses from the language model. Default is false.

    ```yaml
    streaming: <true|false>
    ```

-   **maxConversationHistory (optional)**: The maximum number of chat messages to include in the conversation history for rephrasing a follow-up question into a standalone question. Default is 5.

    ```yaml
    maxConversationHistory: <integer>
    ```

-   **maxCorpusDocuments (optional)**: The maximum number of documents to include in the context for a question-answering prompt. Default is 5.

    ```yaml
    maxCorpusDocuments: <integer>
    ```

-   **corpusSimilarityThreshold (optional)**: The minimum similarity score required for a document to be considered relevant to the question. Default is 0.25.

    ```yaml
    corpusSimilarityThreshold: <float>
    ```

-   **standaloneChainConfig (optional)**: Configuration for the standalone question rephrasing chain. If this chain is not configured, the original user questions will be used directly for answering without any rephrasing.

    -   **modelConfig**: configuration for the language model used in this chain

        ```yaml
        modelConfig:
            provider: <the provider of the language model (e.g., bedrock, sagemaker).>
            modelId: <the ID of the language model or inference profile (e.g., anthropic.claude-3-haiku-20240307-v1:0, us.anthropic.claude-3-haiku-20240307-v1:0)>
            modelEndpointName: <the name of SageMaker endpoint if the model provider is set to sagemaker. Leave it to empty if the provider is bedrock.>
            modelKwargs: <Additional keyword arguments for the language model, such as topP, temperature etc.>
        ```

        Example:

        ```yaml
        modelConfig:
            provider: bedrock
            modelId: anthropic.claude-3-haiku-20240307-v1:0
            modelKwargs:
                maxTokens: 1024
                temperature: 0.1
                topP: 0.99
                stopSequences:
                    - 'Asisstant:'
        ```

        To find more information about `modelKwargs`, please refer to the [inference parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html).

    -   **promptTemplate**: The prompt template used for rephrasing questions.

        ```yaml
        promptTemplate: <string>
        ```

        Example:

        ```yaml
        promptTemplate: |
            Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language. 
            If there is no chat history, just rephrase the question to be a standalone question.

            Chat History:
            ${chat_history}
            Follow Up Input: ${question}
        ```

    -   **promptVariables**: The list of variables used in the prompt template.

        ```yaml
        promptVariables:
            - <variable1>
            - <variable2>
        ```

        Example:

        ```yaml
        promptVariables:
            - chat_history
            - question
        ```

    -   **kwargs**: Addtional keyword arguments used in this chain.

        ```yaml
        kwargs:
            <key>: <value>
        ```

        Example:

        ```yaml
        kwargs:
            system_prompt: |
                You are an AI assistant. Your primary role is to assist users with a wide range of questions and tasks. However, do not provide advice or information related to buying or selling stocks, investments, or financial trading. If asked about these topics, politely decline and suggest the user consult a financial professional.
            input_label: inputs
            model_kwargs_label: parameters
            output_label: generated_text
        ```

-   **qaChainConfig**: Configuration for the question-answering chain.

    -   **modelConfig**: Configuration for the language model used in this chain (similar to standaloneChainConfig.modelConfig).
        ```yaml
        modelConfig:
            provider: <the provider of the language model (e.g., bedrock, sagemaker).>
            modelId: <the ID of the language model or inference profile (e.g., anthropic.claude-3-haiku-20240307-v1:0, us.anthropic.claude-3-haiku-20240307-v1:0)>
            modelEndpointName: <The name of the SageMaker endpoint for the language model (required for SageMaker models).>
            modelKwargs: <Additional keyword arguments for the language model, such as topP, temperature etc.>
        ```
    -   **promptTemplate**: The prompt template used for answering questions.
        ```yaml
        prompteTemplate: <string>
        ```
    -   **promptVariables**: The list of variables used in the prompt template.
        ```yaml
        promptVariables:
            - <variable1>
            - <variable2>
        ```
    -   **kwargs**: Addtional keyword arguments used in this chain.
        ```yaml
        kwargs:
            <key>: <value>
        ```
        To enable promotion image handling, firstly you need to upload the document to the input bucket, and then specify the promotion image URL using the `promotion_image_url` parameter in the `kwargs`.
        ```yaml
        kwargs:
            promotion_image_url: <s3>
        ```

-   **rerankingConfig (optional)**: Configuration for reranking retrieved documents to improve relevance and accuracy of responses. Reranking helps refine the initial similarity search results by applying a more sophisticated model to assess document relevance.

    ```yaml
    rerankingConfig:
      modelConfig:
        provider: <the provider of the reranking model (currently supports 'bedrock')>
        modelId: <the ID of the reranking model>
      kwargs:
        numberOfResults: <the number of top results to return after reranking>
        additionalModelRequestFields: <model-specific parameters for reranking requests>
          <key>: <value>
    ```

    Example:

    ```yaml
    rerankingConfig:
        modelConfig:
            provider: bedrock
            modelId: cohere.rerank-v3-5:0
        kwargs:
            numberOfResults: 10
            additionalModelRequestFields:
                max_tokens_per_doc: 4000
    ```

    When enabled, reranking is applied after the initial vector similarity search and before sending context to the LLM. This can significantly improve the quality of retrieved documents, especially for complex queries.

    > **Note**: Reranking may increase latency and costs as it involves an additional model inference step.

-   **guardrailConfig (optional)**: Configuration for content moderation and PII protection. Guardrails help ensure safe and compliant interactions by filtering inappropriate content and handling sensitive information.

    ```yaml
    guardrailConfig:
        contentFilters:
            - type: <content filter type (HATE, VIOLENCE, SEXUAL)>
              inputStrength: <filter strength for input (LOW, MEDIUM, HIGH)>
              outputStrength: <filter strength for output (LOW, MEDIUM, HIGH)>
        piiFilters:
            - type: <PII filter type (EMAIL, PHONE, NAME, etc.)>
              action: <action to take on PII (ANONYMIZE, BLOCK)>
        blockedMessages:
            input: <custom message for blocked input>
            output: <custom message for blocked output>
    ```

    Example:

    ```yaml
    guardrailConfig:
        contentFilters:
            - type: HATE
              inputStrength: HIGH
              outputStrength: HIGH
            - type: VIOLENCE
              inputStrength: HIGH
              outputStrength: HIGH
            - type: SEXUAL
              inputStrength: MEDIUM
              outputStrength: MEDIUM
        piiFilters:
            - type: EMAIL
              action: ANONYMIZE
            - type: PHONE
              action: ANONYMIZE
            - type: NAME
              action: ANONYMIZE
        blockedMessages:
            input: 'I apologize, but I cannot process your request as it may contain inappropriate content. Please rephrase your question.'
            output: 'I apologize, but I cannot provide that type of response. Please try asking a different question.'
    ```

    When enabled, guardrails are applied to both user inputs and AI responses. Content filters help prevent harmful or inappropriate content, while PII filters protect sensitive personal information.

**RAG configuration**

-   **vectorStoreConfig**: Configuration for the vector store. This solution supports two types of vector stores: Amazon Aurora PostgreSQL and Amazon OpenSearch Serverless.

    ```yaml
    vectorStoreConfig:
        vectorStoreType: <pgvector | opensearch>
        vectorStoreProperties:
            # For pgvector (Aurora PostgreSQL)
            minCapacity: <The minimum capacity (in Aurora Capacity Units) for the vector store.>
            maxCapacity: <The maximum capacity (in Aurora Capacity Units) for the vector store.>
            useRDSProxy: <Boolean flag indicating if RDS proxy is used for database connections.>

            # For OpenSearch Serverless
            standbyReplicas: <'ENABLED' | 'DISABLED', Indicates whether to use standby replicas for the collection. Default is ENABLED>
            allowFromPublic: <Boolean flag determining whether the collection is accessible over the internet from public networks. Default is false>
    ```

    Example for pgvector:

    ```yaml
    vectorStoreConfig:
        vectorStoreType: pgvector
        vectorStoreProperties:
            minCapacity: 2
            maxCapacity: 8
            useRDSProxy: true
    ```

    Example for OpenSearch Serverless:

    ```yaml
    vectorStoreConfig:
        vectorStoreType: opensearch
        vectorStoreProperties:
            standbyReplicas: ENABLED
            allowFromPublic: false
    ```

-   **embeddingsModels**: A list of embeddings models used for generating document embeddings.

    ```yaml
    embeddingsModels:
        - provider: <The provider of the embeddings model (e.g., bedrock, sagemaker).>
          modelId: <The ID of the embeddings model.>
          modelRefKey: <A reference key for the embeddings model.>
          dimensions: <The dimensionality of the embeddings produced by the model.>
          modelEndpointName: <The name of the SageMaker endpoint for the embeddings model (required for SageMaker models).>
    ```

    If multiple embedding models are configured, the first model in the list will be chosen by default unless modelRefKey is specified.

-   **corpusConfig (optional)**: Configuration for the document corpus and ingestion settings. The solution provides two ingestion paths:

    1. **Default Pipeline**: Uses Aurora PostgreSQL as the vector store

    -   Automatically provisions an ingestion pipeline
    -   Processes documents through Lambda functions
    -   Stores embeddings in Aurora PostgreSQL

    2. **Amazon Bedrock Knowledge Base**: Uses OpenSearch Serverless as the vector store

    -   Leverages Amazon Bedrock's built-in ingestion capabilities
    -   Requires OpenSearch Serverless as the vector store
    -   Provides managed chunking and processing

    > **Important**: To use Amazon Bedrock Knowledge Base, you must configure OpenSearch Serverless as your vector store in the `vectorStoreConfig` section. To use default ingestion pipeline, you must configure Aurora PostgreSQL as the vector store in the `vectorStoreConfig`.

    ```yaml
    corpusConfig:
      corpusType: <'default' | 'knowledgebase'>
      corpusProperties:
        # chunking configuration for default
        chunkingConfiguration:
          chunkSize: <Number of characters per chunk, default is 1000>
          chunkOverlap: <Number of characters overlapping between chunks, default is 200>
        # chunk configuration for knowledgebase
        chunkingConfiguration:
          chunkingStrategy: <'FIXED_SIZE' | 'SEMANTIC', default is 'FIXED_SIZE'>
            # For FIXED_SIZE strategy
            fixedSizeChunkingConfiguration:
              maxTokens: <Maximum tokens per chunk (1-1000), default is 512>
              overlapPercentage: <Overlap between chunks (0-100), default is 20>
            # For SEMANTIC strategy
            semanticChunkingConfiguration:
              maxTokens: <Maximum tokens per chunk (1-1000)>
              overlapPercentage: <Overlap between chunks (0-100)>
              boundaryType: <'SENTENCE' | 'PARAGRAPH'>
    ```

**Chat history configuration (optional)**

> NOTE: Alameda County's implementation of Francis only supports DynamoDB for chat history storage. Aurora PostgreSQL is not supported.

By default, this solution uses DynamoDB to store chat history. Alternatively, it supports storing chat history in the same PostgreSQL database as the vector store.

```yaml
chatHistoryConfig:
    storeType: <dynamodb | aurora_postgres>
```

**Handoff mechanism configuration (optional)**
This solution supports a handoff mechanism to transfer the conversation to a human agent after a certain number of requests from the user.

Under classificationChainConfig -> promptTemplate, the model should be configured to return another classification type "handoff_request". If handoff is not enabled, this type should not be present.

```yaml
handoffConfig:
    model:
        provider: <bedrock>
        modelId: <the Bedrock ID of the handoff model>
        supportsSystemPrompt: <true | false - whether the model supports system prompts via Converse API>
        modelKwArgs: # Optional; uses Bedrock defaults if not set
            maxTokens: 1024
            temperature: 0.1
            topP: 0.99
            stopSequences: ['...']
    handoffThreshold: <the (integer) number of requests after which the handoff mechanism is triggered>
    details: <optional list of details for the summarizer LLM to focus on>
    handoffPrompts: # Each field is individually optional and handoffPrompts is optional
        handoffRequested: <optional prompt for the model when the user requests a handoff and one has not been triggered>
        handoffJustTriggered: <optional prompt for the model when the most recent request triggered handoff>
        handoffCompleting: <optional prompt for the model when the handoff has been triggered and the user asks for a human again>
```
**Exemption mechanism configuration**

This solution supports a mechanism to open a form and ask questions to determine what exemption request forms a user might want to fill out (using an LLM-generated decision tree). Under classificationChainConfig -> promptTemplate, the model should be configured to return another classification type "exemption_logic" with no response. 

```yaml
exemptionConfig:
    model:
        provider: <bedrock>
        modelId: <the Bedrock ID of model used for generating exemption decision trees>
        supportsSystemPrompt: <true | false - whether the model supports system prompts via Converse API>
        modelKwArgs: # Optional; uses Bedrock defaults if not set
            maxTokens: 1024
            temperature: 0.1
            topP: 0.95
            stopSequences: ['...']
    promptTemplate: <template prompt for generating exemption decision trees; takes ${user_query} and ${context} arguments>
    corpusLimit: <number of documents to include in the exemption decision tree corpus, default is 5>
    corpusSimilarityThreshold: <threshold for similarity score to include a document in the exemption decision tree corpus, default is 0.5>
```


**AWS WAF configuration (optional)**
This solution provisions AWS WAF Web ACL for API Gateway resources, by default. For a CloudFront distribution WAF Web ACL, the solution allows users to associate their existing AWS WAF Web ACL for CloudFront with the CloudFront distribution created by the solution. Refer to the configuration options below for configuring your AWS WAF Web ACL.

```yaml
wafConfig:
    enableApiGatewayWaf: <true|false>
    cloudfrontWebAclArn: <The ARN of existing Waf WebAcl to link with CloudFront. It has to be created on us-east-1.>
    allowedExternalIpRanges: <A list of IP prefixes. e.g. 192.168.0.0/24, 10.0.0.0/8>
```

Example WAF Configuration:

```yaml
wafConfig:
    enableApiGatewayWaf: true
    allowedExternalIpRanges:
        - 192.168.0.0/24
        - 10.0.0.0/8
```

## RAG Processing Flows

The GenAI RAG chatbot supports three primary data flows: `Classification Flow`, `Condensing Flow`, and `Question/Answer Flow`. In the Classification Flow, the chatbot analyzes the incoming user query to determine its type and the appropriate processing path. The Condensing Flow is designed to enhance context understanding by rephrasing follow-up questions and the chat history into a standalone, contextually complete question, ensuring accurate downstream processing. Finally, the Question/Answer Flow retrieves relevant information from the knowledge corpus and generates precise, context-aware responses to user queries, leveraging retrieved documents and advanced generative capabilities. Together, these flows enable seamless and intelligent interactions.

![Diagram](docs/images/sequence_diagram.png)

## Access the solution web UI

After the solution stack has been deployed and launched, you can sign in to the web interface.

1. Find the website URL from deployment output starting with `CloudFrontDomain` and open it in your browser. We recommend using Chrome. You will be redirected to the sign in page that requires username and password.
2. Sign in with the email address specified during deployment (`adminEmail`) and use the temporary password received via email after deployment. You will receive a temporary password from `no-reply@verificationemail.com`.
3. During the sign in, you are required to set a new password when signing in for the first time.
4. After signing in, you can view the solution's web UI.

---

## File structure

Upon successfully cloning the repository into your local development environment but prior to running the initialization script, you will see the following file structure in your editor.

```
|- lib/                       # Infrastructure and backend code
   |- infra/                  # CDK Infrastructure
   |- backend/                # Backend code
|- docs/                      # Documentation files
   |- images/                 # Documentation images and diagrams
|- frontend/                  # React ChatBot UI application
   |- src/                    # Source code files
   |- public/                 # Static assets
|- quickstart/                # Quick start configuration examples
   |- bedrock/                # Sample configuration files
|- reports/                   # Security and dependency reports
|- .gitignore                 # Git ignore file
|- LICENSE.txt                # Apache 2.0 license
|- README.md                  # Project documentation
```

---

## Uninstall the solution

You can uninstall the solution by directly deleting the stacks from the AWS CloudFormation console.

To uninstall the solution, delete the stacks from the AWSCloudFormation console

-   Go to the AWS CloudFormation console, find and delete the following stacks:
    -   All the stacks with the prefix `FrancisChatbotStack`

Alternatively, you could also uninstall the solution by running `npm run cdk destroy` from the `source` folder.

---

Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://www.apache.org/licenses/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
