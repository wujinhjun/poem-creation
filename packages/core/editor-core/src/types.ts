export type EditorConstraint = {
  type: string;
  tone?: string;
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
