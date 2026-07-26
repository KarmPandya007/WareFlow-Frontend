import { memo } from 'react';
import { SiGoogledocs } from 'react-icons/si';
import { FaSackDollar } from 'react-icons/fa6';

interface BillingStatsProps {
  stats: {
    totalBills: number;
    totalRevenue: number;
    todayBills: number;
    todayRevenue: number;
    monthRevenue: number;
  };
}

export const BillingStats = memo(function BillingStats({ stats }: BillingStatsProps) {
  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bills</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
              {stats.totalBills}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
            <SiGoogledocs className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
              {formatAmount(stats.totalRevenue)}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
            <FaSackDollar className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Bills</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 group-hover:text-violet-600 transition-colors">
              {stats.todayBills}
            </h3>
          </div>
          <div className="p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
            <SiGoogledocs className="w-5 h-5 text-violet-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 group-hover:text-emerald-600 transition-colors">
              {formatAmount(stats.todayRevenue)}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
            <FaSackDollar className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2 group-hover:text-orange-600 transition-colors">
              {formatAmount(stats.monthRevenue)}
            </h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
            <FaSackDollar className="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
});
