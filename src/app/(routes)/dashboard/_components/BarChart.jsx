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
    ? budgetList.map((item) => {
        const totalSpend = Number(item.totalSpend) || 0;
        const amount = Number(item.amount) || 0;
        return {
          name: item.name,
          totalSpend: totalSpend,
          remaining: Math.max(0, amount - totalSpend),
        };
      })
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
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xl text-gray-400 font-medium">
            No Activity as of now.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Bar dataKey="totalSpend" stackId="a" name="Spent" fill="#4845d2" radius={[0, 0, 0, 0]} />
              <Bar dataKey="remaining" stackId="a" name="Remaining" fill="#c3c2ff" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default BarChart;
