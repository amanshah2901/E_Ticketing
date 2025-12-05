// src/pages/Payment.jsx

import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { bookingsAPI, paymentsAPI } from "@/api/services";
import { loadRazorpay } from "@/utils/razorpay";
import { formatCurrency } from "@/utils";

import {
  CreditCard,
  Smartphone,
  Building,
  Wallet as WalletIcon,
  Shield,
  Lock,
  CheckCircle,
} from "lucide-react";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: wallet } = useWallet();

  const [bookingData, setBookingData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  /* -------------------------------------------------------
     LOAD BOOKING DATA + LOAD RAZORPAY ONLY IF NEEDED
  ------------------------------------------------------- */
  useEffect(() => {
    if (!location.state?.bookingData) {
      navigate("/");
      return;
    }

    setBookingData(location.state.bookingData);
  }, []);

  // Load Razorpay SDK only when Razorpay payment method is selected
  useEffect(() => {
    if (paymentMethod !== "wallet" && paymentMethod !== "upi" && paymentMethod !== "netbanking") {
      // Only load for "razorpay" (which handles card/upi/netbanking via Razorpay)
      if (paymentMethod === "razorpay") {
        loadRzp();
      }
    } else {
      setRazorpayLoaded(false);
    }
  }, [paymentMethod]);

  const loadRzp = async () => {
    const sdk = await loadRazorpay();
    if (sdk) setRazorpayLoaded(true);
  };

  const pricing = useMemo(() => {
    if (!bookingData) {
      return { subtotal: 0, bookingFee: 0, gst: 0, total: 0 }
    }

    if (bookingData.pricing) {
      return {
        subtotal: bookingData.pricing.subtotal ?? bookingData.pricing.base ?? bookingData.basePrice ?? 0,
        bookingFee: bookingData.pricing.bookingFee ?? bookingData.bookingFee ?? 0,
        gst: bookingData.pricing.gst ?? bookingData.pricing.tax ?? bookingData.gst ?? bookingData.tax ?? 0,
        total: bookingData.pricing.total ?? bookingData.total_amount ?? bookingData.totalAmount ?? 0
      }
    }

    const subtotal = bookingData.basePrice ?? bookingData.total_amount ?? bookingData.totalAmount ?? 0
    const bookingFee = bookingData.bookingFee ?? subtotal * 0.05
    const gst = bookingData.gst ?? bookingData.tax ?? subtotal * 0.05
    const total = bookingData.total_amount ?? bookingData.totalAmount ?? subtotal + bookingFee + gst

    return {
      subtotal,
      bookingFee,
      gst,
      total
    }
  }, [bookingData])

  const totalAmount = pricing.total

  /* -------------------------------------------------------
     MAIN PAYMENT HANDLER
  ------------------------------------------------------- */
  const handlePayment = async () => {
    if (!bookingData) return;

    setLoading(true);

    try {
      if (paymentMethod === "wallet") {
        return await handleWalletPayment();
      }
      return await handleRazorpayPayment();
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Payment failed!");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     WALLET PAYMENT HANDLER
  ------------------------------------------------------- */
  const handleWalletPayment = async () => {
    if (!wallet) return alert("Unable to load wallet");

    if (wallet.balance < totalAmount) {
      return alert("Insufficient wallet balance!");
    }

    try {
      // Create proper booking payload for wallet payment
      const bookingPayload = {
        booking_type: bookingData.booking_type,
        item_id: bookingData.item_id,
        quantity: bookingData.quantity || 1,
        seats: bookingData.seats || [],
        passenger_details: bookingData.passenger_details || [],
        special_requirements: bookingData.special_requirements || "",
        payment_method: "wallet",
      };

      console.log("Creating wallet booking with payload:", bookingPayload);

      const booking = await bookingsAPI.createBooking(bookingPayload);

      navigate("/confirmation", {
        state: { booking, paymentMethod: "wallet" },
      });
    } catch (error) {
      console.error("Wallet payment error:", error);
      alert(`Wallet payment failed: ${error.message || "Unknown error"}`);
    }
  };

  /* -------------------------------------------------------
     RAZORPAY HANDLER
  ------------------------------------------------------- */
  const handleRazorpayPayment = async () => {
    // Load Razorpay if not already loaded
    if (!razorpayLoaded) {
      await loadRzp();
      if (!razorpayLoaded) {
        return alert("Gateway loading, try again…");
      }
    }

    // Razorpay requires paise
    const order = await paymentsAPI.createOrder({
      amount: Number(totalAmount),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock',
      amount: order.amount,
      currency: order.currency,
      name: "TicketHub",
      description: bookingData.item.title,
      order_id: order.id,

      handler: async (response) => {
        try {
          // First verify the payment
          await paymentsAPI.verifyPayment(response);

          // Then create the booking with proper data structure
          const bookingPayload = {
            booking_type: bookingData.booking_type,
            item_id: bookingData.item_id,
            quantity: bookingData.quantity || 1,
            seats: bookingData.seats || [],
            passenger_details: bookingData.passenger_details || [],
            special_requirements: bookingData.special_requirements || "",
            payment_method: "razorpay",
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          };

          console.log("Creating booking with payload:", bookingPayload);

          const booking = await bookingsAPI.createBooking(bookingPayload);

          navigate("/confirmation", {
            state: { booking, paymentMethod: "razorpay" },
          });
        } catch (err) {
          console.error("Payment verify error:", err);
          alert(`Payment verification failed: ${err.message || "Unknown error"}`);
        }
      },

      prefill: {
        name: user?.full_name,
        email: user?.email,
        contact: user?.phone,
      },
      theme: { color: "#4F46E5" },
    };

    new window.Razorpay(options).open();
  };

  if (!bookingData) return null;

  /* -------------------------------------------------------
     PAYMENT OPTIONS LIST
  ------------------------------------------------------- */
  const paymentMethods = [
    {
      id: "razorpay",
      name: "Debit / Credit Card",
      description: "Visa, MasterCard, Rupay",
      icon: CreditCard,
    },
    {
      id: "upi",
      name: "UPI",
      description: "Google Pay, PhonePe, Paytm",
      icon: Smartphone,
    },
    {
      id: "netbanking",
      name: "Net Banking",
      description: "All major banks",
      icon: Building,
    },
    {
      id: "wallet",
      name: "Wallet",
      description: "Pay using TicketHub wallet balance",
      icon: WalletIcon,
      balance: wallet?.balance || 0,
    },
  ];

  /* -------------------------------------------------------
     JSX RETURN UI
  ------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* -------------------------------- LEFT CARD -------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Select Payment Method
            </CardTitle>
          </CardHeader>

          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v)}
              className="space-y-4"
            >
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition
                    ${paymentMethod === pm.id ? "border-indigo-600 bg-indigo-50" : "hover:bg-gray-100"}`}
                  onClick={() => setPaymentMethod(pm.id)}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem
                      value={pm.id}
                    />
                    <Label htmlFor={pm.id} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <pm.icon className="w-6 h-6 text-gray-600" />
                        <div>
                          <p className="font-semibold">{pm.name}</p>
                          <p className="text-gray-500 text-sm">{pm.description}</p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {pm.id === "wallet" && (
                    <Badge variant="secondary">
                      ₹{pm.balance.toFixed(2)}
                    </Badge>
                  )}
                </div>
              ))}
            </RadioGroup>

            <div className="flex items-center gap-2 mt-4 text-gray-600 text-sm">
              <Lock className="w-4 h-4" /> Secured & encrypted payment
            </div>
          </CardContent>
        </Card>

        {/* -------------------------------- RIGHT CARD -------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex gap-3 mb-4">
              <img
                src={bookingData.item.poster_url}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold">{bookingData.item.title}</h3>
                <p className="text-gray-600 capitalize">
                  {bookingData.booking_type}
                </p>
              </div>
            </div>

            <Separator />

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base Price</span>
                <span>{formatCurrency(pricing.subtotal || 0)}</span>
              </div>

              <div className="flex justify-between">
                <span>Booking Fee (5%)</span>
                <span>{formatCurrency(pricing.bookingFee || 0)}</span>
              </div>

              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span>{formatCurrency(pricing.gst || 0)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-green-600">
                  {formatCurrency(totalAmount || 0)}
                </span>
              </div>

            </div>


            <Button
              className="w-full mt-6 py-6 text-lg font-semibold"
              disabled={loading}
              onClick={handlePayment}
            >
              {loading
                ? "Processing..."
                : `Pay ${formatCurrency(totalAmount)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
