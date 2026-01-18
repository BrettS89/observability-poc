export const styles = {
  page: { display: "flex", margin: 30 },
  charts: { display: "flex", flexDirection: "column" as const, width: "100%", gap: 16 },
  chartRow: { display: "flex", width: "100%", gap: 16 },

  chart: {
    background: "#151820",
    flex: 1,
    minWidth: 0,
    height: 260,
    borderRadius: 5,
    padding: 16,
    boxSizing: "border-box" as const,
    border: "1px solid #25272F",
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: 'rgba(255, 255, 255, 0.88)',
  /* optional but very nice */
  textTransform: 'none',
},
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 13,
    opacity: 0.9
  },
  chartMeta: { fontSize: 12, opacity: 0.6 },
  chartBody: { height: "calc(100% - 24px)" },

  error: { fontSize: 12, opacity: 0.8 },
};