// Lazy load heavy libraries to improve initial load time

export const loadJsPDF = async () => {
  const jsPDF = await import('jspdf');
  return jsPDF.default || jsPDF;
};

export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

export const loadQRCode = async () => {
  const QRCode = await import('qrcode');
  return QRCode.default || QRCode;
};
