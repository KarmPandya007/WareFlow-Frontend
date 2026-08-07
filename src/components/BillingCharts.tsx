import { memo, useState } from 'react';
import BillingsPerDayChart from '@/components/BillingsPerDayChart';
import DevicesSoldChart from '@/components/DevicesSoldChart';
import { Building2, UserRound } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker, DateRangeValue } from '@/components/ui/date-range-picker';

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
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13);
    const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { from: format(start), to: format(today) };
  });

  return (
    <div className="mb-4 sm:mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-3 sm:p-6">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">
              Analytics
            </h3>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-950/60">
              {['Revenue', 'Devices sold'].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentChartIndex(index)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                    currentChartIndex === index
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950/50">
            {userRole === 'admin' && (
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:max-w-2xl">
                <div className="min-w-0 flex-1 space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Branch
                </label>
                <Select
                  value={selectedBranchForCharts}
                  onValueChange={setSelectedBranchForCharts}
                >
                  <SelectTrigger aria-label="Filter analytics by branch" className="h-11 bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((branch, index) => {
                      const branchId = branch._id || branch.id;
                      if (!branchId) return null;
                      return (
                        <SelectItem key={branchId || `branch-${index}`} value={String(branchId)}>
                          {branch.name || branch.branchName || 'Unnamed branch'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <UserRound className="h-3.5 w-3.5" />
                  Sales person
                </label>
                <Select
                  value={selectedSalesPersonForCharts}
                  onValueChange={setSelectedSalesPersonForCharts}
                >
                  <SelectTrigger aria-label="Filter analytics by sales person" className="h-11 bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select a sales person" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All sales persons</SelectItem>
                    {salesPersons.map((person, index) => {
                      const personId = person._id || person.id;
                      if (!personId) return null;
                      const personName = `${person.firstName || person.name || ''} ${person.lastName || ''}`.trim();
                      return (
                        <SelectItem key={personId || `sp-${index}`} value={String(personId)}>
                          {personName || 'Unnamed sales person'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                </div>
              </div>
            )}

            <div className="ml-auto w-full space-y-1.5 sm:w-auto">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 lg:justify-end">
                Date range
              </label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div key={currentChartIndex} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            {currentChartIndex === 0 ? (
              <BillingsPerDayChart 
                isAdmin={userRole === 'admin'} 
                userId={userRole !== 'admin' && typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined}
                branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
                dateRange={dateRange}
              />
            ) : (
              <DevicesSoldChart 
                isAdmin={userRole === 'admin'} 
                userId={userRole !== 'admin' && typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined}
                branchId={userRole === 'admin' && selectedBranchForCharts !== 'all' ? selectedBranchForCharts : undefined}
                salesPersonId={userRole === 'admin' && selectedSalesPersonForCharts !== 'all' ? selectedSalesPersonForCharts : undefined}
                dateRange={dateRange}
              />
            )}
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
