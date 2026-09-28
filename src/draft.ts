import type { HandoffDraft, NextAction, TaskStatus } from "./types";

export const STORAGE_KEY = "sweepsign:draft:v1";

const scopedStorageKey = (scope?: string) =>
  scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;

const padDatePart = (value: number) => String(value).padStart(2, "0");

export const localDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const isValidDateValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

export const createDefaultDraft = (): HandoffDraft => ({
  version: 1,
  jobName: "",
  cleanerName: "",
  serviceDate: localDateValue(),
  scope: [
    {
      id: "kitchen-counters",
      room: "Kitchen",
      label: "Counters",
      status: "unchecked",
    },
    { id: "kitchen-sink", room: "Kitchen", label: "Sink", status: "unchecked" },
    {
      id: "kitchen-stove",
      room: "Kitchen",
      label: "Stove exterior",
      status: "unchecked",
    },
    {
      id: "kitchen-floors",
      room: "Kitchen",
      label: "Floors",
      status: "unchecked",
    },
    {
      id: "bathroom-surfaces",
      room: "Bathroom",
      label: "Sink & counters",
      status: "unchecked",
    },
    {
      id: "bathroom-toilet",
      room: "Bathroom",
      label: "Toilet",
      status: "unchecked",
    },
    {
      id: "bathroom-shower",
      room: "Bathroom",
      label: "Shower / tub",
      status: "unchecked",
    },
    {
      id: "bedrooms-surfaces",
      room: "Bedrooms",
      label: "Dust surfaces",
      status: "unchecked",
    },
    {
      id: "bedrooms-floors",
      room: "Bedrooms",
      label: "Floors",
      status: "unchecked",
    },
  ],
  exception: "",
  photos: [],
  nextAction: "review",
  nextActionUrl: "",
});

const taskStatuses: TaskStatus[] = [
  "unchecked",
  "complete",
  "not_done",
  "not_needed",
];
const nextActions: NextAction[] = ["review", "pay", "rebook"];

export const loadDraft = (
  storage: Storage,
  scope?: string,
  fallbackDraft = createDefaultDraft(),
): HandoffDraft => {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(scopedStorageKey(scope)) ?? "null",
    );
    if (!parsed || typeof parsed !== "object") return fallbackDraft;
    const candidate = parsed as Partial<HandoffDraft>;
    if (candidate.version !== 1 || !Array.isArray(candidate.scope))
      return fallbackDraft;

    const fallback = fallbackDraft;
    const validScope = candidate.scope.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.room === "string" &&
        typeof item.label === "string" &&
        taskStatuses.includes(item.status),
    );
    const savedStatus = new Map(
      validScope.map((item) => [item.id, item.status]),
    );
    return {
      version: 1,
      jobName:
        typeof candidate.jobName === "string"
          ? candidate.jobName.slice(0, 60)
          : fallback.jobName,
      cleanerName:
        typeof candidate.cleanerName === "string"
          ? candidate.cleanerName.slice(0, 50)
          : fallback.cleanerName,
      serviceDate:
        typeof candidate.serviceDate === "string" &&
        isValidDateValue(candidate.serviceDate)
          ? candidate.serviceDate
          : fallback.serviceDate,
      scope: fallback.scope.map((item) => ({
        ...item,
        status: savedStatus.get(item.id) ?? item.status,
      })),
      exception:
        typeof candidate.exception === "string"
          ? candidate.exception.slice(0, 300)
          : fallback.exception,
      photos: Array.isArray(candidate.photos)
        ? candidate.photos
            .filter(
              (photo) =>
                photo &&
                typeof photo.id === "string" &&
                typeof photo.name === "string" &&
                typeof photo.dataUrl === "string" &&
                photo.dataUrl.startsWith("data:image/"),
            )
            .slice(0, 3)
        : [],
      nextAction: nextActions.includes(candidate.nextAction as NextAction)
        ? (candidate.nextAction as NextAction)
        : fallback.nextAction,
      nextActionUrl:
        typeof candidate.nextActionUrl === "string"
          ? candidate.nextActionUrl
          : fallback.nextActionUrl,
    };
  } catch {
    return fallbackDraft;
  }
};

export const saveDraft = (
  storage: Storage,
  draft: HandoffDraft,
  scope?: string,
) => {
  storage.setItem(scopedStorageKey(scope), JSON.stringify(draft));
};

export const clearDraftIfUnchanged = (
  storage: Storage,
  draft: HandoffDraft,
  scope?: string,
) => {
  const key = scopedStorageKey(scope);
  if (storage.getItem(key) === JSON.stringify(draft)) storage.removeItem(key);
};

export const isValidActionUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const actionLabel: Record<NextAction, string> = {
  review: "Leave a review",
  pay: "Open payment link",
  rebook: "Book the next clean",
};

export const buildSummary = (draft: HandoffDraft) => {
  const completed = draft.scope
    .filter((item) => item.status === "complete")
    .map((item) => `✓ ${item.room}: ${item.label}`);
  const notDone = draft.scope
    .filter((item) => item.status === "not_done")
    .map((item) => `Not completed: ${item.room}: ${item.label}`);
  const lines = [
    draft.jobName || "Cleaning handoff",
    `Service date: ${draft.serviceDate}`,
    draft.cleanerName ? `Completed by: ${draft.cleanerName}` : "",
    "",
    ...completed,
    ...notDone,
    draft.exception ? `\nNote: ${draft.exception}` : "",
    isValidActionUrl(draft.nextActionUrl)
      ? `\n${actionLabel[draft.nextAction]}: ${draft.nextActionUrl}`
      : "",
  ];
  return lines.filter((line, index) => line || index === 3).join("\n");
};
