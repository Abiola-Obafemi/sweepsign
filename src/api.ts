import type { HandoffDraft } from "./types";

export interface Profile {
  businessName: string;
  cleanerName: string;
  onboarded: boolean;
}
export interface JobRecord {
  id: string;
  title: string;
  draft: HandoffDraft;
  updatedAt: string;
  hasPublicHandoff?: boolean;
}
export interface TemplateRecord {
  id: string;
  name: string;
  scope: HandoffDraft["scope"];
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ??
        "Something went wrong.",
    );
  return response.json() as Promise<T>;
};

export const api = {
  profile: () => request<Profile>("/api/profile"),
  saveProfile: (
    profile: Omit<Profile, "onboarded"> & { onboarded?: boolean },
  ) =>
    request<Profile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  jobs: () => request<JobRecord[]>("/api/jobs"),
  job: (id: string) => request<JobRecord>(`/api/jobs/${id}`),
  saveJob: (id: string | undefined, draft: HandoffDraft, requestKey?: string) =>
    request<JobRecord>(id ? `/api/jobs/${id}` : "/api/jobs", {
      method: id ? "PUT" : "POST",
      headers: id
        ? undefined
        : { "Idempotency-Key": requestKey ?? crypto.randomUUID() },
      body: JSON.stringify({ draft }),
    }),
  templates: () => request<TemplateRecord[]>("/api/templates"),
  createTemplate: (name: string, scope: HandoffDraft["scope"]) =>
    request<TemplateRecord>("/api/templates", {
      method: "POST",
      body: JSON.stringify({ name, scope }),
    }),
  updateTemplate: (id: string, name: string, scope: HandoffDraft["scope"]) =>
    request<TemplateRecord>(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, scope }),
    }),
  deleteTemplate: (id: string) =>
    request<{ deleted: true }>(`/api/templates/${id}`, { method: "DELETE" }),
  createPublicHandoff: (id: string) =>
    request<{ token: string; url: string }>(`/api/jobs/${id}/handoff`, {
      method: "POST",
    }),
  revokePublicHandoff: (id: string) =>
    request<{ revoked: true }>(`/api/jobs/${id}/handoff`, { method: "DELETE" }),
  publicHandoff: (token: string) =>
    request<Pick<JobRecord, "title" | "draft">>(`/api/handoff/${token}`),
};
