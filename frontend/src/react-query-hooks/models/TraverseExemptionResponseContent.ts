/* tslint:disable */
/* eslint-disable */
import { exists } from '../runtime';
/**
 *
 * @export
 * @interface TraverseExemptionResponseContent
 */
export interface TraverseExemptionResponseContent {
  question?: Question;
  nodeId?: string;
}

// TODO: find a better place for this interface; Form uses it too
interface Question {
  questionId: string;
  question: string;
  answer?: string;
  type: 'list';
  options?: string[]; // Must be populated
}

// TODO: use the Question serialization functions after moving them to some common Question type file

export function TraverseExemptionResponseContentToJSON(value?: TraverseExemptionResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    ...(value.nodeId !== undefined && { nodeId: value.nodeId }),
    question: QuestionToJSON(value.question),
  };
}

/**
 * Check if a given object implements the TraverseExemptionResponseContent interface.
 */
export function instanceOfTraverseExemptionResponseContent(value: object): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const hasQuestion =
    'question' in value ? instanceOfQuestion((value as TraverseExemptionResponseContent).question) : true;
  return hasQuestion;
}

export function TraverseExemptionResponseContentFromJSON(json: any): TraverseExemptionResponseContent {
  return TraverseExemptionResponseContentFromJSONTyped(json, false);
}

export function TraverseExemptionResponseContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): TraverseExemptionResponseContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    nodeId: exists(json, 'nodeId') ? json['nodeId'] : undefined,
    question: json['question'],
  };
}

function instanceOfQuestion(value: any): boolean {
  return value && typeof value === 'object' && 'questionId' in value && 'question' in value && 'type' in value;
}

export function QuestionFromJSON(json: any): Question {
  return QuestionFromJSONTyped(json, false);
}

function QuestionFromJSONTyped(json: any, _ignoreDiscriminator: boolean): Question {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    questionId: json['questionId'],
    question: json['question'],
    type: json['type'],
    answer: exists(json, 'answer') ? json['answer'] : undefined,
    options: exists(json, 'options') ? json['options'] : undefined,
  };
}

function QuestionToJSON(value?: Question | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    questionId: value.questionId,
    question: value.question,
    type: value.type,
    answer: value.answer,
    options: value.options,
  };
}
