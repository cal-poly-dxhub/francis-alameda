/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Alert, Spinner } from '@cloudscape-design/components';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import Form, { Question } from './Form';
import Message from './Message';
import { CHAT_MESSAGE_PARAMS, useInprogressMessages, useListChatMessages } from '../../hooks';
import { ChatMessage } from '../../react-query-hooks';
import EmptyState from '../Empty';

type ConversationViewProps = {
  chatId: string;
};

export const ConversationView = forwardRef((props: ConversationViewProps, ref: React.ForwardedRef<HTMLDivElement>) => {
  const { chatId } = props;
  const [formVisible, setFormVisible] = useState(true);

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

  const testQuestions: Question[] = [
    {
      question_id: 'q1',
      question: 'What is your favorite color?',
      type: 'list',
      options: ['Red', 'Blue', 'Green', 'Yellow'],
    },
    {
      question_id: 'q2',
      question: 'What is your preferred mode of transport?',
      type: 'list',
      options: ['Car', 'Bicycle', 'Public Transport', 'Walking'],
    },
    {
      question_id: 'q3',
      question: 'What type of music do you enjoy?',
      type: 'list',
      options: ['Rock', 'Pop', 'Classical', 'Jazz'],
    },
    {
      question_id: 'q4',
      question: 'What is your favorite cuisine?',
      type: 'list',
      options: ['Italian', 'Chinese', 'Mexican', 'Indian'],
    },
    {
      question_id: 'q5',
      question: 'Which programming language do you like the most?',
      type: 'list',
      options: ['JavaScript', 'Python', 'TypeScript', 'Go'],
    },
  ];

  const getNextQuestion = (questions: Question[]): Question | null => {
    if (questions.length === 0) {
      return testQuestions[0];
    }

    const index = testQuestions.findIndex((q) => q.question_id === questions[questions.length - 1].question_id);

    if (index === -1 || index === testQuestions.length - 1) {
      return null; // No next question
    }

    return testQuestions[index + 1];
  };

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
        {formVisible && <Form onSubmit={onExemptionSubmit} getNextQuestion={getNextQuestion} />}
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
