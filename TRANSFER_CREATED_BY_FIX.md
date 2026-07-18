# Fix for "Created By" showing undefined in Transfer Details

## Problem
The "Created By" field in transfer details is showing "undefined" instead of the actual user who created the transfer.

## Root Cause
The backend API endpoint `/api/inventory-transfers/create` is not properly extracting and storing the user information from the authentication token when creating transfer records.

## Solution
The backend needs to be updated to:

1. **Extract user information from the JWT token** in the request headers/cookies
2. **Populate the `createdBy` field** with the user's ObjectId when creating the transfer
3. **Ensure proper population** when fetching transfers to include user details

## Backend Changes Required

### 1. In the transfer creation endpoint:
```javascript
// Extract user from JWT token
const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId || decoded.id;

// When creating the transfer document:
const transfer = new InventoryTransfer({
  date,
  items,
  sourceGodown,
  destinationGodown,
  batchNo,
  createdBy: userId, // Add this line
  // ... other fields
});
```

### 2. In the transfer fetch endpoint:
```javascript
// When fetching transfers, populate the createdBy field
const transfers = await InventoryTransfer.find()
  .populate('createdBy', 'firstName lastName') // Add this line
  .populate('sourceGodown', 'name')
  .populate('destinationGodown', 'name')
  .populate('items.product', 'name model')
  .sort({ createdAt: -1 });
```

### 3. Ensure the InventoryTransfer schema includes:
```javascript
const inventoryTransferSchema = new mongoose.Schema({
  // ... other fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // or 'SalesPerson' depending on your user model
    required: true
  },
  // ... other fields
}, { timestamps: true });
```

## Frontend Verification
The frontend code is already correctly displaying the createdBy information:
```javascript
{transfer.createdBy ? `${transfer.createdBy.firstName} ${transfer.createdBy.lastName || ''}`.trim() : 'N/A'}
```

## Testing
After implementing the backend changes:
1. Create a new transfer
2. Check that the "Created By" field shows the correct user name
3. Verify existing transfers still work (may show N/A for old records without createdBy)

## Note
This fix requires backend API changes. The frontend code is already properly handling the display of user information when it's available.