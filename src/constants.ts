import { DecisionFormData } from './types';

export const MAX_TITLE_LENGTH = 100;
export const MAX_OPTION_LENGTH = 160;
export const MAX_REASON_LENGTH = 500;
export const MIN_REFLECTION_LENGTH = 3;
export const MAX_REFLECTION_LENGTH = 1000;

export const INITIAL_DECISION_FORM: DecisionFormData = {
  title: '',
  optionA: '',
  optionB: '',
  chosenOption: null,
  reason: '',
};
