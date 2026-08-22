import { useState } from "react";
import { useStore, expenseBalance, triggerDownload } from "../state/store";
import { asset } from "../lib/asset";
import { money, shortDate } from "../lib/format";
import { expensesCSV } from "../lib/csv";
import { expandRecurringExpense } from "../lib/recurring";
import type { Expense, ExpenseStatus } from "../types";

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  open: "Open",
  "reimbursement-requested": "Reimbursement requested",
  settled: "Settled",
  disputed: "Disputed",
};

export function Expenses() {
  const { state, addExpenses, setExpenseStatus } = useStore();
  const [showForm, setShowForm] = useState(false);
  const balance = expenseBalance(state);
  const nameOf = (id: string) => state.people.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p className="muted">
            Log a shared cost, split it, attach a receipt, and track who's been
            paid back — with a running balance you can both trust.
          </p>
        </div>
        <div className="head-actions">
          <button
            className="btn"
            onClick={() =>
              triggerDownload(
                new Blob([expensesCSV(state)], { type: "text/csv" }),
                "coparent-expenses.csv",
              )
            }
          >
            ⤓ Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            + Add expense
          </button>
        </div>
      </div>

      <div className="balance-banner">
        <div>
          <span className="muted small">Current balance</span>
          <div className={"balance-amount " + (balance >= 0 ? "pos" : "neg")}>
            {balance >= 0
              ? `${nameOf(state.coParentId)} owes you ${money(balance)}`
              : `You owe ${nameOf(state.coParentId)} ${money(Math.abs(balance))}`}
          </div>
        </div>
        <span className="muted small">Settled items are excluded from the balance.</span>
      </div>

      {showForm && (
        <ExpenseForm
          meId={state.meId}
          coId={state.coParentId}
          nameOf={nameOf}
          onCancel={() => setShowForm(false)}
          onSave={(es) => {
            addExpenses(es);
            setShowForm(false);
          }}
        />
      )}

      {state.expenses.length === 0 ? (
        <div className="card empty-state">
          <img className="empty-art" src={asset("brand/nav-expenses.png")} alt="" aria-hidden width={72} height={72} />
          <p>No expenses yet. Add a shared cost and we'll track who owes what.</p>
        </div>
      ) : (
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Paid by</th>
              <th className="num">Total</th>
              <th className="num">Their share</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.expenses.map((x) => {
              const share = x.amount * x.splitOtherShare;
              return (
                <tr key={x.id}>
                  <td data-label="Description">
                    <div className="cell-title">{x.description}</div>
                    <div className="muted small">
                      {x.category} · {shortDate(x.date)}
                      {x.receiptName && <> · 📎 {x.receiptName}</>}
                    </div>
                  </td>
                  <td data-label="Paid by">{x.paidById === state.meId ? "You" : nameOf(x.paidById)}</td>
                  <td data-label="Total" className="num">{money(x.amount)}</td>
                  <td data-label="Their share" className="num">{money(share)}</td>
                  <td data-label="Status">
                    <span className={"status status-" + x.status}>
                      {STATUS_LABEL[x.status]}
                    </span>
                  </td>
                  <td className="row-actions">
                    {x.status !== "settled" ? (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setExpenseStatus(x.id, "settled")}
                      >
                        Mark paid
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => setExpenseStatus(x.id, "open")}
                      >
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function ExpenseForm({
  meId,
  coId,
  nameOf,
  onSave,
  onCancel,
}: {
  meId: string;
  coId: string;
  nameOf: (id: string) => string;
  onSave: (es: Omit<Expense, "id">[]) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(meId);
  const [splitPct, setSplitPct] = useState(50);
  const [category, setCategory] = useState("Activities");
  const [receiptName, setReceiptName] = useState("");
  const [repeatMonths, setRepeatMonths] = useState(1);

  function submit() {
    const amt = parseFloat(amount);
    if (!description.trim() || !amt || amt <= 0) return;
    const base: Omit<Expense, "id"> = {
      description: description.trim(),
      amount: amt,
      paidById,
      splitOtherShare: splitPct / 100,
      date: new Date().toISOString(),
      category,
      receiptName: receiptName || undefined,
      status: paidById === meId ? "reimbursement-requested" : "open",
    };
    onSave(expandRecurringExpense(base, repeatMonths));
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field field-wide">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Leo — Soccer cleats" autoFocus />
        </label>
        <label className="field">
          <span>Amount (total)</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <label className="field">
          <span>Paid by</span>
          <select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
            <option value={meId}>You</option>
            <option value={coId}>{nameOf(coId)}</option>
          </select>
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {["Activities", "Medical", "School", "Clothing", "Childcare", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Other parent pays: {splitPct}%</span>
          <input type="range" min="0" max="100" step="5" value={splitPct} onChange={(e) => setSplitPct(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Repeat monthly</span>
          <select value={repeatMonths} onChange={(e) => setRepeatMonths(Number(e.target.value))}>
            <option value={1}>One-time</option>
            {[2, 3, 6, 12].map((n) => (
              <option key={n} value={n}>{n} months</option>
            ))}
          </select>
        </label>
        <label className="field field-wide">
          <span>Receipt (optional)</span>
          <input
            type="file"
            onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={submit}>
          {repeatMonths > 1 ? `Save ${repeatMonths} monthly expenses` : "Save expense"}
        </button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
