import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CustomerInformationSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  gstVerifying: boolean;
  verifyGST: (gstNumber: string) => Promise<void>;
  emailError: string;
  validateEmail: (email: string) => boolean;
}

export const CustomerInformationSection = memo(function CustomerInformationSection({
  formData,
  setFormData,
  gstVerifying,
  verifyGST,
  emailError,
  validateEmail
}: CustomerInformationSectionProps) {
  return (
    <section className="p-6 border rounded-lg shadow bg-white">
      <h2 className="text-lg font-bold mb-4 text-gray-800">Customer Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1 flex items-center gap-2">GST Number
            {gstVerifying && <span className="ml-2 text-xs text-blue-600">Verifying...</span>}
          </Label>
          <div className="relative">
            <Input
              placeholder="Enter 15-digit GST number"
              value={formData.gstNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                setFormData({ ...formData, gstNumber: value });
                if (value === '') {
                  setFormData((prev: any) => ({
                    ...prev,
                    customerName: '',
                    address: '',
                    pinCode: ''
                  }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value.length === 15) {
                  verifyGST(value);
                }
              }}
              maxLength={15}
              disabled={gstVerifying}
            />
            {gstVerifying && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-fills company name and pincode on verification</p>
        </div>
        <div>
          <Label className="mb-1">Billing Name <span className="text-red-500">*</span></Label>
          <Input
            placeholder="Enter customer name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label className="mb-1">Address</Label>
          <Input
            placeholder="Enter address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1">Pin Code</Label>
          <Input
            placeholder="Enter pin code (6 digits)"
            value={formData.pinCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setFormData({ ...formData, pinCode: value });
            }}
            maxLength={6}
          />
        </div>
        <div>
          <Label className="mb-1">Contact Person</Label>
          <Input
            placeholder="Contact person"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1">Email <span className="text-red-500">*</span></Label>
          <Input
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              validateEmail(e.target.value);
            }}
            className={emailError ? 'border-red-500' : ''}
            required
          />
          {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
          )}
        </div>
      </div>
    </section>
  );
});
