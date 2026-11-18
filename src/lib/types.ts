export type Entry = { id: string; date: string; title: string; content: string; period: "DAY" | "WEEK" | "MONTH"; links: { id: string; source: string; label: string; url: string; externalId: string }[] };
export type Activity = { id: string; source: "github" | "vikunja" | "mlflow"; kind: string; title: string; date: string; url: string; subtitle?: string; status?: string };
