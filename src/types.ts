export type ChosenOptionValue = 'A' | 'B';

export type ReflectionStatus = 'pending' | 'resolved';

export interface Reflection {
  outcome: string;
  whatWouldChange: string;
  status: ReflectionStatus;
}

export interface Decision {
  id: string;
  title: string;
  optionA: string;
  optionB: string;
  chosenOption: ChosenOptionValue;
  reason: string;
  createdAt: string; // ISO string
  reflection?: Reflection;
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

export interface UpdateDecisionInput {
  title: string;
  optionA: string;
  optionB: string;
  chosenOption: ChosenOptionValue;
  reason: string;
  reflection?: Reflection;
}

export interface EditDecisionFormProps {
  decision: Decision;
  onSave: (data: UpdateDecisionInput) => void;
  onCancel: () => void;
}

export type AppView = 'list' | 'add' | 'detail' | 'edit';
