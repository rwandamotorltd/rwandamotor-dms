import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          borderRadius: 102,
        }}
      >
        <svg width="300" height="300" viewBox="0 0 24 24" fill="white">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
