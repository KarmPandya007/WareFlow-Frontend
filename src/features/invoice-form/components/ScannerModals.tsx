import { RefObject } from 'react';
import { Scan, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ScannerModalsProps {
  showSerialScanner: boolean;
  showCheckCodeScanner: boolean;
  showModelScanner: boolean;
  scannedValue: string;
  setScannedValue: (val: string) => void;
  closeExternalScanner: () => void;
  handleScannerKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleScannerInput: (val: string) => void;
  scannerInputRef: RefObject<HTMLInputElement | null>;
}

export function ScannerModals({
  showSerialScanner,
  showCheckCodeScanner,
  showModelScanner,
  scannedValue,
  setScannedValue,
  closeExternalScanner,
  handleScannerKeyPress,
  handleScannerInput,
  scannerInputRef
}: ScannerModalsProps) {
  if (!showSerialScanner && !showCheckCodeScanner && !showModelScanner) return null;

  return (
    <>
      {/* External Scanner Modal for Serial Number */}
      {showSerialScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scan className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Scan Serial Number</h3>
                </div>
                <button
                  onClick={closeExternalScanner}
                  className="text-white hover:text-gray-200 p-1 rounded transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <Label className="mb-2 text-sm font-medium text-gray-700">Serial Number</Label>
                <Input
                  ref={scannerInputRef}
                  type="text"
                  placeholder="Scan or enter serial number..."
                  value={scannedValue}
                  onChange={(e) => setScannedValue(e.target.value)}
                  onKeyDown={handleScannerKeyPress}
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Scan className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">Ready to Scan</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Use your external barcode/QR scanner</li>
                      <li>• Scan the code - it will auto-fill the field</li>
                      <li>• Press Enter or click Apply to confirm</li>
                      <li>• Or type manually and press Enter</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={closeExternalScanner}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleScannerInput(scannedValue)}
                  disabled={!scannedValue.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Scanner Modal for CHECK Code */}
      {showCheckCodeScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scan className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Scan CHECK Code</h3>
                </div>
                <button
                  onClick={closeExternalScanner}
                  className="text-white hover:text-gray-200 p-1 rounded transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <Label className="mb-2 text-sm font-medium text-gray-700">CHECK Code</Label>
                <Input
                  ref={scannerInputRef}
                  type="text"
                  placeholder="Scan or enter CHECK code..."
                  value={scannedValue}
                  onChange={(e) => setScannedValue(e.target.value)}
                  onKeyDown={handleScannerKeyPress}
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Scan className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Ready to Scan</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Use your external barcode/QR scanner</li>
                      <li>• Scan the code - it will auto-fill the field</li>
                      <li>• Press Enter or click Apply to confirm</li>
                      <li>• Or type manually and press Enter</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={closeExternalScanner}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleScannerInput(scannedValue)}
                  disabled={!scannedValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Scanner Modal for Model */}
      {showModelScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scan className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Scan Model</h3>
                </div>
                <button
                  onClick={closeExternalScanner}
                  className="text-white hover:text-gray-200 p-1 rounded transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <Label className="mb-2 text-sm font-medium text-gray-700">Model</Label>
                <Input
                  ref={scannerInputRef}
                  type="text"
                  placeholder="Scan or enter model..."
                  value={scannedValue}
                  onChange={(e) => setScannedValue(e.target.value)}
                  onKeyDown={handleScannerKeyPress}
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Scan className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Ready to Scan</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Use your external barcode/QR scanner</li>
                      <li>• Scan the code - it will auto-fill the field</li>
                      <li>• Press Enter or click Apply to confirm</li>
                      <li>• Or type manually and press Enter</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={closeExternalScanner}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleScannerInput(scannedValue)}
                  disabled={!scannedValue.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
