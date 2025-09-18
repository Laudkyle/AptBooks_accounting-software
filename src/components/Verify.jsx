import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiClock, FiRefreshCw } from "react-icons/fi";
import API from "../api";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const PaymentVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [verificationState, setVerificationState] = useState({
    status: 'pending', 
    message: '',
    reference: null
  });

  const reference = searchParams.get('reference');

  useEffect(() => {
    // Check if we have a reference parameter
    if (!reference) {
      setVerificationState({
        status: 'failed',
        message: 'No payment reference found. Please try making the payment again.',
        reference: null
      });
    } else {
      setVerificationState(prev => ({
        ...prev,
        reference: reference
      }));
    }
  }, [reference]);

  const verifyPayment = async () => {
    if (!reference) {
      toast.error('No payment reference found');
      return;
    }

    setVerificationState(prev => ({
      ...prev,
      status: 'verifying',
      message: 'Verifying your payment...'
    }));

    try {
      // 1. Verify payment with backend
      const verification = await API.get(`/verify-payment?reference=${reference}`);
      
      if (verification.data.success) {
        // 2. Clear reference from localStorage if it exists
        localStorage.removeItem('paymentReference');
        
        setVerificationState({
          status: 'success',
          message: 'Payment verified successfully! Redirecting to subscriptions...',
          reference: reference
        });

        // 3. Show success message
        toast.success('Payment verified successfully!');
        
        // 4. Redirect to subscriptions page after a short delay
        setTimeout(() => {
          navigate('/subscription', { replace: true });
        }, 2000);
        
      } else {
        setVerificationState({
          status: 'failed',
          message: verification.data.message || 'Payment verification failed. Please contact support.',
          reference: reference
        });
        
        toast.error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      
      const errorMessage = error.response?.data?.message || 
                          'Payment verification failed. Please try again or contact support.';
      
      setVerificationState({
        status: 'failed',
        message: errorMessage,
        reference: reference
      });
      
      toast.error(errorMessage);
    }
  };

  const goToSubscriptions = () => {
    navigate('/subscription', { replace: true });
  };

  const tryAgain = () => {
    setVerificationState(prev => ({
      ...prev,
      status: 'pending',
      message: ''
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Verification
          </h1>
          <p className="text-gray-600">
            Verify your payment to activate your subscription
          </p>
        </div>

        {/* Status Content */}
        <div className="text-center mb-6">
          {verificationState.status === 'pending' && (
            <div className="space-y-4">
              <FiClock className="mx-auto text-blue-500" size={48} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Verify
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the button below to verify your payment
                </p>
                {reference && (
                  <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded break-all">
                    Reference: {reference}
                  </p>
                )}
              </div>
            </div>
          )}

          {verificationState.status === 'verifying' && (
            <div className="space-y-4">
              <FiRefreshCw className="mx-auto text-blue-500 animate-spin" size={48} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Verifying Payment
                </h3>
                <p className="text-gray-600">
                  Please wait while we verify your payment...
                </p>
              </div>
            </div>
          )}

          {verificationState.status === 'success' && (
            <div className="space-y-4">
              <FiCheckCircle className="mx-auto text-green-500" size={48} />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Payment Verified!
                </h3>
                <p className="text-green-700">
                  {verificationState.message}
                </p>
              </div>
            </div>
          )}

          {verificationState.status === 'failed' && (
            <div className="space-y-4">
              <FiXCircle className="mx-auto text-red-500" size={48} />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Verification Failed
                </h3>
                <p className="text-red-700 mb-4">
                  {verificationState.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {verificationState.status === 'pending' && (
            <button
              onClick={verifyPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Verify Payment
            </button>
          )}

          {verificationState.status === 'verifying' && (
            <button
              disabled
              className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg cursor-not-allowed"
            >
              Verifying...
            </button>
          )}

          {verificationState.status === 'success' && (
            <button
              onClick={goToSubscriptions}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Go to Subscriptions
            </button>
          )}

          {verificationState.status === 'failed' && (
            <div className="space-y-2">
              <button
                onClick={tryAgain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={goToSubscriptions}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Go to Subscriptions
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble? Contact support for assistance
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;