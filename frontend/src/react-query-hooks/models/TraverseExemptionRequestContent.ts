/* tslint:disable */
/* eslint-disable */

/**
 *
 * @export
 * @interface TraverseExemptionRequestContent
 */
export interface TraverseExemptionRequestContent {
  nodeId: string;
  answer?: string;
}

/**
 * Check if a given object implements the TraverseExemptionRequestContent interface.
 */
export function instanceOfTraverseExemptionRequestContent(value: object): boolean {
  return 'nodeId' in value;
}

export function TraverseExemptionRequestContentFromJSON(json: any): TraverseExemptionRequestContent {
  return TraverseExemptionRequestContentFromJSONTyped(json, false);
}

// TODO: validation necessary here?
export function TraverseExemptionRequestContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): TraverseExemptionRequestContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    nodeId: json['nodeId'],
    answer: json['answer'],
  };
}

export function TraverseExemptionRequestContentToJSON(value?: TraverseExemptionRequestContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    nodeId: value.nodeId,
    answer: value.answer,
  };
}
