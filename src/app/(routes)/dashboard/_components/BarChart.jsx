import React from "react";
import { Triangle } from "react-loader-spinner";
import {
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

const BarChart = ({ budgetList }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const data = Array.isArray(budgetList)
    ? budgetList.map((item) => ({
        ...item,
        totalSpend: Number(item.totalSpend) || 0,
        amount: Number(item.amount) || 0,
      }))
    : [];

  if (!mounted) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <Triangle
          height="80"
          width="80"
          color="#4845d2"
          ariaLabel="triangle-loading"
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:p-4 min-h-[400px]">
      <div className="p-2 md:p-0">
        <h1 className="text-2xl font-semibold">Activity</h1>
      </div>
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          {data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-2xl font-semibold">
              No Activity as of now.
            </div>
          ) : (
            <RechartsBarChart data={data} margin={{ top: 14 }}>
              <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalSpend" stackId="a" name="Total Spend" fill="#4845d2" />
              <Bar dataKey="amount" stackId="a" name="Total Budget" fill="#c3c2ff" />
            </RechartsBarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
