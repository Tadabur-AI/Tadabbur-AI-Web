export default function LogoLandscape() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/images/product-logo.svg"
        alt=""
        width="36"
        height="36"
        loading="eager"
        fetchPriority="high"
        className="h-9 w-9 rounded-xl object-contain"
      />
      <span translate="no" className="text-sm font-semibold tracking-[0.02em] text-text sm:text-base">
        Tadabbur AI
      </span>
    </div>
  );
}
