export type WorkflowInput = {
  id: string;
  label: string;
  type: "text" | "number" | "checkbox";
  required: boolean;
  description?: string;
};

export type WorkflowNode = {
  id: string;
  title: string;
  description: string;
  service: string;
  action?: string;
  prompt: string;
};

export type Workflow = {
  id: string;
  name: string;
  title: string;
  description?: string;
  inputs: WorkflowInput[];
  nodes: WorkflowNode[];
  start_at: string;
};

export type Chat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workflow: Workflow | null;
  latestRunId: string | null;
  savedAsOperator: boolean;
};

export type Message = {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  quickReplies?: string[];
  fileName?: string;
  fileUrl?: string;
};

export type Activity = {
  id: string;
  nodeId: string;
  title: string;
  description: string;
  status: "pending" | "configuring" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  outputs?: unknown;
};

export type AuditEvent = {
  id: string;
  label: string;
  status: "pending" | "configuring" | "completed" | "failed" | "info";
  at: string;
  detail?: string;
};

export type Run = {
  id: string;
  chatId: string;
  workflowId: string;
  status: "running" | "waiting_for_input" | "completed" | "failed";
  inputs: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  activities: Activity[];
  audit: AuditEvent[];
  outputFile?: { name: string; objectKey: string };
};

export type Operator = {
  id: string;
  name: string;
  status: "Ready";
  workflow: Workflow;
  chatId: string;
  latestRunId: string | null;
  createdAt: string;
  latestRun?: Run | null;
  runs?: Run[];
};

export type IntegrationMe = {
  id: string;
  isSelected: boolean;
  accountIdentifier: string;
  integrationSlug: string;
  name: string;
  actionCount: number;
  userActions: string[];
};

export type CatalogItem = {
  slug: string;
  name: string;
  actions: string[];
};
