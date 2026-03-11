// src/components/vault/VaultFooter.tsx
export function VaultFooter() {
  return (
    <div
      className="flex-shrink-0"
      style={{ borderTop: "1px solid #111", padding: "18px 40px 22px" }}
    >
      <div className="max-w-[860px] mx-auto flex items-baseline justify-between gap-6">
        <p className="text-[12px] leading-[1.7] tracking-[0.02em]" style={{ color: "#555" }}>
          <strong style={{ color: "#888", fontWeight: 600 }}>Members-only drum breaks</strong>{" "}
          added to the vault on a rolling basis.
          <br />Every break is yours to keep forever once collected.
        </p>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap flex-shrink-0"
          style={{ color: "#444" }}
        >
          Updated regularly
        </span>
      </div>
    </div>
  );
}
