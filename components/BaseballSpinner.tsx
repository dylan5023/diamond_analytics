export default function BaseballSpinner({ size = 64, label = 'Loading…' }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <img
        src="/baseball.png"
        alt="loading"
        width={size}
        height={size}
        style={{ animation: 'spin 1s linear infinite' }}
      />
      {label && <p className="text-sm font-medium text-slate-400">{label}</p>}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
