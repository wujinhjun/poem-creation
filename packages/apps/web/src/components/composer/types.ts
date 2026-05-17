export type SlotStatus = 'empty' | 'pass' | 'fail' | 'pending';

export type SlotEvaluation = {
  status: SlotStatus;
  label: string;
  title: string;
};
