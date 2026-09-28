export type TaskStatus = "unchecked" | "complete" | "not_done" | "not_needed";
export type NextAction = "review" | "pay" | "rebook";
export type Step = 1 | 2 | 3;

export interface ScopeItem {
  id: string;
  room: string;
  label: string;
  status: TaskStatus;
}

export interface DraftPhoto {
  id: string;
  name: string;
  dataUrl: string;
}

export interface HandoffDraft {
  version: 1;
  jobName: string;
  cleanerName: string;
  serviceDate: string;
  scope: ScopeItem[];
  exception: string;
  photos: DraftPhoto[];
  nextAction: NextAction;
  nextActionUrl: string;
}
