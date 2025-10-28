export default function StatCard({ icon, label, value, color = "primary", isAlert = false }) {
  const cardColor = isAlert ? "danger" : "success"

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
      </div>
      <div className={`text-3xl font-bold text-${cardColor}`}>{value}</div>
    </div>
  )
}
