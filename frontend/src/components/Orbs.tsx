// Two very slow, blurred orbs drifting behind everything — the calm sky feeling.
export function Orbs() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="orb animate-drift-a"
        style={{
          width: 520,
          height: 520,
          top: "-8%",
          left: "-6%",
          background:
            "radial-gradient(circle at 30% 30%, #bcd6ff 0%, rgba(188,214,255,0) 70%)",
        }}
      />
      <div
        className="orb animate-drift-b"
        style={{
          width: 460,
          height: 460,
          bottom: "-10%",
          right: "-8%",
          background:
            "radial-gradient(circle at 60% 40%, #d8e4ff 0%, rgba(216,228,255,0) 70%)",
        }}
      />
      <div
        className="orb animate-drift-a"
        style={{
          width: 360,
          height: 360,
          top: "40%",
          right: "18%",
          opacity: 0.35,
          background:
            "radial-gradient(circle at 50% 50%, #e7f0ff 0%, rgba(231,240,255,0) 70%)",
        }}
      />
    </div>
  );
}
