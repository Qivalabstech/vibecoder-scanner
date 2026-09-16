import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Hakscan — Security scans for AI-built apps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const jbmBold = readFile(join(process.cwd(), "src/app/fonts/jbm-bold.ttf"));
const jbmRegular = readFile(join(process.cwd(), "src/app/fonts/jbm-regular.ttf"));

export default async function Image() {
  const [bold, regular] = await Promise.all([jbmBold, jbmRegular]);

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
          background: "#0A0D0F",
        }}
      >
        <div style={{ display: "flex", fontSize: 128, fontFamily: "JBM Bold", letterSpacing: -2 }}>
          <span style={{ color: "#F5F7F6" }}>hak</span>
          <span style={{ color: "#00D9B5" }}>scan</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            fontFamily: "JBM Regular",
            color: "#8B9490",
          }}
        >
          Security scans for AI-built apps
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "JBM Bold", data: bold, style: "normal", weight: 700 },
        { name: "JBM Regular", data: regular, style: "normal", weight: 400 },
      ],
    }
  );
}
