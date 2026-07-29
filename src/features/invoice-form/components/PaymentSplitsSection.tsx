import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface PaymentSplitsSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  handlePaymentModeChange: (mode: string, checked: boolean) => void;
  handlePaymentAmountChange: (mode: string, amount: string) => void;
  paymentModeTotal: number;
}

export const PaymentSplitsSection = memo(function PaymentSplitsSection({
  formData,
  setFormData,
  handlePaymentModeChange,
  handlePaymentAmountChange,
  paymentModeTotal
}: PaymentSplitsSectionProps) {
  return (
    <section className="p-6 border border-gray-200 dark:border-slate-800 rounded-lg shadow bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Split Payment Modes</h2>
        <div className="text-right">
          <span className="text-sm text-gray-500 dark:text-slate-400 mr-2">Payment Total:</span>
          <span className="text-base font-bold text-blue-600 dark:text-blue-400">₹{paymentModeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(formData._paymentModes).map(([mode, data]: [string, any]) => {
          const showError = data.selected && (
            mode === 'Bajaj Finance'
              ? (!('loanAmount' in data) || !data.loanAmount || isNaN(Number(data.loanAmount)) || Number(data.loanAmount) <= 0)
              : (!('amount' in data) || !data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0)
          );
          
          return (
            <div
              key={mode}
              className={`flex flex-col border rounded-md p-3 shadow-sm transition-all bg-white dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800 ${data.selected ? 'border-blue-500 ring-1 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-slate-700'} ${showError ? 'border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/40' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={data.selected}
                  onChange={(e) => handlePaymentModeChange(mode, e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                  id={`pmode-${mode}`}
                />
                <Label htmlFor={`pmode-${mode}`} className="font-medium text-gray-800 dark:text-slate-200 text-sm cursor-pointer">
                  {mode}
                </Label>
              </div>

              {data.selected && (
                <div className="flex flex-col gap-2">
                  {mode !== 'Bajaj Finance' && (
                    <>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={('amount' in data) ? data.amount : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handlePaymentAmountChange(mode, value);
                          }
                        }}
                        min="0"
                        step="0.01"
                        className={`text-sm ${showError ? 'border-red-400 focus:ring-red-300' : ''}`}
                      />
                      {showError && (
                        <span className="text-xs text-red-500">Enter a valid amount</span>
                      )}
                    </>
                  )}

                  {/* Bank specific fields */}
                  {mode === 'Bank' && (
                    <>
                      <Select
                        value={('bankType' in data) ? data.bankType : ''}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                bankType: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select bank type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEFT">NEFT</SelectItem>
                          <SelectItem value="RTGS">RTGS</SelectItem>
                          <SelectItem value="IMPS">IMPS</SelectItem>
                          <SelectItem value="Net Banking">Net Banking</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                      {('bankType' in data) && data.bankType === 'Net Banking' && (
                        <Input
                          placeholder="UTR Number"
                          value={('utrNumber' in data) ? data.utrNumber : ''}
                          onChange={(e) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              _paymentModes: {
                                ...prev._paymentModes,
                                [mode]: {
                                  ...prev._paymentModes[mode],
                                  utrNumber: e.target.value
                                }
                              }
                            }));
                          }}
                          className="text-sm"
                        />
                      )}
                      {('bankType' in data) && data.bankType === 'Cheque' && (
                        <Input
                          placeholder="Cheque Number"
                          value={('chequeNumber' in data) ? data.chequeNumber : ''}
                          onChange={(e) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              _paymentModes: {
                                ...prev._paymentModes,
                                [mode]: {
                                  ...prev._paymentModes[mode],
                                  chequeNumber: e.target.value
                                }
                              }
                            }));
                          }}
                          className="text-sm"
                        />
                      )}
                    </>
                  )}

                  {/* UPI specific fields */}
                  {mode === 'UPI' && (
                    <>
                      <Select
                        value={('upiProvider' in data) ? data.upiProvider : 'PhonePe'}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                upiProvider: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="UPI Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PhonePe">PhonePe</SelectItem>
                          <SelectItem value="GooglePay">GooglePay</SelectItem>
                          <SelectItem value="Paytm">Paytm</SelectItem>
                          <SelectItem value="BHIM">BHIM</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Transaction ID"
                        value={('upiTransactionId' in data) ? data.upiTransactionId : ''}
                        onChange={(e) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                upiTransactionId: e.target.value
                              }
                            }
                          }));
                        }}
                        className="text-sm"
                      />
                    </>
                  )}

                  {/* Machine card fields */}
                  {mode === 'Machine' && (
                    <>
                      <Select
                        value={('machineProvider' in data) ? data.machineProvider : ''}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineProvider: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pinelabs">Pinelabs</SelectItem>
                          <SelectItem value="Paytm">Paytm</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={('machineCardType' in data) ? data.machineCardType : ''}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineCardType: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Debit Card">Debit Card</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Last 4 digits of card"
                        value={('machineCardLast4Digits' in data) ? data.machineCardLast4Digits : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineCardLast4Digits: value
                              }
                            }
                          }));
                        }}
                        maxLength={4}
                        className="text-sm"
                      />
                      <Select
                        value={('machineIdProofType' in data) ? data.machineIdProofType : ''}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineIdProofType: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select ID proof" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                          <SelectItem value="PAN">PAN</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={('machineIdProofType' in data) && data.machineIdProofType === 'Aadhaar' ? 'Enter 12-digit Aadhaar' : ('machineIdProofType' in data) && data.machineIdProofType === 'PAN' ? 'Enter 10-character PAN' : 'ID proof number'}
                        value={('machineIdProofNumber' in data) ? data.machineIdProofNumber : ''}
                        onChange={(e) => {
                          const idProofType = ('machineIdProofType' in data) ? data.machineIdProofType : '';
                          let value = e.target.value;
                          if (idProofType === 'Aadhaar') {
                            value = value.replace(/\D/g, '').slice(0, 12);
                          } else if (idProofType === 'PAN') {
                            value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                          }
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineIdProofNumber: value
                              }
                            }
                          }));
                        }}
                        maxLength={('machineIdProofType' in data) && data.machineIdProofType === 'Aadhaar' ? 12 : ('machineIdProofType' in data) && data.machineIdProofType === 'PAN' ? 10 : undefined}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Transaction ID"
                        value={('machineTransactionId' in data) ? data.machineTransactionId : ''}
                        onChange={(e) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                machineTransactionId: e.target.value
                              }
                            }
                          }));
                        }}
                        className="text-sm"
                      />
                    </>
                  )}

                  {/* Bajaj Finance Specific */}
                  {mode === 'Bajaj Finance' && (
                    <>
                      <Input
                        type="number"
                        placeholder="Loan Amount"
                        value={('loanAmount' in data) ? data.loanAmount : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setFormData((prev: any) => ({
                              ...prev,
                              _paymentModes: {
                                ...prev._paymentModes,
                                [mode]: {
                                  ...prev._paymentModes[mode],
                                  loanAmount: value,
                                  amount: value
                                }
                              }
                            }));
                          }
                        }}
                        min="0"
                        step="0.01"
                        className="text-sm"
                      />
                      {('loanAmount' in data) && (!data.loanAmount || parseFloat(data.loanAmount) <= 0) && (
                        <span className="text-xs text-red-500">Enter a valid loan amount</span>
                      )}
                      <Input
                        placeholder="Loan ID"
                        value={('loanId' in data) ? data.loanId : ''}
                        onChange={(e) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                loanId: e.target.value
                              }
                            }
                          }));
                        }}
                        className="text-sm"
                      />
                    </>
                  )}

                  {/* Brand Order Specific */}
                  {mode === 'Brand Order' && (
                    <>
                      <Select
                        value={('brandOrderType' in data) ? data.brandOrderType : ''}
                        onValueChange={(value) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            _paymentModes: {
                              ...prev._paymentModes,
                              [mode]: {
                                ...prev._paymentModes[mode],
                                brandOrderType: value
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Brand order type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lenovo OMO">Lenovo OMO</SelectItem>
                          <SelectItem value="Asus Eshop">Asus Eshop</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});
