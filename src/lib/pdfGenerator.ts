import { jsPDF } from "jspdf";

const getSalesPersonName = (salesPerson: any) => {
  if (!salesPerson) return 'N/A';
  if (typeof salesPerson === 'string') return salesPerson;
  return `${salesPerson.firstName || ''} ${salesPerson.lastName || ''}`.trim() || 'N/A';
};

const formatDateDDMMYYYY = (dateString?: string) => {
  const d = dateString ? new Date(dateString) : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = d.toLocaleString('en-US', { month: 'short' });
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mmm}-${yy}`;
};

const resolveBranchKey = (record: any) => {
  if (!record) return null;
  if (record.branch && typeof record.branch === 'object') {
    return record.branch._id || record.branch.id || record.branch.name || record.branch.branchName || record.branch.code || record.branch;
  }
  if (record.branch) return record.branch;
  if (record.branchId && typeof record.branchId === 'object') {
    return record.branchId._id || record.branchId.id || record.branchId.name || record.branchId.branchName || record.branchId.code || record.branchId;
  }
  if (record.branchId) return record.branchId;
  if (record.branchName) return record.branchName;
  if (record.branchCode) return record.branchCode;
  return null;
};

const getProductsFromRecord = (record: any) => {
  if (!record) return [];
  if (Array.isArray(record.products) && record.products.length > 0) return record.products;
  if (Array.isArray(record.productDetails) && record.productDetails.length > 0) return record.productDetails;
  if (Array.isArray(record.product_details) && record.product_details.length > 0) return record.product_details;
  if (Array.isArray(record.items) && record.items.length > 0) return record.items;
  if (Array.isArray(record.productsList) && record.productsList.length > 0) return record.productsList;
  return [];
};

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const convert = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    let i = 0;
    while (n > 0) {
      if (n % 1000 !== 0) {
        result = convertLessThanThousand(n % 1000) + (thousands[i] ? ' ' + thousands[i] : '') + (result ? ' ' + result : '');
      }
      n = Math.floor(n / 1000);
      i++;
    }
    return result.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = 'INR ' + convert(rupees) + ' Only';
  if (paise > 0) {
    result = result.replace(' Only', '') + ' and ' + convert(paise) + ' Paise Only';
  }
  return result;
};

const formatPaymentMode = (input: any): string => {
  if (!input) return 'N/A';
  if (Array.isArray(input)) {
    const modes = input.map(payment => {
      if (payment.mode === 'Bank' && payment.bankType) return payment.bankType;
      if (payment.mode === 'UPI' && payment.upiProvider) return payment.upiProvider;
      if (payment.mode === 'Machine' && payment.machineProvider) return payment.machineProvider;
      return payment.mode || 'Unknown';
    });
    return modes.join(', ');
  }
  return String(input);
};

export const handleDownloadPdf = async (record: any, branches: any[] = []) => {
  const resolveBranchName = (branch: any) => {
    if (!branch) return 'Main Branch';
    if (typeof branch === 'string') {
      const found = branches.find(b => {
        if (!b) return false;
        if (b._id === branch || b.id === branch) return true;
        if (typeof b.name === 'string' && b.name === branch) return true;
        if (typeof b.code === 'string' && b.code === branch) return true;
        if (typeof b.name === 'string' && b.name.toLowerCase() === String(branch).toLowerCase()) return true;
        if (typeof b.code === 'string' && b.code.toLowerCase() === String(branch).toLowerCase()) return true;
        return false;
      });
      if (found) return found.name || found.branchName || found.code || branch;
      return 'Main Branch';
    }
    return branch.name || branch.code || branch.branchName || 'Main Branch';
  };

  const resolvePrice = (p: any) => {
    if (!p) return 0;
    if (typeof p === 'object') {
      const priceFields = ['supportedAmount', 'supportedamount', 'price', 'sellingPrice', 'srp', 'rate', 'amount', 'cost', 'value', 't2DBP'];
      for (const field of priceFields) {
        const value = p[field];
        if (value !== undefined && value !== null && !isNaN(Number(value))) {
          const numValue = Number(value);
          if (numValue > 0) return numValue;
        }
      }
    }
    return 0;
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = (doc as any).getWidth ? (doc as any).getWidth() : (doc as any).internal?.pageSize?.getWidth?.();
  const pageHeight = (doc as any).getHeight ? (doc as any).getHeight() : (doc as any).internal?.pageSize?.getHeight?.();
  
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 40;
  const marginBottom = 40;
  
  let currentY = marginTop;

  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', pageWidth / 2, currentY, { align: 'center' });
  
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(7);
  const recipientText = '(ORIGINAL FOR RECIPIENT)';
  doc.text(recipientText, pageWidth - marginRight - (doc as any).getTextWidth(recipientText), currentY);
  currentY += 18;

  const boxLeft = marginLeft;
  const boxRight = pageWidth - marginRight;
  const boxTop = currentY;
  const boxBottom = pageHeight - marginBottom;
  const boxWidth = boxRight - boxLeft;
  const boxHeight = boxBottom - boxTop;
  
  (doc as any).setLineWidth(1);
  (doc as any).rect(boxLeft, boxTop, boxWidth, boxHeight);

  const leftBoxWidth = boxWidth * 0.66;
  const rightBoxWidth = boxWidth * 0.34;
  const verticalDividerX = boxLeft + leftBoxWidth;

  (doc as any).setLineWidth(0.5);
  doc.line(verticalDividerX, boxTop, verticalDividerX, boxTop + 175);

  const leftTopHeight = 55;
  const leftTopBottom = boxTop + leftTopHeight;
  doc.line(boxLeft, leftTopBottom, verticalDividerX, leftTopBottom);

  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  let textY = boxTop + 10;
  doc.text('HARI PRIYA TECHNOLOGIES PRIVATE LIMITED', boxLeft + 3, textY);
  
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(7);
  textY += 8;
  doc.text('GF 13, BALAJI CENTRE, OPP GURUKUL ROAD,', boxLeft + 3, textY);
  textY += 7;
  doc.text('DRIVE IN ROAD, MEMNAGAR, AHMEDABAD', boxLeft + 3, textY);
  textY += 7;
  doc.text('-380052', boxLeft + 3, textY);
  textY += 8;
  doc.text('GSTIN/UIN: 24AAFCH6549H1ZG', boxLeft + 3, textY);
  textY += 7;
  doc.text('State Name : Gujarat, Code : 24', boxLeft + 3, textY);

  const leftBottomTop = leftTopBottom;
  const leftBottomHeight = 120;
  const leftBottomBottom = leftBottomTop + leftBottomHeight;

  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(8);
  let buyerY = leftBottomTop + 10;
  doc.text('Buyer (Bill to)', boxLeft + 3, buyerY);
  
  (doc as any).setFont(undefined, 'bold');
  buyerY += 10;
  doc.text(record.customerName || '', boxLeft + 3, buyerY);
  
  (doc as any).setFont(undefined, 'normal');
  buyerY += 8;
  const buyerAddr = record.address || record.customerAddress || '';
  if (buyerAddr) {
    const addrLines = (doc as any).splitTextToSize(buyerAddr, leftBoxWidth - 20);
    const linesToShow = addrLines.slice(0, 2);
    doc.text(linesToShow, boxLeft + 3, buyerY);
    buyerY += 8 * linesToShow.length;
  }
  
  buyerY += 7;
  doc.text(`State Name   : ${resolveBranchName(resolveBranchKey(record))}, Code : 24`, boxLeft + 3, buyerY);
  
  buyerY += 8;
  const mobileNumber = record.mobile || record.mobileNo || record.customerMobile || '';
  const otherContact = record.contact || record.customerContact || record.phone || '';
  const contactDisplay = mobileNumber && otherContact ? `${mobileNumber} / ${otherContact}` : (mobileNumber || otherContact || '');
  doc.text(`Contact      : ${contactDisplay}`, boxLeft + 3, buyerY);
  
  buyerY += 8;
  const emailInfo = record.email || record.customerEmail || '';
  doc.text(`E-Mail       : ${emailInfo}`, boxLeft + 3, buyerY);

  const rightColTop = boxTop;
  const rightColHeight = 175;
  const rightColLeft = verticalDividerX + 2;
  const rightColMiddle = verticalDividerX + (rightBoxWidth * 0.50);
  let gridY = rightColTop;
  
  (doc as any).setLineWidth(0.3);
  doc.line(rightColMiddle, rightColTop, rightColMiddle, rightColTop + rightColHeight);
  
  gridY += 9;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('Invoice No.', rightColLeft, gridY);
  doc.text('Dated', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 10;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  let branchCode = '';
  if (record.branch && typeof record.branch === 'object') {
    branchCode = record.branch.code || record.branch.branchCode || record.branch.name || 'BR';
  } else if (record.branchCode) {
    branchCode = record.branchCode;
  } else if (record.branchName) {
    branchCode = record.branchName;
  } else {
    branchCode = 'BR';
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `${branchCode}/2526/${randomNum}`;
  doc.text(invoiceNumber, rightColLeft, gridY);
  const invoiceDate = formatDateDDMMYYYY(record.date || record.createdAt);
  doc.text(invoiceDate, rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 9;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('Delivery Note', rightColLeft, gridY);
  doc.text('Mode/Terms of Payment', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 10;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text(formatPaymentMode(record.paymentMode) || 'N/A', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 9;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('Reference No. & Date.', rightColLeft, gridY);
  doc.text('Other References', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 10;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  const refDateText = invoiceDate;
  doc.text(refDateText, rightColLeft, gridY);
  doc.text(getSalesPersonName(record.salesPerson), rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 9;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text("Buyer's Order No.", rightColLeft, gridY);
  doc.text('Dated', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 12;
  doc.text('Dispatch Doc No.', rightColLeft, gridY);
  doc.text('Delivery Note Date', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 12;
  doc.text('Dispatched through', rightColLeft, gridY);
  doc.text('Destination', rightColMiddle + 2, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 10;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('Self', rightColLeft, gridY);
  gridY += 4;
  doc.line(verticalDividerX, gridY, boxRight, gridY);
  
  gridY += 9;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('Terms of Delivery', rightColLeft, gridY);

  const sectionsBottom = leftBottomBottom;
  doc.line(boxLeft, sectionsBottom, boxRight, sectionsBottom);

  const tableHeaderTop = sectionsBottom;
  const tableHeaderHeight = 28;
  const tableHeaderBottom = tableHeaderTop + tableHeaderHeight;

  const tableWidth = boxRight - boxLeft;
  const colDesc = boxLeft;
  const colDescWidth = tableWidth * 0.44;
  const colQty = colDesc + colDescWidth;
  const colQtyWidth = tableWidth * 0.09;
  const colRate1 = colQty + colQtyWidth;
  const colRate1Width = tableWidth * 0.1;
  const colRate2 = colRate1 + colRate1Width;
  const colRate2Width = tableWidth * 0.1;
  const colPer = colRate2 + colRate2Width;
  const colPerWidth = tableWidth * 0.07;
  const colAmount = colPer + colPerWidth;

  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  let headerY = tableHeaderTop + 10;
  doc.text('Description of Goods', colDesc + 5, headerY);
  doc.text('Quantity', colQty + 5, headerY);
  doc.text('Rate', colRate1 + 5, headerY);
  doc.text('Rate', colRate2 + 5, headerY);
  doc.text('per', colPer + 5, headerY);
  doc.text('Amount', boxRight - 10, headerY, { align: 'right' });
  headerY += 8;
  doc.text('(Incl. of Tax)', colRate1 + 5, headerY);

  doc.line(boxLeft, tableHeaderBottom, boxRight, tableHeaderBottom);

  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(8);
  let itemY = tableHeaderBottom + 10;
  
  const products = getProductsFromRecord(record) || [];
  let subTotal = 0;
  const maxItemY = boxBottom - 260;

  const addressLower = String(record.address || record.customerAddress || '').toLowerCase();
  const isGujarat = addressLower.includes('gujarat');

  products.forEach((p: any, idx: number) => {
    if (itemY > maxItemY) return;

    const name = typeof p === 'object' ? (p.name || p.model || p.productName || 'Item') : String(p || 'Item');
    const serial = p.serialNo || p.serialNumber || p.serial || '';
    const batch = p.batch || p.batchNo || '';
    const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
    const rateIncludingTax = resolvePrice(p) || 0;
    
    const cgstRate = 9;
    const sgstRate = 9;
    const igstRate = 18;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let rateExcludingTax = 0;
    
    if (isGujarat) {
      cgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
      sgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
      rateExcludingTax = Number((rateIncludingTax - cgstAmount - sgstAmount).toFixed(2));
    } else {
      igstAmount = Number((rateIncludingTax * 0.18).toFixed(2));
      rateExcludingTax = Number((rateIncludingTax - igstAmount).toFixed(2));
    }
    
    const amount = rateExcludingTax * qty;
    const roundOff = 0.00;
    subTotal += amount;

    const startY = itemY;
    
    (doc as any).setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text(name, colDesc + 5, itemY);
    itemY += 10;

    if (serial) {
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(`S/N: ${serial}`, colDesc + 5, itemY);
      itemY += 10;
    }

    if (batch && batch !== serial) {
      (doc as any).setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(batch, colDesc + 20, itemY);
      itemY += 10;
    }

    itemY += 2;

    (doc as any).setFont(undefined, 'normal');
    doc.setFontSize(7);
    const taxLabelX = colDesc + 135;
    const taxPercentX = colDesc + 195;
    const taxAmountX = colDesc + 225;
    
    if (isGujarat) {
      doc.text('OUTPUT CGST', taxLabelX, itemY);
      doc.text(`${cgstRate}%`, taxPercentX, itemY, { align: 'right' });
      doc.text(cgstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
      itemY += 8;

      doc.text('OUTPUT SGST', taxLabelX, itemY);
      doc.text(`${sgstRate}%`, taxPercentX, itemY, { align: 'right' });
      doc.text(sgstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
      itemY += 8;
    } else {
      doc.text('OUTPUT IGST', taxLabelX, itemY);
      doc.text(`${igstRate}%`, taxPercentX, itemY, { align: 'right' });
      doc.text(igstAmount.toFixed(2), taxAmountX, itemY, { align: 'right' });
      itemY += 8;
    }
    
    doc.text('ROUND OFF', taxLabelX, itemY);
    doc.text(`${roundOff >= 0 ? '' : '(-)'}${Math.abs(roundOff).toFixed(2)}`, taxAmountX, itemY, { align: 'right' });
    itemY += 12;

    if (roundOff < 0) {
      doc.text('Less:', colDesc + 5, itemY);
    }

    (doc as any).setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    let qtyY = startY;
    doc.text(`${qty} NO.`, colQty + 10, qtyY);
    qtyY += 10;
    doc.text(`${qty} NO.`, colQty + 10, qtyY);

    doc.text(rateIncludingTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colRate1 + colRate1Width - 10, startY, { align: 'right' });
    doc.text(rateExcludingTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colRate2 + colRate2Width - 10, startY, { align: 'right' });
    doc.text('NO.', colPer + 8, startY);
    doc.text(amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), boxRight - 10, startY, { align: 'right' });

    itemY += 15;
  });

  doc.line(colQty, tableHeaderTop, colQty, maxItemY);
  doc.line(colRate1, tableHeaderTop, colRate1, maxItemY);
  doc.line(colRate2, tableHeaderTop, colRate2, maxItemY);
  doc.line(colPer, tableHeaderTop, colPer, maxItemY);
  doc.line(colAmount, tableHeaderTop, colAmount, maxItemY);
  doc.line(boxLeft, tableHeaderTop, boxLeft, maxItemY);
  doc.line(boxRight, tableHeaderTop, boxRight, maxItemY);

  let totalsY = maxItemY + 5;
  doc.line(boxLeft, totalsY, boxRight, totalsY);

  let subtotalExcludingTax = 0;
  let subtotalIncludingTax = 0;
  products.forEach((p: any) => {
    const qty = Number(p?.quantity ?? p?.qty ?? 1) || 1;
    const rateIncludingTax = resolvePrice(p) || 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let rateExcludingTax = 0;
    if (isGujarat) {
      cgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
      sgstAmount = Number((rateIncludingTax * 0.09).toFixed(2));
      rateExcludingTax = Number((rateIncludingTax - cgstAmount - sgstAmount).toFixed(2));
    } else {
      const igstAmount = Number((rateIncludingTax * 0.18).toFixed(2));
      rateExcludingTax = Number((rateIncludingTax - igstAmount).toFixed(2));
    }
    subtotalExcludingTax += rateExcludingTax * qty;
    subtotalIncludingTax += rateIncludingTax * qty;
  });
  subtotalExcludingTax = Number(subtotalExcludingTax.toFixed(2));
  subtotalIncludingTax = Number(subtotalIncludingTax.toFixed(2));
  const roundOff = 0.00;

  let displayCgstAmount = 0;
  let displaySgstAmount = 0;
  let displayIgstAmount = 0;
  let totalTax = 0;
  if (isGujarat) {
    displayCgstAmount = Number((subtotalIncludingTax * 0.09).toFixed(2));
    displaySgstAmount = Number((subtotalIncludingTax * 0.09).toFixed(2));
    totalTax = Number((displayCgstAmount + displaySgstAmount).toFixed(2));
  } else {
    displayIgstAmount = Number((subtotalIncludingTax * 0.18).toFixed(2));
    totalTax = Number((displayIgstAmount).toFixed(2));
  }

  const totalAmount = subtotalIncludingTax;

  totalsY += 12;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('Subtotal', colDesc + 5, totalsY);
  doc.text(String(subtotalExcludingTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

  totalsY += 10;
  if (isGujarat) {
    doc.text('Output CGST (9%)', colDesc + 5, totalsY);
    doc.text(String(displayCgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
    totalsY += 10;
    doc.text('Output SGST (9%)', colDesc + 5, totalsY);
    doc.text(String(displaySgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
  } else {
    doc.text('Output IGST (18%)', colDesc + 5, totalsY);
    doc.text(String(displayIgstAmount.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
  }

  totalsY += 10;
  doc.text('Round Off', colDesc + 5, totalsY);
  doc.text(String(roundOff.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

  totalsY += 10;
  doc.line(boxLeft, totalsY, boxRight, totalsY);
  totalsY += 10;
  doc.text('Total', colDesc + 5, totalsY);
  doc.text(String(subtotalIncludingTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

  totalsY += 12;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('HSN/SAC', boxLeft + 40, totalsY);
  doc.text('Taxable', boxLeft + 140, totalsY);
  doc.text('Value', boxLeft + 140, totalsY + 7);
  doc.text('Central Tax', boxLeft + 240, totalsY);
  doc.text('Rate    Amount', boxLeft + 240, totalsY + 7);
  doc.text('State Tax', boxLeft + 360, totalsY);
  doc.text('Rate    Amount', boxLeft + 360, totalsY + 7);
  doc.text('Total', boxLeft + 480, totalsY);
  doc.text('Tax Amount', boxLeft + 470, totalsY + 7);

  totalsY += 14;
  doc.line(boxLeft, totalsY, boxRight, totalsY);

  const taxableValue = Number((subtotalIncludingTax - totalTax).toFixed(2));

  totalsY += 10;
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text(String(taxableValue.toFixed(2)), boxLeft + 200, totalsY, { align: 'right' });
  if (isGujarat) {
    doc.text(`9%`, boxLeft + 240, totalsY);
    doc.text(String(displayCgstAmount.toFixed(2)), boxLeft + 320, totalsY, { align: 'right' });
    doc.text(`9%`, boxLeft + 360, totalsY);
    doc.text(String(displaySgstAmount.toFixed(2)), boxLeft + 440, totalsY, { align: 'right' });
    doc.text(String(totalTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
  } else {
    doc.text(`18%`, boxLeft + 240, totalsY);
    doc.text(String(displayIgstAmount.toFixed(2)), boxLeft + 320, totalsY, { align: 'right' });
    doc.text('-', boxLeft + 360, totalsY);
    doc.text('-', boxLeft + 440, totalsY);
    doc.text(String(totalTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });
  }

  totalsY += 10;
  doc.line(boxLeft, totalsY, boxRight, totalsY);

  totalsY += 10;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(7);
  doc.text('Total', boxLeft + 40, totalsY);
  doc.text(String(taxableValue.toFixed(2)), boxLeft + 160, totalsY, { align: 'right' });
  doc.text(String(totalTax.toFixed(2)), boxRight - 10, totalsY, { align: 'right' });

  totalsY += 8;
  doc.line(boxLeft, totalsY, boxRight, totalsY);

  totalsY += 12;
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.text('Amount Chargeable (in words)', boxLeft + 5, totalsY);
  totalsY += 12;
  (doc as any).setFont(undefined, 'bold');
  doc.text(numberToWords(totalAmount), boxLeft + 5, totalsY);

  totalsY += 12;
  doc.line(boxLeft, totalsY, boxRight, totalsY);

  let bottomY = totalsY + 12;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('Declaration', boxLeft + 5, bottomY);
  
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(7);
  bottomY += 10;
  doc.text('We declare that this invoice shows the actual price of the goods', boxLeft + 5, bottomY);
  bottomY += 8;
  doc.text('described and that all particulars are true and correct.', boxLeft + 5, bottomY);

  let rightBottomY = totalsY + 12;
  (doc as any).setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('for HARI PRIYA TECHNOLOGIES PRIVATE LIMITED', boxRight - 5, rightBottomY, { align: 'right' });
  
  rightBottomY += 38;
  (doc as any).setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', boxRight - 5, rightBottomY, { align: 'right' });

  doc.save(`invoice_${record.customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};
