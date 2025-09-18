import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import Login from "./components/LoginComponent";
import PrivateRoute from "./PrivateRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Shop from "./components/Shop";
import Settings from "./components/Settings";
import "typeface-inter";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import Transactions from "./components/Transactions";
import Adjustments from "./components/Adjustments";
import JournalEntry from "./components/JournalEntry";
import AddPurchaseOrder from "./components/AddPurchaseOrder";
import EditPurchaseOrder from "./components/EditPurchaseOrder";
import ExpenseList from "./components/ExpenseList";
import Supplier from "./components/Supplier";
import Customer from "./components/Customer";
import CustomerGroup from "./components/CutomerGroup";
import SaleReturn from "./components/SaleReturn";
import Draft from "./components/Draft";
import SaleReturnList from "./components/SaleReturnList";
import ProcessPayment from "./components/ProcessPayment";
import SupplierPayment from "./components/SupplierPayment";
import PaymentList from "./components/PaymentList";
import CustomerPayment from "./components/CustomerPayment";
import AddProduct from "./components/AddProducts";
import PurchaseOrdersTable from "./components/PurchaseOrderTable";
import { ToastContainer } from "react-toastify";
import AccountBalances from "./components/AccountBalances";
import OpeningBalances from "./components/OpeningBalances";
import Taxes from "./components/Taxes";
import AddPaymentMethod from "./components/AddPaymentMethod";
import TaxSettings from "./components/TaxSettings";
import IncomeStatement from "./components/IncomeStatement";
import BalanceSheet from "./components/BalanceSheet";
import TrailBalance from "./components/TrailBalance";
import TaxReport from "./components/TaxReport";
import ExpenseComponent from "./components/Expense";
import { toastOptions } from "./toastConfig";
import GeneralLedgerComponent from "./components/GeneralLedger";
import FundsTransferComponent from "./components/FundTransfer";
import ProfilePage from "./components/Profile";
import UsersManagement from "./components/UserManagement";
import SalesAnalysis from "./components/Sales";
import SalesJournal from "./components/SalesJournal";
import SalesJournalTable from "./components/SalesJournalList";
import DatabaseUploader from "./components/Sync";
import InventoryDepreciation from "./components/InventoryDepreciation";
import FixedAssets from "./components/FixedAssets";
import Depreciation from "./components/Depreciation";
import AssetCategories from "./components/AssetCategories";
import AssetTransactions from "./components/AssetTransaction";
import AssetDetails from "./components/AssetDetails";
import RevaluationImpairment from "./components/RevaluationImpairment";
import SubscriptionPlans from "./components/Subscription";
import PaymentVerification from "./components/Verify";
import SupplierAdvancePayment from "./components/Advances";
import ProductCostingPage from "./components/CostingAnalysis";
import ProductCosting from "./components/ProductCosting";
import EditProductCosting from "./components/EditProductCosting";
import StockPosition from "./components/SalesLevels";
import ProductAnalyticsDashboard from "./components/ProductAnalysis";
import SalesHistory from "./components/SalesHistory";
import PurchaseAnalysis from "./components/PurchaseAnalysis";

const App = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const companyName = "AptBooks";
  const companyAddress = "P.O.Box: 479";
  const email = "aptbooksvps@gmail.com";
  const phone = "233 (0)20 858 3677";

  return (
    <AuthProvider >
    <Router>
      <div className="flex">
        <Sidebar
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          companyName={companyName}
        />
        <div className="flex-1 bg-gray-100">
          <ToastContainer {...toastOptions} />
          <Header isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Private Routes */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <PrivateRoute>
                  <Shop
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sales-analytics"
              element={
                <PrivateRoute>
                  <SalesAnalysis
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sales-history"
              element={
                <PrivateRoute>
                  <SalesHistory
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/purhase-analysis"
              element={
                <PrivateRoute>
                  <PurchaseAnalysis
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sales-journal"
              element={
                <PrivateRoute>
                  <SalesJournalTable
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <PrivateRoute>
                  <PaymentVerification
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sync-db"
              element={
                <PrivateRoute>
                  <DatabaseUploader
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/stock-levels"
              element={
                <PrivateRoute>
                  <StockPosition
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/fixed-assets"
              element={
                <PrivateRoute>
                  <FixedAssets
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/product-analysis"
              element={
                <PrivateRoute>
                  <ProductAnalyticsDashboard
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/depreciation"
              element={
                <PrivateRoute>
                  <Depreciation
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/revaluation-impairment"
              element={
                <PrivateRoute>
                  <RevaluationImpairment
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <PrivateRoute>
                  <SubscriptionPlans
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
                <Route
              path="/costing"
              element={
                <PrivateRoute>
                  <ProductCosting
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            /> <Route
              path="/cost-editing"
              element={
                <PrivateRoute>
                  <EditProductCosting
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
              <Route
              path="/costing-analysis"
              element={
                <PrivateRoute>
                  <ProductCostingPage
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/asset-categories"
              element={
                <PrivateRoute>
                  <AssetCategories
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/asset-transactions"
              element={
                <PrivateRoute>
                  <AssetTransactions
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
      
       path="/asset-details/:id"  
            element={
                <PrivateRoute>
                  <AssetDetails
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <PrivateRoute>
                  <SalesJournal
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/draft"
              element={
                <PrivateRoute>
                  <Draft
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/sale-return"
              element={
                <PrivateRoute>
                  <SaleReturn  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <UsersManagement companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/sale-return-list"
              element={
                <PrivateRoute>
                  <SaleReturnList  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/list-expenses"
              element={
                <PrivateRoute>
                  <ExpenseList  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/add-product"
              element={
                <PrivateRoute>
                  <AddProduct  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/add-purchase-order"
              element={
                <PrivateRoute>
                  <AddPurchaseOrder  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/edit-purchase-order"
              element={
                <PrivateRoute>
                  <EditPurchaseOrder  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <PrivateRoute>
                  <Supplier  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/advances"
              element={
                <PrivateRoute>
                  
                  <SupplierAdvancePayment  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/account-balances"
              element={
                <PrivateRoute>
                  <AccountBalances  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/opening-balances"
              element={
                <PrivateRoute>
                  <OpeningBalances companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/adjustments"
              element={
                <PrivateRoute>
                  <Adjustments  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <PrivateRoute>
                  <Customer  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/customer-groups"
              element={
                <PrivateRoute>
                  <CustomerGroup  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/list-products"
              element={
                <PrivateRoute>
                  <ProductList  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/list-purchase-orders"
              element={
                <PrivateRoute>
                  <PurchaseOrdersTable  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/add-payment"
              element={
                <PrivateRoute>
                  <ProcessPayment  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/add-payment-method"
              element={
                <PrivateRoute>
                  <AddPaymentMethod  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/supplier-payment"
              element={
                <PrivateRoute>
                  <SupplierPayment  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/customer-payment"
              element={
                <PrivateRoute>
                  <CustomerPayment  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress} />
                </PrivateRoute>
              }
            />
            <Route
              path="/payment-history"
              element={
                <PrivateRoute>
                  <PaymentList  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/process-payment"
              element={
                <PrivateRoute>
                  <ProcessPayment  companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}/>
                </PrivateRoute>
              }
            />
            <Route
              path="/taxes"
              element={
                <PrivateRoute>
                  <Taxes />
                </PrivateRoute>
              }
            />
            <Route
              path="/tax-settings"
              element={
                <PrivateRoute>
                  <TaxSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="/tax-reports"
              element={
                <PrivateRoute>
                  <TaxReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/expense"
              element={
                <PrivateRoute>
                  <ExpenseComponent />
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              }
            />
            <Route
              path="/income-statement"
              element={
                <PrivateRoute>
                  <IncomeStatement
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/general-ledger"
              element={
                <PrivateRoute>
                  <GeneralLedgerComponent
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/funds-transfer"
              element={
                <PrivateRoute>
                  <FundsTransferComponent />
                </PrivateRoute>
              }
            />
            <Route
              path="/balance-sheet"
              element={
                <PrivateRoute>
                  <BalanceSheet
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/trial-balance"
              element={
                <PrivateRoute>
                  <TrailBalance
                    companyName={companyName}
                    email={email}
                    phone={phone}
                    companyAddress={companyAddress}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/journal-entry"
              element={
                <PrivateRoute>
                  <JournalEntry />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
    </AuthProvider>
  );
};

export default App;
