import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export default function Chart({ expenses, getCatLabel }) {
  const dataMap = {};

  expenses.forEach((e) => {
    if (!dataMap[e.cat]) {
      dataMap[e.cat] = 0;
    }
    dataMap[e.cat] += e.amt;
  });

  const data = Object.keys(dataMap).map((key) => ({
    name: getCatLabel ? getCatLabel(key) : key,
    value: dataMap[key]
  }));

  return (
    <PieChart width={300} height={300}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={100}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
