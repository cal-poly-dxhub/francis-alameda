/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 * @interface UpdateChatResponseContent
 */
export interface InitiateExemptionResponseContent {
  /**
   * @type {string | null}
   * @memberof InitiateExemptionResponseContent
   */
  rootNodeId: string | null;
}

// TODO: where to put a Question interface?

/**
 * Check if a given object implements the InitiateExemptionResponseContent interface.
 */
export function instanceOfInitiateExemptionResponseContent(value: object): boolean {
  let isInstance = true;
  isInstance = isInstance && 'rootNodeId' in value;

  return isInstance;
}

export function InitiateExemptionResponseContentFromJSON(json: any): InitiateExemptionResponseContent {
  return InitiateExemptionResponseContentFromJSONTyped(json, false);
}

export function InitiateExemptionResponseContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): InitiateExemptionResponseContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    rootNodeId: json['rootNodeId'],
  };
}

export function InitiateExemptionResponseContentToJSON(value?: InitiateExemptionResponseContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    rootNodeId: value.rootNodeId,
  };
}
