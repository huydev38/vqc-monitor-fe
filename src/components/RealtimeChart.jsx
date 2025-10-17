import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Customized,
} from "recharts"

const MinMaxArea = ({ formattedGraphicalItems, xAxisMap, yAxisMap, data, color }) => {
  if (!data || data.length === 0 || !xAxisMap || !yAxisMap) return null

  // Get the scales from the axis maps
  const xAxisId = Object.keys(xAxisMap)[0]
  const yAxisId = Object.keys(yAxisMap)[0]
  const xScale = xAxisMap[xAxisId]?.scale
  const yScale = yAxisMap[yAxisId]?.scale

  if (!xScale || !yScale) return null

  const points = data
    .map((d) => {
      const x = xScale(d.time)
      const yMin = yScale(d.min)
      const yMax = yScale(d.max)
      return { x, yMin, yMax }
    })
    .filter((p) => !isNaN(p.x) && !isNaN(p.yMin) && !isNaN(p.yMax))

  if (points.length === 0) return null

  // Create path for the shaded area between min and max
  let pathData = `M ${points[0].x},${points[0].yMax}`

  // Draw top line (max values)
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x},${points[i].yMax}`
  }

  // Draw bottom line (min values) in reverse
  for (let i = points.length - 1; i >= 0; i--) {
    pathData += ` L ${points[i].x},${points[i].yMin}`
  }

  pathData += " Z"

  return <path d={pathData} fill={color} fillOpacity={0.2} />
}

export default function RealtimeChart({
  title,
  data,
  dataKey,
  dataKeys,
  color,
  colors,
  unit,
  legend,
  showMinMax = false,
}) {
  const isMultiLine = Array.isArray(dataKeys)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">Waiting for data...</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {showMinMax && !isMultiLine ? (
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "currentColor", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                label={{ value: unit, angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0)",
                  border: "1px solid #c3c3c4ff",
                  borderRadius: "0.5rem",
                }}
                // labelStyle={{ color: "#111827" }}
                formatter={(value, name) => {
                  if (name === "Min") return [Number(value).toFixed(2), "Min"]
                  if (name === "Max") return [Number(value).toFixed(2), "Max"]
                  return [Number(value).toFixed(2), "Average"]
                }}
              />

              <Customized component={(props) => <MinMaxArea {...props} data={data} color={color} />} />

              <Line type="monotone" dataKey="min" name="Min" stroke="none" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="max" name="Max" stroke="none" dot={false} isAnimationActive={false} />

              <Line
                type="monotone"
                dataKey={dataKey}
                name="Average"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "currentColor", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                label={{ value: unit, angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
                // labelStyle={{ color: "#111827" }}
              />
              {isMultiLine && <Legend />}
              {isMultiLine ? (
                dataKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index]}
                    strokeWidth={2}
                    dot={false}
                    name={legend ? legend[index] : key}
                    isAnimationActive={false}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
