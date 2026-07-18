"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, AlertTriangle, Award } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import AnimatedTargetProgress from "@/components/AnimatedTargetProgress";

interface ProductTarget {
  category: 'laptops' | 'desktops' | 'aios' | 'accessories';
  targetValue: number;
  currentValue: number;
  progressPercentage?: number;
  isCompleted?: boolean;
}

interface TargetData {
  _id: string;
  targetType: string;
  targetValue?: number;
  currentValue?: number;
  productTargets?: ProductTarget[];
  incentiveAmount?: number;
  incentiveStatus?: 'pending' | 'paid' | 'cancelled';
  incentivePaidDate?: string | null;
  period: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function MyTargetsPage() {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPendingIncentives, setTotalPendingIncentives] = useState(0);

  useEffect(() => {
    fetchMyTargets();
  }, []);

  const fetchMyTargets = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/targets/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('API Response:', data);
      const fetchedTargets = data.targets || [];
      console.log('Fetched Targets:', fetchedTargets);
      
      setTargets(fetchedTargets);
      
      const pendingIncentives = fetchedTargets
        .filter((t: TargetData) => t.incentiveStatus === 'pending' && t.incentiveAmount)
        .reduce((sum: number, t: TargetData) => sum + (t.incentiveAmount || 0), 0);
      setTotalPendingIncentives(pendingIncentives);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetTypeDisplay = (type: string) => {
    switch (type) {
      case 'sales': return 'Sales';
      case 'billing_count': return 'Billing Count';
      case 'billing_amount': return 'Billing Amount';
      case 'product_based': return 'Product-Based';
      default: return type.replace('_', ' ');
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatTargetValue = (value: number, type: string) => {
    if (type === 'billing_amount') return `₹${value.toLocaleString()}`;
    return `${value} units`;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMotivationalMessage = (target: TargetData) => {
    let progress = 0;
    if (target.targetType === 'product_based' && target.productTargets) {
      const totalProgress = target.productTargets.reduce((sum, pt) => sum + (pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue)), 0);
      progress = totalProgress / target.productTargets.length;
    } else {
      progress = getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
    }

    if (progress >= 80) return target.incentiveAmount ? `Almost there! ₹${target.incentiveAmount.toLocaleString()} awaits! 🔥` : "Almost there! Final push! 🔥";
    if (progress >= 50) return "Halfway there! Keep the momentum! 🚀";
    if (progress >= 25) return target.incentiveAmount ? `₹${target.incentiveAmount.toLocaleString()} is yours to win! 💰` : "Keep pushing forward! 💪";
    return "Start strong, finish stronger! 🎯";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'overdue': return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  const getProgressColor = (percentage: number, status: string) => {
    if (status === 'completed') return 'bg-emerald-600';
    if (status === 'overdue') return 'bg-rose-600';
    if (percentage < 50) return 'bg-rose-600';
    if (percentage < 80) return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center">Loading targets...</div>
        </div>
      </AdminLayout>
    );
  }

  const activeTargets = targets.filter(t => t.status === 'active').length;
  const completedTargets = targets.filter(t => t.status === 'completed').length;

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Performance Targets</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Total Targets</div>
              <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{targets.length}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Active</div>
              <div className="text-2xl sm:text-3xl font-semibold text-amber-600">{activeTargets}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Completed</div>
              <div className="text-2xl sm:text-3xl font-semibold text-emerald-600">{completedTargets}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Pending Incentives</div>
              <div className="text-2xl sm:text-3xl font-semibold text-blue-600">₹{totalPendingIncentives.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {targets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No targets assigned yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => {
              const overallProgress = target.targetType === 'product_based' && target.productTargets
                ? target.productTargets.reduce((sum, pt) => sum + (pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue)), 0) / target.productTargets.length
                : getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
              
              return (
              <Card key={target._id} className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{getTargetTypeDisplay(target.targetType)}</h3>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${getStatusColor(target.status)}`}>
                          {target.status.charAt(0).toUpperCase() + target.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500">{formatDate(target.startDate)} - {formatDate(target.endDate)} • {target.period.charAt(0).toUpperCase() + target.period.slice(1)}</p>
                    </div>
                    {target.incentiveAmount && target.incentiveAmount > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-600">Incentive</p>
                          <p className="text-base sm:text-lg font-semibold text-emerald-700">₹{target.incentiveAmount.toLocaleString()}</p>
                        </div>
                        {target.incentiveStatus && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            target.incentiveStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            target.incentiveStatus === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {target.incentiveStatus.charAt(0).toUpperCase() + target.incentiveStatus.slice(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {target.targetType === 'product_based' && target.productTargets ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                      {target.productTargets.map((pt) => {
                        const progress = pt.progressPercentage ?? getProgressPercentage(pt.currentValue, pt.targetValue);
                        return (
                        <div key={pt.category} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">{pt.category}</p>
                          <AnimatedTargetProgress
                            initialValue={0}
                            currentValue={pt.currentValue}
                            targetValue={pt.targetValue}
                            status={target.status}
                          />
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg font-bold text-gray-900">{pt.currentValue}</span>
                            <span className="text-xs text-gray-500">/ {pt.targetValue}</span>
                            <span className="ml-auto text-[10px] text-gray-600">{progress.toFixed(0)}%</span>
                          </div>
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div className="mb-5">
                      <AnimatedTargetProgress
                        initialValue={0}
                        currentValue={target.currentValue || 0}
                        targetValue={target.targetValue || 1}
                        status={target.status}
                      />
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl sm:text-3xl font-semibold text-gray-900">{formatTargetValue(target.currentValue || 0, target.targetType)}</span>
                        <span className="text-sm text-gray-500">of {formatTargetValue(target.targetValue || 0, target.targetType)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Progress</p>
                        <p className={`text-lg font-semibold ${
                          overallProgress >= 80 ? 'text-emerald-600' :
                          overallProgress >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>{overallProgress.toFixed(1)}%</p>
                      </div>
                      <div className="h-10 w-px bg-gray-200" />
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Time Remaining</p>
                        <p className="text-sm font-medium text-gray-700">
                          {getDaysRemaining(target.endDate) > 0 ? `${getDaysRemaining(target.endDate)} days` : `Overdue by ${Math.abs(getDaysRemaining(target.endDate))} days`}
                        </p>
                      </div>
                    </div>
                    {target.status === 'active' && (
                      <div className="text-sm font-medium text-blue-600">
                        {getMotivationalMessage(target)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
