/* eslint-disable react-refresh/only-export-components -- Next.js image metadata is a required route export. */
import { ImageResponse } from "next/og";

export const alt =
  "SweepSign: clear customer handoffs for cleaning professionals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f4f2ea",
        color: "#14251f",
        padding: "64px",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "2px solid #c9d6ca",
          background: "#fffdf7",
          padding: "54px 60px",
          boxShadow: "18px 18px 0 #dfece2",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "#244e3d",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "12px",
                display: "flex",
                borderLeft: "5px solid #fffdf7",
                borderBottom: "5px solid #fffdf7",
                transform: "rotate(-45deg) translateY(-2px)",
              }}
            />
          </div>
          <div style={{ fontSize: "30px", fontWeight: 700 }}>SweepSign</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              maxWidth: "820px",
              fontFamily: "Georgia, serif",
              fontSize: "74px",
              lineHeight: 0.98,
              letterSpacing: "-3px",
            }}
          >
            Clean homes. Clear handoffs.
          </div>
          <div
            style={{ marginTop: "28px", fontSize: "28px", color: "#52685c" }}
          >
            A customer-ready finish for residential cleaning work.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
