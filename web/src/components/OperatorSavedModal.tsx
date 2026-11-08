import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store/app";

export function OperatorSavedModal() {
  const operator = useApp((s) => s.savedOperator);
  const clear = useApp((s) => s.clearSavedOperator);
  const navigate = useNavigate();
  const [commit, setCommit] = useState("");
  if (!operator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6">
      <div className="w-[460px] overflow-hidden rounded-2xl border border-line bg-[#121216] shadow-2xl">
        <div className="bg-gradient-to-r from-[#d6d6ff] via-[#efeaff] to-[#b8fff0] px-6 py-5">
          <h2 className="text-2xl font-medium leading-tight text-[#3b3b7a]">
            Operator
            <br />
            Saved Successfully!
          </h2>
        </div>
        <div className="space-y-4 px-6 py-5 text-sm">
          <p className="text-ok">Your operator has been saved under Operators</p>
          <p className="text-muted">You can manage operators, workgraphs, schedules & supervision from there.</p>
          <label className="block">
            <div className="mb-2 text-xs text-accent">Commit message (v1) — optional</div>
            <textarea
              value={commit}
              onChange={(e) => setCommit(e.target.value)}
              maxLength={2000}
              placeholder="What changed in this version?"
              className="h-20 w-full rounded-xl border border-line bg-raised p-3 outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-muted">{commit.length}/2000</div>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button type="button" onClick={clear} className="px-3 py-2 text-sm text-muted">
            Continue in Chat
          </button>
          <button
            type="button"
            className="rounded-full bg-accent px-4 py-2 text-sm text-[#2a2250]"
            onClick={() => {
              clear();
              navigate(`/operators/${operator.id}`);
            }}
          >
            View Operator →
          </button>
        </div>
      </div>
    </div>
  );
}
