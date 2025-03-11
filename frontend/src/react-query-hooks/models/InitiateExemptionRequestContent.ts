/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 * @interface InitiateExemptionRequestContent
 */
export interface InitiateExemptionRequestContent {
  exemptionType: string;
}

/**
 * Check if a given object implements the InitiateExemptionRequestContent interface.
 */
export function instanceOfInitiateExemptionRequestContent(value: object): boolean {
  let isInstance = true;
  isInstance = isInstance && 'exemptionType' in value;

  return isInstance;
}

export function InitiateExemptionRequestContentFromJSON(json: any): InitiateExemptionRequestContent {
  return InitiateExemptionRequestContentFromJSONTyped(json, false);
}

export function InitiateExemptionRequestContentFromJSONTyped(
  json: any,
  _ignoreDiscriminator: boolean,
): InitiateExemptionRequestContent {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    exemptionType: json['exemptionType'],
  };
}

export function InitiateExemptionRequestContentToJSON(value?: InitiateExemptionRequestContent | null): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    exemptionType: value.exemptionType,
  };
}
