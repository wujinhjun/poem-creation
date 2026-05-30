export type EditorConstraint = {
  type: string;
  tone?: string;
  xieyun?: boolean;
};

export type EditorPosition = {
  line: number;
  col: number;
};

export type EditorWriteResult = {
  grid: string[][];
  nextPosition: EditorPosition;
  completed: boolean;
};
