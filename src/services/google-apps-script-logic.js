/**
 * Saree Shop API - Google Apps Script Backend (Production Ready)
 * 
 * Instructions:
 * 1. Create a Google Sheet and name 4 sheets: "Sarees", "Sales", "Purchases", "Customers"
 * 2. Sheet Headers:
 *    - Sarees: id, sareeName, category, fabric, color, purchasePrice, sellingPrice, stock, rackNo, barcode, addedDate, status
 *    - Sales: saleId, sareeId, sareeName, quantity, sellingPrice, totalAmount, profit, date, customerName, customerMobile
 *    - Purchases: purchaseId, sareeId, sareeName, quantity, purchasePrice, supplier, date
 *    - Customers: customerId, name, mobile, address, city, totalPurchases, totalSpent
 * 3. Extensions -> Apps Script -> Paste this code -> Deploy -> Web App (Access: Anyone).
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SAREE_SHEET = SS.getSheetByName("Sarees");
const SALES_SHEET = SS.getSheetByName("Sales");
const PURCHASE_SHEET = SS.getSheetByName("Purchases");
const CUSTOMER_SHEET = SS.getSheetByName("Customers");
const SYNC_SHEET = SS.getSheetByName("Sync");

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'getSarees': result = getSarees(); break;
      case 'getSareeById': result = getSareeById(data.id); break;
      case 'createSaree': result = createSaree(data.saree); break;
      case 'updateSaree': result = updateSaree(data.id, data.saree); break;
      case 'deleteSaree': result = deleteSaree(data.id); break;

      case 'getSales': result = getSales(); break;
      case 'createSale': result = createSale(data.sale); break;

      case 'getPurchases': result = getPurchases(); break;
      case 'createPurchase': result = createPurchase(data.purchase); break;

      case 'getCustomers': result = getCustomers(); break;
      case 'getCustomerById': result = getCustomerById(data.id); break;
      case 'createCustomer': result = createCustomer(data.customer); break;

      case 'getDashboardStats': result = getDashboardStats(); break;

      case 'pushScannedItem': result = pushScannedItem(data.sessionId, data.barcode); break;
      case 'getScannedItems': result = getScannedItems(data.sessionId); break;

      default: throw new Error('Invalid Action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Logic Helpers ---
function getSarees() {
  const data = SAREE_SHEET.getDataRange().getValues();
  const headers = data.shift();
  return data.filter(row => row[12] !== 'deleted').map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getSareeById(id) {
  return getSarees().find(s => s.id == id);
}

function createSaree(saree) {
  const id = "SR-" + Math.floor(1000 + Math.random() * 9000);
  const date = new Date().toISOString();
  const row = [id, saree.sareeName, saree.category, saree.fabric, saree.color, saree.purchasePrice, saree.sellingPrice, saree.stock, saree.rackNo, id, date, 'active'];
  SAREE_SHEET.appendRow(row);
  return { id, addedDate: date, ...saree };
}

function updateSaree(id, partialSaree) {
  const data = SAREE_SHEET.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      Object.keys(partialSaree).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx > -1) SAREE_SHEET.getRange(i + 1, colIdx + 1).setValue(partialSaree[key]);
      });
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function deleteSaree(id) {
  return updateSaree(id, { status: 'deleted' });
}

function createSale(sale) {
  const saleId = "SL-" + Math.floor(1000 + Math.random() * 9000);
  const date = new Date().toISOString();
  let totalTransactionAmount = 0;
  let totalTransactionProfit = 0;

  // sale.items will be an array: [{sareeId, sareeName, quantity, sellingPrice}, ...]
  if (!sale.items || !Array.isArray(sale.items) || sale.items.length === 0) {
    throw new Error("No items in sale");
  }

  // First pass: validate all stock and calculate totals
  sale.items.forEach(item => {
    const saree = getSareeById(item.sareeId);
    if (!saree) throw new Error(`Saree not found: ${item.sareeId}`);

    const currentStock = parseInt(saree.stock) || 0;
    if (currentStock < item.quantity) {
      throw new Error(`Insufficient stock for ${saree.sareeName} (Available: ${currentStock})`);
    }

    const rowAmount = item.quantity * item.sellingPrice;
    const rowProfit = rowAmount - (item.quantity * (saree.purchasePrice || 0));

    totalTransactionAmount += rowAmount;
    totalTransactionProfit += rowProfit;
  });

  // Second pass: update stock and append rows
  sale.items.forEach(item => {
    const saree = getSareeById(item.sareeId);
    const rowAmount = item.quantity * item.sellingPrice;
    const rowProfit = rowAmount - (item.quantity * (saree.purchasePrice || 0));

    updateSaree(item.sareeId, { stock: (parseInt(saree.stock) || 0) - item.quantity });

    SALES_SHEET.appendRow([
      saleId,
      item.sareeId,
      item.sareeName,
      item.quantity,
      item.sellingPrice,
      rowAmount,
      rowProfit,
      date,
      sale.customerName || '',
      sale.customerMobile || ''
    ]);
  });

  // Update Customer Total Purchases & Amount (Safe Implementation)
  if (sale.customerMobile) {
    const customerData = CUSTOMER_SHEET.getDataRange().getValues();
    const headers = customerData[0];
    const mobileIdx = headers.indexOf('mobile');
    const totalPurchasesIdx = headers.indexOf('totalPurchases');
    const totalSpentIdx = headers.indexOf('totalSpent');

    let customerFound = false;
    if (mobileIdx > -1 && totalPurchasesIdx > -1) {
      for (let i = 1; i < customerData.length; i++) {
        if (customerData[i][mobileIdx] == sale.customerMobile) {
          const currentTotal = parseInt(customerData[i][totalPurchasesIdx]) || 0;
          CUSTOMER_SHEET.getRange(i + 1, totalPurchasesIdx + 1).setValue(currentTotal + 1);

          if (totalSpentIdx > -1) {
            const currentSpent = parseFloat(customerData[i][totalSpentIdx]) || 0;
            CUSTOMER_SHEET.getRange(i + 1, totalSpentIdx + 1).setValue(currentSpent + totalTransactionAmount);
          }
          customerFound = true;
          break;
        }
      }

      if (!customerFound && sale.customerName) {
        // Create new customer with 1 purchase and initial amount
        const customerId = "CU-" + Math.floor(1000 + Math.random() * 9000);
        CUSTOMER_SHEET.appendRow([customerId, sale.customerName, sale.customerMobile, '', '', 1, totalTransactionAmount]);
      }
    }
  }

  return { saleId, date, totalAmount: totalTransactionAmount, profit: totalTransactionProfit, ...sale };
}

function createPurchase(purchase) {
  const purchaseId = "PR-" + Math.floor(1000 + Math.random() * 9000);
  const date = new Date().toISOString();
  const saree = getSareeById(purchase.sareeId);
  updateSaree(purchase.sareeId, { stock: (parseInt(saree.stock) || 0) + purchase.quantity, purchasePrice: purchase.purchasePrice });

  PURCHASE_SHEET.appendRow([purchaseId, purchase.sareeId, purchase.sareeName, purchase.quantity, purchase.purchasePrice, purchase.supplier, date]);
  return { purchaseId, date, ...purchase };
}

function getCustomers() {
  const data = CUSTOMER_SHEET.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function createCustomer(customer) {
  const customerId = "CU-" + Math.floor(1000 + Math.random() * 9000);
  CUSTOMER_SHEET.appendRow([customerId, customer.name, customer.mobile, customer.address, customer.city, 0, 0]);
  return { customerId, totalPurchases: 0, totalSpent: 0, ...customer };
}

function getDashboardStats() {
  const sarees = getSarees();
  const salesRows = SALES_SHEET.getDataRange().getValues();
  salesRows.shift();

  const customers = getCustomers();

  let totalRevenue = 0;
  const monthlyMap = {};
  const categoryMap = {};

  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    monthlyMap[monthName] = 0;
  }

  salesRows.forEach(row => {
    const amount = parseFloat(row[5]) || 0;
    totalRevenue += amount;

    // Monthly aggregation
    const date = new Date(row[7]);
    const month = date.toLocaleString('default', { month: 'short' });
    if (monthlyMap.hasOwnProperty(month)) {
      monthlyMap[month] += amount;
    }
  });

  sarees.forEach(s => {
    categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
  });

  // Sort monthly sales by actual date order
  const monthOrder = Object.keys(monthlyMap);
  const monthlySales = monthOrder.map(month => ({ month, sales: monthlyMap[month] }));

  const categoryDistribution = Object.keys(categoryMap).map(category => ({
    category: category || 'Uncategorized',
    count: categoryMap[category]
  }));

  return {
    totalRevenue,
    totalSales: salesRows.length,
    totalCustomers: customers.length,
    lowStockCount: sarees.filter(s => s.stock < 5).length,
    monthlySales,
    categoryDistribution,
    recentActivities: salesRows.slice(-5).reverse().map(row => ({
      id: row[0],
      type: 'Sale',
      description: `Sold ${row[3]}x ${row[2]}`,
      date: row[7]
    }))
  };
}

function getSales() {
  const data = SALES_SHEET.getDataRange().getValues();
  const headers = data.shift();
  if (!headers) return [];
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getPurchases() {
  const data = PURCHASE_SHEET.getDataRange().getValues();
  const headers = data.shift();
  if (!headers) return [];
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function pushScannedItem(sessionId, barcode) {
  if (!SYNC_SHEET) {
    SS.insertSheet("Sync");
    const sheet = SS.getSheetByName("Sync");
    sheet.appendRow(["sessionId", "barcode", "timestamp"]);
  }
  const sheet = SS.getSheetByName("Sync");
  sheet.appendRow([sessionId, barcode, new Date().toISOString()]);
  return { success: true };
}

function getScannedItems(sessionId) {
  if (!SYNC_SHEET) return [];
  const data = SYNC_SHEET.getDataRange().getValues();
  const headers = data.shift();
  const items = [];
  const rowsToKeep = [headers];

  data.forEach(row => {
    if (row[0] == sessionId) {
      items.push({ barcode: row[1], timestamp: row[2] });
    } else {
      rowsToKeep.push(row);
    }
  });

  // Clear retrieved items and write back others
  SYNC_SHEET.clear();
  SYNC_SHEET.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);

  return items;
}
