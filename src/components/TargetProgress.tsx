"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Target, TrendingUp } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface ProductTarget {
  category: 'laptops' | 'desktops' | 'aios' | 'accessories';
  targetValue: number;
  currentValue: number;
  progressPercentage?: number;
  isCompleted?: boolean;
}

interface Target {
  _id: string;
  targetType: string;
  targetValue?: number;
  currentValue?: number;
  productTargets?: ProductTarget[];
  incentiveAmount?: number;
  incentiveStatus?: 'pending' | 'paid' | 'cancelled';
  period: string;
  endDate: string;
  status: string;
}

interface TargetProgressProps {
  userId?: string;
}

export default function TargetProgress({ userId }: TargetProgressProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserTargets();
  }, [userId]);

  const fetchUserTargets = async () => {
    console.log('TargetProgress: Fetching user targets, userId:', userId);
    try {
      let url;
      if (userId) {
        // Admin viewing specific user's targets
        url = `${getApiUrl()}/api/targets/user/${userId}`;
      } else {
        // Current user viewing their own targets - get user ID from localStorage
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) {
          console.error('TargetProgress: No user ID found in localStorage');
          setIsLoading(false);
          return;
        }
        url = `${getApiUrl()}/api/targets/user/${currentUserId}`;
      }
      
      console.log('TargetProgress: API URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      console.log('TargetProgress: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('TargetProgress: Response data:', data);
        setTargets(data.targets || data || []);
      } else {
        console.error('TargetProgress: Failed to fetch targets:', response.status);
      }
    } catch (error) {
      console.error('TargetProgress: Error fetching targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatTargetValue = (value: number, type: string) => {
    if (type.toLowerCase().includes('revenue')) {
      return `₹${value.toLocaleString()}`;
    }
    if (type.toLowerCase().includes('pieces') || type.toLowerCase().includes('sold')) {
      return `${value} units`;
    }
    return value.toString();
  };

  const getTargetTypeDisplay = (type: string) => {
    switch (type.toLowerCase()) {
      case 'total_revenue':
      case 'revenue':
      case 'billing_amount':
        return 'Total Revenue';
      case 'pieces_sold':
      case 'pieces':
      case 'billing_count':
        return 'Pieces Sold';
      case 'product_based':
        return 'Product-Based';
      default:
        return type.replace('_', ' ');
    }
  };

  const getPeriodDisplay = (period: string) => {
    switch (period.toLowerCase()) {
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return period;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'overdue': return 'text-red-600';
      case 'at_risk': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  const getProgressColor = (percentage: number, status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'overdue') return 'bg-red-500';
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            My Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading targets...</div>
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            My Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">No targets assigned</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          My Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {targets.map((target) => {
          const progress = target.targetType === 'product_based' ? 0 : getProgressPercentage(target.currentValue || 0, target.targetValue || 1);
          const daysRemaining = getDaysRemaining(target.endDate);
          
          return (
            <div key={target._id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{getTargetTypeDisplay(target.targetType)}</span>
                  {target.status === 'overdue' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${getStatusColor(target.status)}`}>
                  {target.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {target.targetType === 'product_based' && target.productTargets ? (
                <div className="space-y-3">
                  {target.productTargets.map((pt) => (
                    <div key={pt.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{pt.category}</span>
                        <span>{pt.currentValue} / {pt.targetValue} units</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getProgressColor(pt.progressPercentage || 0, target.status)}`}
                          style={{ width: `${pt.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {target.incentiveAmount && target.incentiveAmount > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Incentive:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-green-600">₹{target.incentiveAmount.toLocaleString()}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            target.incentiveStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            target.incentiveStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {target.incentiveStatus || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-500 pt-2">
                    <span>{getPeriodDisplay(target.period)} Target</span>
                    <span>
                      {daysRemaining > 0 
                        ? `${daysRemaining} days remaining`
                        : `${Math.abs(daysRemaining)} days overdue`
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress: {formatTargetValue(target.currentValue || 0, target.targetType)} / {formatTargetValue(target.targetValue || 0, target.targetType)}</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${getProgressColor(progress, target.status)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{getPeriodDisplay(target.period)} Target</span>
                    <span>
                      {daysRemaining > 0 
                        ? `${daysRemaining} days remaining`
                        : `${Math.abs(daysRemaining)} days overdue`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}