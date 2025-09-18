import { useState, useEffect } from "react";
import { FiClock, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import API from "../api";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SubscriptionPlans = () => {
  const [subscription, setSubscription] = useState({
    status: "loading", // Initial loading state
    endDate: null,
    plan: null,
  });
  const { user } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const plans = [
    {
      id: "monthly",
      label: "Monthly Plan",
      price: 200,
      interval: "monthly",
      paystackPlan: "PLN_s9uezjjfxxlp7yb",
    },
    {
      id: "quarterly",
      label: "Quarterly Plan (Save ₵50)",
      price: 550,
      interval: "quarterly",
      paystackPlan: "PLN_4hor7xc4m7j1rg8",
    },
    {
      id: "biannual",
      label: "Biannual Plan (Save ₵100)",
      price: 1100,
      interval: "biannual",
      paystackPlan: "PLN_7zyy06vo2yt18f2",
    },
    {
      id: "annual",
      label: "Annual Plan (Save ₵400)",
      price: 2000,
      interval: "annual",
      paystackPlan: "PLN_octm4uyxkmpjhms",
    },
  ];

  const oneTimePlan = {
    id: "life-time",
    label: "Life Time Plan (One-time)",
    price: 7299,
  };

  // Fetch current subscription status on mount
 // Fetch current subscription status on mount
useEffect(() => {
  const fetchSubscription = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/current-subscription?email=${user.email}`
      );

      if (response.data) {
        const endDate = new Date(response.data.endDate);

        if (isNaN(endDate.getTime())) {
          console.error("Invalid date received:", response.data.endDate);
          // Fallback to trial
          setSubscription({
            status: "trial",
            endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            plan: { id: 'trial', label: '15-Day Trial' },
          });
          return;
        }

        setSubscription({
          status: response.data.status,
          endDate: endDate,
          plan: response.data.plan,
          plan_id: response.data.plan?.id,
        });
      } else {
        // This case should not happen anymore as the API creates a trial
        setSubscription({
          status: "trial",
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          plan: { id: 'trial', label: '15-Day Trial' },
        });
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      // Fallback to trial on error
      setSubscription({
        status: "trial",
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        plan: { id: 'trial', label: '15-Day Trial' },
      });
    }
  };

  fetchSubscription();
}, [user.email]);

  // Calculate days remaining and check for expiration
  useEffect(() => {
    if (!subscription.endDate || subscription.status === "loading") return;

    const calculateDays = () => {
      const today = new Date();
      const diffTime = subscription.endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays > 0 ? diffDays : 0);

      if (diffDays <= 0 && subscription.status !== "expired") {
        setSubscription((prev) => ({ ...prev, status: "expired" }));
      }
    };

    calculateDays();
    const interval = setInterval(calculateDays, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [subscription.endDate, subscription.status]);

  const handleSubscribe = async (plan) => {
    setLoading(true);
    try {
      let response;
      if (plan?.id === "life-time") {
        response = await API.post("/initialize-payment", {
          email: user.email,
          amount: plan.price * 100,
          // Add callback URL to redirect to verification page
          callback_url: `${window.location.origin}/verify-payment`,
        });
      } else {
        response = await API.post("/initialize-subscription", {
          email: user.email,
          planCode: plan.paystackPlan,
          // Add callback URL to redirect to verification page
          callback_url: `${window.location.origin}/verify-payment`,
        });
      }

      // Store reference in localStorage before redirecting
      localStorage.setItem("paymentReference", response.data.data.reference);

      // Redirect to Paystack
      window.location.href = response.data.data.authorization_url;
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to initialize payment. Please try again.");
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Loading...";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (subscription.status === "loading") {
    return (
      <div className="w-full h-[85vh] flex items-center justify-center">
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[85vh] overflow-scroll mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Subscription Status */}
      <div
        className={`p-4 mb-6 rounded-lg ${
          subscription.status === "trial"
            ? "bg-blue-50 border border-blue-200"
            : subscription.status === "active"
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {subscription.status === "trial" && (
              <FiClock className="text-blue-500 mr-2" size={20} />
            )}
            {subscription.status === "active" && (
              <FiCheckCircle className="text-green-500 mr-2" size={20} />
            )}
            {subscription.status === "expired" && (
              <FiAlertTriangle className="text-red-500 mr-2" size={20} />
            )}
            <h2 className="text-lg font-semibold capitalize">
              {subscription.status}{" "}
              {subscription.plan && `(${subscription.plan.label})`}
            </h2>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscription.status === "trial"
                ? "bg-blue-100 text-blue-800"
                : subscription.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {subscription.plan_id === "life-time" ? (
              <span>Unlimited Access</span>
            ) : (
              <span>
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
              </span>
            )}
          </span>
        </div>

        {subscription.status !== "expired" && (
          <p className="mt-2 text-sm text-gray-600">
            {subscription.plan_id === "life-time" ? (
              "This plan does not expire."
            ) : subscription.status === "trial" ? (
              <>Your trial ends on {formatDate(subscription.endDate)}</>
            ) : (
              <>
                Your subscription renews on {formatDate(subscription.endDate)}
              </>
            )}
          </p>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Choose a Plan</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* One-time life Plan */}
          <div
            onClick={() => !loading && handleSubscribe(oneTimePlan)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              subscription.plan?.id === oneTimePlan.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-semibold">{oneTimePlan.label}</div>
            <div className="text-2xl font-bold mt-1">₵{oneTimePlan.price}</div>
            <div className="text-xs text-gray-500 mt-1">One-time payment</div>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => !loading && handleSubscribe(plan)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                subscription.plan?.id === plan?.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold">{plan.label}</div>
              <div className="text-2xl font-bold mt-1">₵{plan.price}</div>
              <div className="text-xs text-gray-500 mt-1">
                {plan.interval === "monthly"
                  ? "Billed monthly"
                  : plan.interval === "quarterly"
                  ? "Billed every 3 months"
                  : plan.interval === "biannual"
                  ? "Billed every 6 months"
                  : "Billed annually"}
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <p className="text-blue-500 mt-4">Processing your subscription...</p>
        )}
      </div>

      {/* Subscription Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Subscription Details</h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="capitalize font-medium">
              {subscription.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Plan:</span>
            <span>{subscription.plan?.label || "Trial"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">
              {subscription.plan_id === "life-time"
                ? "Access"
                : subscription.status === "expired"
                ? "Expired on"
                : "Renews on"}
              :
            </span>
            <span>
              {subscription.plan?.id == "life-time"
                ? "Unlimited"
                : formatDate(subscription.endDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
