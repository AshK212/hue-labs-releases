// Two slow, soft clouds of light, weighted to the right where the layout opens up.
// Quiet enough to feel like atmosphere, not decoration.
export function Orbs() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="orb animate-drift"
        style={{
          width: 560,
          height: 560,
          top: "-12%",
          right: "-6%",
          opacity: 0.5,
          background:
            "radial-gradient(circle at 50% 50%, #cfdcf6 0%, rgba(207,220,246,0) 70%)",
        }}
      />
      <div
        className="orb animate-drift-alt"
        style={{
          width: 420,
          height: 420,
          bottom: "-14%",
          right: "22%",
          opacity: 0.35,
          background:
            "radial-gradient(circle at 50% 50%, #e2e9f8 0%, rgba(226,233,248,0) 70%)",
        }}
      />
    </div>
  );
}
