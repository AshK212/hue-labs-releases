// The signature ambient background: three slow, soft aurora lights in the brand
// palette (sky, iris, a whisper of aqua). Fixed behind everything, very subtle,
// never distracting. This is the calm "atmosphere" that ties every screen together.
export function Aurora() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      {/* Faint signature dot mesh, fading in from the top for gentle texture. */}
      <div
        className="absolute inset-0 pattern-dots"
        style={{
          opacity: 0.5,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <div
        className="orb animate-aurora-a"
        style={{
          width: 620,
          height: 620,
          top: "-16%",
          right: "-8%",
          background: "radial-gradient(circle at 50% 50%, rgba(139,132,242,0.42) 0%, rgba(139,132,242,0) 70%)",
        }}
      />
      <div
        className="orb animate-aurora-b"
        style={{
          width: 560,
          height: 560,
          bottom: "-18%",
          left: "-10%",
          background: "radial-gradient(circle at 50% 50%, rgba(122,156,226,0.38) 0%, rgba(122,156,226,0) 70%)",
        }}
      />
      <div
        className="orb animate-aurora-a"
        style={{
          width: 380,
          height: 380,
          top: "46%",
          left: "56%",
          animationDelay: "6s",
          background: "radial-gradient(circle at 50% 50%, rgba(95,208,224,0.26) 0%, rgba(95,208,224,0) 70%)",
        }}
      />
    </div>
  );
}
