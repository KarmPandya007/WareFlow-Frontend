import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface GSTBillingSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  branches: any[];
  salesPersons: any[];
  matchingLedgers: any[];
  selectedLedgerId: string;
  setSelectedLedgerId: (id: string) => void;
  ledgers: any[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export const GSTBillingSection = memo(function GSTBillingSection({
  formData,
  setFormData,
  branches,
  salesPersons,
  matchingLedgers,
  selectedLedgerId,
  setSelectedLedgerId,
  ledgers,
  refreshing,
  onRefresh
}: GSTBillingSectionProps) {
  return (
    <section className="p-6 border rounded-lg shadow bg-white">
      <h2 className="text-lg font-bold mb-4 text-gray-800">GST Billing Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1">Mobile Number</Label>
          <Input
            type="tel"
            placeholder="Enter mobile number (10 digits)"
            value={formData.mobile}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setFormData({ ...formData, mobile: value });
            }}
            maxLength={10}
          />
        </div>

        <div>
          <Label className="mb-1">Ledger (by Mobile)</Label>
          <Select
            value={selectedLedgerId}
            onValueChange={v => {
              setSelectedLedgerId(v);
              const ledger = matchingLedgers.find((l: any) => (l._id || l.id) === v) || ledgers.find((l: any) => (l._id || l.id) === v);
              if (ledger) {
                setFormData((prev: any) => ({
                  ...prev,
                  companyName: ledger.name || prev.companyName,
                  gstNumber: ledger.gstNo || prev.gstNumber,
                  customerName: ledger.name || prev.customerName,
                  address: ledger.address || prev.address,
                  pinCode: ledger.pincode || prev.pinCode
                }));
              }
            }}
            disabled={matchingLedgers.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={matchingLedgers.length === 0 ? "No ledger found for this number" : "Select Ledger"} />
            </SelectTrigger>
            <SelectContent>
              {matchingLedgers.length === 0 ? (
                <SelectItem value="no-ledger" disabled>No ledger found for this number</SelectItem>
              ) : (
                matchingLedgers.map((ledger: any) => (
                  <SelectItem key={ledger._id || ledger.id} value={ledger._id || ledger.id}>
                    {ledger.name} ({ledger.phone})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Company Name</Label>
          <Input
            placeholder="Enter company name (optional)"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Branch <span className="text-red-500">*</span></Label>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`text-xs underline flex items-center gap-1 cursor-pointer transition-colors ${refreshing ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
              title="Refresh branches list"
            >
              <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <Select value={formData.branch} onValueChange={(v: string) => setFormData({ ...formData, branch: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.length > 0
                ? branches.map(branch => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name || branch.branchName || ''}
                  </SelectItem>
                ))
                : <SelectItem value="no-branches" disabled>No branches available - Please add branches first</SelectItem>
              }
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Sales Type</Label>
          <Select value={formData.salesType} onValueChange={(v) => setFormData({ ...formData, salesType: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Sales Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Sales Person</Label>
          <Select value={formData.salesPerson} onValueChange={(v) => setFormData({ ...formData, salesPerson: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Sales Person" />
            </SelectTrigger>
            <SelectContent>
              {salesPersons.length === 0 ? (
                <SelectItem value="no-salesperson" disabled>No sales persons available</SelectItem>
              ) : (
                salesPersons.map((person: any) => (
                  <SelectItem key={person._id || person.id} value={person._id || person.id}>
                    {((person.firstName || person.name) + (person.lastName ? ` ${person.lastName}` : '')).trim()}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Label className="mb-1">Date</Label>
          <Input
            type="date"
            value={formData.date}
            readOnly
            aria-disabled={true}
            title="Date is fixed"
          />
        </div>
      </div>
    </section>
  );
});
