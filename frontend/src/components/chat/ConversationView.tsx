/* eslint-disable */
/* prettier-ignore */

/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Alert, Spinner } from '@cloudscape-design/components';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import Form, { Question } from './Form';
import Message from './Message';
import { CHAT_MESSAGE_PARAMS, useInprogressMessages, useListChatMessages, useInitiateExemptionMutation, useTraverseExemptionMutation } from '../../hooks';
import { ChatMessage } from '../../react-query-hooks';
import EmptyState from '../Empty';
import { Button } from "@cloudscape-design/components";

type ConversationViewProps = {
  chatId: string;
};

export const ConversationView = forwardRef((props: ConversationViewProps, ref: React.ForwardedRef<HTMLDivElement>) => {
  const { chatId } = props;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, error, fetchNextPage, isFetching, isLoading, hasNextPage, refetch } = useListChatMessages({
    chatId,
    ...CHAT_MESSAGE_PARAMS,
  });

  const inprogressMessages = useInprogressMessages(chatId, refetch);

  const messages = useMemo<ChatMessage[]>(() => {
    const _messages = data?.pages?.flatMap((p) => p.chatMessages || (p as any).data || []) ?? [];
    if (inprogressMessages != null) {
      _messages.push(inprogressMessages.human, inprogressMessages.ai);
    }
    return _messages;
  }, [data, inprogressMessages]);

  const [formVisible, setFormVisible] = useState(false);
  let formSubmittable = false;
  const initiateExemptionMutation = useInitiateExemptionMutation();
  const traverseExemptionMutation = useTraverseExemptionMutation();
  const exemptionQuestions: Question[] = [];
  const [exemptionNode, setExemptionNode] = useState<string | null>(null);

  const testingButton = () => (
    <Button
      onClick={() => {
        initiateExemptionMutation.mutate({
          chatId,
          initiateExemptionRequestContent: {
            exemptionType: "test",
          }
        }, {
          onSuccess: (data) => {
            console.log('Exemption initiated:', data);
            setExemptionNode(data.rootNodeId);
            console.log("Set exemptionNode to", exemptionNode);
          },
          onError: (error) => {
            console.error('Error initiating exemption:', error);
            return;
          }
        });

        if (!exemptionNode) {
          console.error("No exemption tree found");
          return;
        }

        traverseExemptionMutation.mutate({
          chatId,
          traverseExemptionRequestContent: {
            nodeId: exemptionNode,
          }
        }, {
          onSuccess: (data) => {
            data.question && exemptionQuestions.push(data.question);
          },
          onError: (error) => {
            console.error('Error initiating exemption with first question:', error);
          }
        });

        setFormVisible(true);
      }}
    >
      Test
    </Button >
  );


  const onQuestionAnswered = () => {
    if (!exemptionNode) {
      console.error("Tried to answer a question with no exemptionNode set");
      return;
    }

    traverseExemptionMutation.mutate({
      chatId,
      traverseExemptionRequestContent: {
        nodeId: exemptionNode,
        answer: exemptionQuestions.length > 0 ? exemptionQuestions[exemptionQuestions.length - 1].answer : undefined,
      },
    }, {
      onSuccess: (data) => {
        if (data.question && data.nodeId) {
          exemptionQuestions.push(data.question);
          setExemptionNode(data.nodeId);
        } else {
          setExemptionNode(null);
          formSubmittable = true;
        }
      },
      onError: (error) => {
        console.error('Error initiating exemption:', error);
      }
    });
  }

  // The function that gets the next question from the DynamoDB store should take the last
  // question ID and the answer to that question; PK: parent ID, SK: answer to the parent question
  const onExemptionSubmit = (questions: Question[]) => {
    console.log('Questions submitted:', questions);
    setFormVisible(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TODO: load next page on scroll in view of last
  // Should we load newest items first?
  // Should we scroll the last message into view always?
  useEffect(() => {
    if (!isFetching && hasNextPage) {
      fetchNextPage().catch(console.error);
    }
  }, [hasNextPage && isFetching]);

  return (
    <>
      {error && <Alert type="error">{(error as Error).message || String(error)}</Alert>}
      <div
        ref={ref}
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          backgroundColor: '#fcfcfc',
          padding: '4px',
          boxSizing: 'border-box',
          overflowY: 'scroll',
        }}
      >
        {testingButton()}
        {messages.length === 0 && !isLoading && <EmptyState title="No messages" subtitle="No messages to display." />}
        {messages.map((message) => (
          <Message
            message={message}
            key={message.messageId}
            humanStyles={{
              backgroundColor: '#ffffff',
            }}
            aiStyles={{
              backgroundColor: '#efefef',
            }}
          />
        ))}
        {formVisible && <Form onSubmit={onExemptionSubmit} questions={exemptionQuestions} onQuestionAnswered={onQuestionAnswered} submittable={formSubmittable} />}
        {(isLoading || isFetching) && (
          <div
            style={{
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spinner size="big" />
          </div>
        )}
        <span ref={messagesEndRef} />
      </div>
    </>
  );
});
