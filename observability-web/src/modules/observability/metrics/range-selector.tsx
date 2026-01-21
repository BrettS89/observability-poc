import { Box, Button } from "@mui/joy";

type Range = "15m" | "1h" | "24h" | "7d";

export function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (v: Range) => void;
}) {
  const ranges: Range[] = ["15m", "1h", "24h", "7d"];

  return (
    <Box
      sx={{
        display: "inline-flex",        // ✅ won't take full width
        alignItems: "center",
        gap: 0.75,
        p: 0.5,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",

        // ✅ kill Joy focus ring only inside this component
        "--Button-ring": "0px",
        "--Button-ringOffset": "0px",
      }}
    >
      {ranges.map((r) => {
        const active = r === value;

        return (
          <Button
            key={r}
            onClick={() => onChange(r)}
            variant={active ? "solid" : "plain"}
            color={active ? "neutral" : "neutral"}
            sx={{
              borderRadius: 999,        // ✅ every button rounded
              px: 1.6,
              py: 0.6,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.65)",
              backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",

              "&:hover": {
                backgroundColor: active
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.06)",
              },

              // ✅ remove any remaining focus styling
              outline: "none",
              boxShadow: "none",
              "&:focus": { outline: "none", boxShadow: "none" },
              "&:focus-visible": { outline: "none", boxShadow: "none" },
              "&:active": { boxShadow: "none" },
            }}
          >
            {r}
          </Button>
        );
      })}
    </Box>
  );
}