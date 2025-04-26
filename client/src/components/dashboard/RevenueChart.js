import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const RevenueChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Bar dataKey="revenue" fill="#4f46e5" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
