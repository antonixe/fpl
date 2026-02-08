import { ImageResponse } from "next/og";

export const alt = "FPLGRID — Data-Driven FPL Analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)",
          fontFamily: "monospace",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "#D45A00",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(212,90,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,90,0,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 0,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: -3,
            }}
          >
            FPL
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#D45A00",
              letterSpacing: -3,
            }}
          >
            GRID
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 24,
            color: "#A3A3A3",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginTop: 0,
          }}
        >
          Data-Driven FPL Analysis
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {["Players", "Fixtures", "Live", "Optimizer"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#737373",
                fontSize: 16,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
