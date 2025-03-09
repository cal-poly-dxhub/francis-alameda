/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Button, FormField, Select } from '@cloudscape-design/components';
import { useState } from 'react';

export type Question = {
  question_id: string;
  question: string;
  answer?: string;
  type: 'list'; // Forms only support list selections for now
  options?: string[]; // Should be populated if type is list
};

type FormProps = {
  pruneOnHistoryChange?: boolean;
  getNextQuestion: (questions: Question[]) => Question | null;
  onSubmit: (questions: Question[]) => void; // To pass the list of questions and answers back up
};

const FormElement = ({ question, onChange }: { question: Question; onChange: (value: string) => void }) => {
  return (
    <FormField label={question.question}>
      <Select
        selectedOption={question.answer ? { label: question.answer, value: question.answer } : null}
        onChange={({ detail }) => onChange(detail.selectedOption.value as string)}
        options={question.options?.map((option) => ({ label: option, value: option })) || []}
        placeholder="Select an option"
      />
    </FormField>
  );
};

export default function Form({ onSubmit, pruneOnHistoryChange = true, getNextQuestion }: FormProps) {
  // Get the first question using the getNxetQuestion function passed in as a prop
  const initialQuestion = getNextQuestion([]);
  const [questions, setQuestions] = useState<Question[]>(initialQuestion ? [initialQuestion] : []);
  const [submitVisible, setSubmitVisible] = useState(false);

  const handleFieldSet = (index: number, value: string) => {
    setQuestions((prevQuestions) => {
      const updatedQuestions = prevQuestions.map((q, i) => (i === index ? { ...q, answer: value } : q));

      if (index < prevQuestions.length - 1 && pruneOnHistoryChange) {
        updatedQuestions.splice(index + 1);
        setSubmitVisible(false);
      }

      const nextQuestion = getNextQuestion(updatedQuestions);
      if (nextQuestion) {
        updatedQuestions.push(nextQuestion);
      } else {
        setSubmitVisible(true);
      }

      return updatedQuestions;
    });
  };

  const handleSubmit = () => {
    setQuestions([]);
    // Allows the parent to retrieve the questions set in this form and de-render the form component
    onSubmit(questions);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {questions.map((q, index) => (
        <FormElement key={index} question={q} onChange={(value) => handleFieldSet(index, value)} />
      ))}
      {submitVisible && (
        <div style={{ alignSelf: 'flex-start' }}>
          <Button variant="primary" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
