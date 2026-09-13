export type ChosenOptionValue = 'A' | 'B';

export interface Decision {
  id: string;
  title: string;
  optionA: string;
  optionB: string;
  chosenOption: ChosenOptionValue;
  reason: string;
  createdAt: string; // ISO string
}

export interface CreateDecisionInput {
  title: string;
  optionA: string;
  optionB: string;
  chosenOption: ChosenOptionValue;
  reason: string;
}

export interface DecisionFormData {
  title: string;
  optionA: string;
  optionB: string;
  chosenOption: ChosenOptionValue | null;
  reason: string;
}

export interface FormErrors {
  title?: string;
  optionA?: string;
  optionB?: string;
  chosenOption?: string;
  reason?: string;
}

export interface AddDecisionFormProps {
  onSave: (data: CreateDecisionInput) => void;
  onCancel: () => void;
}

export type AppView = 'list' | 'add' | 'detail';
