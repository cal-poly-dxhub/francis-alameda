/* eslint-disable */
/* prettier-ignore */

/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/
import { Button, FormField, Select } from '@cloudscape-design/components';

export type Question = {
  questionId: string;
  question: string;
  answer?: string;
  type: 'list'; // Forms only support list selections for now
  options?: string[]; // Should be populated if type is list
};

type FormProps = {
  questions: Question[];
  onQuestionAnswered: (idx: number, answer: string) => void;
  onSubmit: (questions: Question[]) => void;
  submittable: boolean;
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

export default function Form({ questions, onQuestionAnswered, onSubmit, submittable }: FormProps) {
  const handleAnswerChange = (idx: number, value: string) => {
    questions[idx].answer = value;
    onQuestionAnswered(idx, value);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {questions.map((q, index) => (
        <FormElement key={index} question={q} onChange={(value) => handleAnswerChange(index, value)} />
      ))}
      {submittable && (
        <div style={{ alignSelf: 'flex-start' }}>
          <Button variant="primary" onClick={() => onSubmit(questions)}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
