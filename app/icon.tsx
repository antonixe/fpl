import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0D0D0D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
        }}
      >
        <span
          style={{
            color: "#FF8C42",
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "monospace",
            letterSpacing: -1,
          }}
        >
          F
        </span>
      </div>
    ),
    { ...size }
  );
}
