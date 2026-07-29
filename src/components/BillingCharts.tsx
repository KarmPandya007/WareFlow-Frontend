import { memo } from 'react';
import BillingsPerDayChart from '@/components/BillingsPerDayChart';
import DevicesSoldChart from '@/components/DevicesSoldChart';

interface BillingChartsProps {
  userRole: string;
  branches: any[];
  salesPersons: any[];
  selectedBranchForCharts: string;
  setSelectedBranchForCharts: (val: string) => void;
  selectedSalesPersonForCharts: string;
  setSelectedSalesPersonForCharts: (val: string) => void;
  currentChartIndex: number;
  setCurrentChartIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const BillingCharts = memo(function BillingCharts({
  userRole,
  branches,
  salesPersons,
  selectedBranchForCharts,
  setSelectedBranchForCharts,
  selectedSalesPersonForCharts,
  setSelectedSalesPersonForCharts,
  currentChartIndex,
  setCurrentChartIndex
}: BillingChartsProps) {
  const chartsCount = 2;

  return (
    <div className="mb-4 sm:mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-3 sm:p-6">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">
              Analytics
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentChartIndex(prev => prev === 0 ? chartsCount - 1 : prev - 1)}
                className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Previous Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-500 dark:text-slate-400 min-w-[150px] text-center font-medium">
                {currentChartIndex === 0 ? 'Billings Per Day' : 'Devices Sold Per Day'}
              </span>
              <button
                onClick={() => setCurrentChartIndex(prev => prev === chartsCount - 1 ? 0 : prev + 1)}
                className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Next Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {userRole === 'admin' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">Branch:</label>
                <select
                  value={selectedBranchForCharts}
                  onChange={(e) => setSelectedBranchForCharts(e.target.value)}
                  className="w-40 sm:w-48 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="all">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name || branch.branchName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">Sales:</label>
                <select
                  value={selectedSalesPersonForCharts}
                  onChange={(e) => setSelectedSalesPersonForCharts(e.target.value)}
                  className="w-40 sm:w-48 px-2 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="all">All Sales Persons</option>
                  {salesPersons.map((person, index) => (
                    <option key={person._id || person.id || `sp-${index}`} value={person._id || person.id}>
                      {`${person.firstName || person.name} ${person.lastName || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentChartIndex * 100}%)` }}
          >
            <div className="w-full flex-shrink-0">
              <BillingsPerDayChart 
                isAdmin={userRole === 'admin'} 
                userId={userRole !== 'admin' && typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined}
                branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
              />
            </div>
            <div className="w-full flex-shrink-0">
              <DevicesSoldChart 
                isAdmin={userRole === 'admin'} 
                userId={userRole !== 'admin' && typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined}
                branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
              />
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-center mt-4 gap-2">
          {[...Array(chartsCount)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentChartIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentChartIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              title={`Go to chart ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
