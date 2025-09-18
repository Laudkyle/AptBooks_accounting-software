import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaChevronDown } from "react-icons/fa";
import { useAuth } from "./AuthContext";

import {
  Store,
  Box,
  Warehouse,
  Calculator,
  BarChart3,
  Receipt,
  BookOpen,
  Users,
  CreditCard,
  Settings,
  PlusCircle,
  List,
  DiamondPercentIcon,
  PackageIcon,
  FileTextIcon,
  CalendarRangeIcon,
  RepeatIcon,
  TagsIcon,
  TrendingDownIcon,
  UserCogIcon,
  ArrowLeft,
  Save,
  ShoppingCart,

  FileSpreadsheet,
  Scale,
  UserCircle,
  
  Truck,
  UsersRound,
  Group,
  
  BookCheck,
  
  BookOpenCheck,
  ArrowLeftRight,
  UserCircle2,
ReceiptEuro,
ScatterChart,
DollarSignIcon,
CalculatorIcon,
ChartAreaIcon,
Edit2,
BarChart3Icon,
BarChart,
BarChart2,
History,
LucideHistory,
ChartBarDecreasingIcon,

} from "lucide-react";
import { FaMoneyBill1, FaMoneyBill } from "react-icons/fa6";

const Sidebar = ({ isExpanded, companyName }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const { user } = useAuth();
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const dropdownItemClass = `block px-6 py-2 hover:bg-gray-600 flex items-center`;

  const dropdownMenus = [
    {
      name: "Stock",
      icon: <BarChart className="w-4 h-4" />,
      dropdown: "Stock",
      links: [
          {
          path: "/stock-levels",
          label: "Stock Dashboard",
          icon: <BarChart3Icon className="w-4 h-4" />,
        },
       
          {
          path: "/product-analysis",
          label: "Product Analysis",
          icon: <BarChart2 className="w-4 h-4" />,
        },
       
      ],
    },
    {
      name: "Contacts",
      icon: <Users className="w-4 h-4" />,
      dropdown: "contacts",
      links: [
        {
          path: "/suppliers",
          label: "Suppliers",
          icon: <Truck className="w-4 h-4" />,
        },
        {
          path: "/customers",
          label: "Customers",
          icon: <UsersRound className="w-4 h-4" />,
        },
        {
          path: "/customer-groups",
          label: "Customer Groups",
          icon: <Group className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Shop",
      icon: <Store className="w-4 h-4" />,
      dropdown: "shop",
      links: [
        {
          path: "/pos",
          label: "POS",
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        { path: "/draft", label: "Draft", icon: <Save className="w-4 h-4" /> },
        {
          path: "/sale-return",
          label: "Make Sale Return",
          icon: <ArrowLeft className="w-4 h-4" />,
        },
        {
          path: "/sale-return-list",
          label: "Sale Return List",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },

    {
      name: "Purchases",
      icon: <Warehouse className="w-4 h-4" />,
      dropdown: "purchases",
      links: [
        {
          path: "/add-purchase-order",
          label: "Add Purchase",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/purhase-analysis",
          label: "Purchase Analysis",
          icon: <ChartBarDecreasingIcon className="w-4 h-4" />,
        },

        {
          path: "/list-purchase-orders",
          label: "List purchase",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Sales",
      icon: <ReceiptEuro className="w-4 h-4" />,
      dropdown: "sales",
      links: [
        {
          path: "/sales",
          label: "Sales",
          icon: <ReceiptEuro className="w-4 h-4" />,
        },
         {
          path: "/sales-history",
          label: "Sales History",
          icon: <History className="w-4 h-4" />,
        },
        {
          path: "/sales-analytics",
          label: "Sales Analytics",
          icon: <ScatterChart className="w-4 h-4" />,
        },
      

        {
          path: "/sales-journal",
          label: "Sales Journal",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },
    
    {
      name: "Payments",
      icon: <FaMoneyBill1 className="w-4 h-4" />,
      dropdown: "payments",
      links: [
        {
          path: "/advances",
          label: "Supplier Advances",
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          path: "/supplier-payment",
          label: "Supplier Payment",
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          path: "/customer-payment",
          label: "Receive Customer Payment",
          icon: <FaMoneyBill className="w-4 h-4" />,
        },
        {
          path: "/payment-history",
          label: "Payment History",
          icon: <List className="w-4 h-4" />,
        },
      ],
    },

    {
      name: "Settings",
      icon: <Settings className="w-4 h-4" />,
      dropdown: "settings",
      links: [
        {
          path: "/profile",
          label: "Profile",
          icon: <UserCircle className="w-4 h-4" />,
        },
        {
          path: "/users",
          label: "Users",
          icon: <UserCircle2 className="w-4 h-4" />,
        },
        {
          path: "/add-payment-method",
          label: "Add Payment Method",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/subscription",
          label: "Subscription",
          icon: <DollarSignIcon className="w-4 h-4" />,
        },
        {
          path: "/sync-db",
          label: "Sync Database",
          icon: <PlusCircle className="w-4 h-4" />,
        },
      ],
    },
  ];
  const dropdownMenusAdmin = [
    {
      name: "Products",
      icon: <Box className="w-4 h-4" />,
      dropdown: "products",
      links: [
        {
          path: "/add-product",
          label: "Add Product",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/list-products",
          label: "List Products",
          icon: <List className="w-4 h-4" />,
        }        
      ],
    },
    {
      name: "Costing",
      icon: <CalculatorIcon className="w-4 h-4" />,
      dropdown: "costing",
      links: [
        
          {
          path: "/costing",
          label: "Product Costing",
          icon: <Calculator className="w-4 h-4" />,
        }, {
          path: "/cost-editing",
          label: "Edit Product Cost",
          icon: <Edit2 className="w-4 h-4" />,
        }, {
          path: "/costing-analysis",
          label: "Costing Analysis",
          icon: <ChartAreaIcon className="w-4 h-4" />,
        }
        
      ],
    },
    {
  name: "Assets",
  icon: <Box className="w-4 h-4" />,
  dropdown: "assets",
  links: [
    {
      path: "/depreciation",
      label: "Depreciation",
      icon: <CalendarRangeIcon className="w-4 h-4" />,
    },
    {
      path: "/fixed-assets",
      label: "Fixed Assets",
      icon: <PackageIcon className="w-4 h-4" />,
    },
    {
      path: "/asset-transactions",
      label: "Additions & Disposals",
      icon: <RepeatIcon className="w-4 h-4" />,
    },
    {
      path: "/asset-categories",
      label: "Asset Categories",
      icon: <TagsIcon className="w-4 h-4" />,
    },
    {
      path: "/revaluation-impairment",
      label: "Revaluation & Impairment",
      icon: <TrendingDownIcon className="w-4 h-4" />,
    },
  ],
},
    {
      name: "Transactions",
      icon: <Calculator className="w-4 h-4" />,
      dropdown: "transactions",
      links: [
        {
          path: "/transactions",
          label: "Transactions",
          icon: <Calculator className="w-4 h-4" />,
        },
        {
          path: "/funds-transfer",
          label: "Transfer Funds",
          icon: <ArrowLeftRight className="w-4 h-4" />,
        },
        {
          path: "/expense",
          label: "Expenses",
          icon: <Calculator className="w-4 h-4" />,
        },
        {
          path: "/process-payment",
          label: "Payment/Purchase",
          icon: <FaMoneyBill className="w-4 h-4" />,
        },
        {
          path: "/journal-entry",
          label: "Journal Entry",
          icon: <BookOpenCheck className="w-4 h-4" />,
        },
      ],
    },
    {
      name: "Accounts",
      icon: <BookCheck className="w-4 h-4" />,
      dropdown: "accounts",
      links: [
        {
          path: "/opening-balances",
          label: "Opening Balances",
          icon: <PlusCircle className="w-4 h-4" />,
        },
        {
          path: "/account-balances",
          label: "Chart of Accounts",
          icon: <BookOpen className="w-4 h-4" />, // Adjust icon as needed
        },
        {
          path: "/adjustments",
          label: "Adjustments",
          icon: <UserCogIcon className="w-4 h-4" />, // Adjust icon as needed
        },
        {
          path: "/general-ledger",
          label: "General Ledger",
          icon: <BookOpenCheck className="w-4 h-4" />, // Adjust icon as needed
        },
      ],
    },

    {
      name: "Reports",
      icon: <BarChart3 className="w-4 h-4" />,
      dropdown: "reports",
      links: [
        {
          path: "/income-statement",
          label: "Income Statement",
          icon: <Receipt className="w-4 h-4" />,
        },
        {
          path: "/balance-sheet",
          label: "Balance Sheet",
          icon: <FileSpreadsheet className="w-4 h-4" />,
        },
        {
          path: "/trial-balance",
          label: "Trial Balance",
          icon: <Scale className="w-4 h-4" />,
        },

      ],
    },
    {
      name: "Tax",
      icon: <Receipt className="w-4 h-4" />,
      dropdown: "tax",
      links: [
        {
          path: "/taxes",
          label: "Taxes",
          icon: <List className="w-4 h-4" />,
        },
        {
          path: "/tax-settings",
          label: "Tax Settings",
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div
      className={`h-screen bg-gray-800 border-r border-gray-600 text-white flex flex-col transition-all duration-300 ${
        isExpanded ? "min-w-64" : "w-16"
      }`}
    >
      {/* Logo and Shop Name */}
      <div
        className={`flex items-center justify-center p-4 h-20 border-b border-gray-600 transition-all duration-300 ${
          isExpanded ? "flex-row" : "flex-col"
        }`}
      >
        <img
          src={"images/logo.png"}
          alt="Essential Anchor"
          className={`w-12 h-12 ${isExpanded ? "mr-3" : "mb-2"}`}
        />
        {isExpanded && <h1 className="text-xl font-bold">{companyName}</h1>}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto">
        {/* Static Menu Items */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 hover:bg-gray-700 ${
              isActive ? "bg-gray-700" : ""
            }`
          }
        >
          <span
            className="text-xl w-5 h-5 flex items-center justify-center"
            title="Dashboard"
          >
            <FaTachometerAlt />
          </span>
          <span
            className={`ml-3 transition-all duration-300 ${
              isExpanded ? "block" : "hidden"
            }`}
          >
            Dashboard
          </span>
        </NavLink>

        {/* Dropdown Menus */}
        {dropdownMenus.map(({ name, icon, dropdown, links }) => (
          <div className="relative" key={dropdown}>
            {/* Dropdown Header */}
            <button
              onClick={() => toggleDropdown(dropdown)}
              className="flex items-center w-full px-4 py-3 hover:bg-gray-700 justify-between"
            >
              <div className="flex items-center">
                <span
                  className="text-xl w-5 h-5 flex items-center justify-center"
                  title={name}
                >
                  {icon}
                </span>
                <span
                  className={`ml-3 transition-all duration-300 ${
                    isExpanded ? "block" : "hidden"
                  }`}
                >
                  {name}
                </span>
              </div>
              {isExpanded && (
                <FaChevronDown
                  className={`transition-transform ${
                    openDropdown === dropdown ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Dropdown Items */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openDropdown === dropdown
                  ? "max-h-64 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col mt-2 bg-gray-700 text-sm rounded-md shadow-lg">
                {links.map(({ path, label, icon }) => (
                  <NavLink to={path} className={dropdownItemClass} key={path}>
                    <span
                      className="w-5 h-5 flex items-center justify-center mr-3"
                      title={label}
                    >
                      {icon}
                    </span>
                    {isExpanded && label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        ))}
        {user?.role === "admin" &&
          dropdownMenusAdmin.map(({ name, icon, dropdown, links }) => (
            <div className="relative" key={dropdown}>
              {/* Dropdown Header */}
              <button
                onClick={() => toggleDropdown(dropdown)}
                className="flex items-center w-full px-4 py-3 hover:bg-gray-700 justify-between"
              >
                <div className="flex items-center">
                  <span
                    className="text-xl w-5 h-5 flex items-center justify-center"
                    title={name}
                  >
                    {icon}
                  </span>
                  <span
                    className={`ml-3 transition-all duration-300 ${
                      isExpanded ? "block" : "hidden"
                    }`}
                  >
                    {name}
                  </span>
                </div>
                {isExpanded && (
                  <FaChevronDown
                    className={`transition-transform ${
                      openDropdown === dropdown ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {/* Dropdown Items */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openDropdown === dropdown
                    ? "max-h-64 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex flex-col mt-2 bg-gray-700 text-sm rounded-md shadow-lg">
                  {links.map(({ path, label, icon }) => (
                    <NavLink to={path} className={dropdownItemClass} key={path}>
                      <span
                        className="w-5 h-5 flex items-center justify-center mr-3"
                        title={label}
                      >
                        {icon}
                      </span>
                      {isExpanded && label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </nav>
    </div>
  );
};

export default Sidebar;
