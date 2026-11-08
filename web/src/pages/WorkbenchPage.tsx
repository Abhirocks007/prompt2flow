import { Header } from "../components/Header";

export function WorkbenchPage() {
  return (
    <div className="flex h-full flex-col">
      <Header title="Workbench" />
      <div className="p-8 text-sm text-muted">Human review is not wired in this prompt2flow build.</div>
    </div>
  );
}
