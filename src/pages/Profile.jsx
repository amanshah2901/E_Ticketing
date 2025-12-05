import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { walletAPI } from "@/api/services";
import { useWallet, useWalletTransactions, useAddFunds } from '@/hooks/useWallet'
import { loadRazorpay } from '@/utils/razorpay'
import { formatCurrency, formatDate } from '@/utils'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Wallet as WalletIcon,
  CreditCard,
  Plus,
  Download,
  Shield,
  Bell
} from 'lucide-react'

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const { data: wallet } = useWallet()
  const { data: transactionsData } = useWalletTransactions()
  const addFundsMutation = useAddFunds()
  const [activeTab, setActiveTab] = useState('profile')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || ''
  })
  const [addFundsAmount, setAddFundsAmount] = useState('')

  const transactions = transactionsData?.transactions || []

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData)
      setEditMode(false)
      alert('Profile updated successfully!')
    } catch (error) {
      alert('Failed to update profile: ' + error.message)
    }
  }

  const handleAddFunds = async () => {
    const amount = parseFloat(addFundsAmount);

    if (!amount || amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      // 1️⃣ Load Razorpay SDK
      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        alert("Failed to load payment gateway. Please try again.");
        return;
      }

      // 2️⃣ Create Razorpay Order
      const order = await walletAPI.createWalletOrder(amount);
      console.log("ORDER RESPONSE ===>", order);

      if (!order || !order.id) {
        alert("Failed to create payment order. Please try again.");
        return;
      }

      // 3️⃣ Open Razorpay Popup
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock',
        amount: order.amount, // Already in paise from backend
        currency: order.currency || "INR",
        name: "TicketHub Wallet Recharge",
        description: `Add ₹${amount} to wallet`,
        order_id: order.id,
        prefill: {
          name: user?.full_name || "",
          email: user?.email || "",
          contact: user?.phone || ""
        },
        handler: async function (response) {
          try {
            // 4️⃣ After payment, verify on backend
            const result = await walletAPI.verifyWalletPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount
            });

            if (result.success) {
              alert("Wallet recharge successful! Your balance has been updated.");
              setAddFundsAmount("");
              // Refresh wallet data
              window.location.reload();
            } else {
              alert(result.message || "Payment verification failed. Please contact support.");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Payment verification failed. Please contact support with payment ID: " + response.razorpay_payment_id);
          }
        },
        modal: {
          ondismiss: function() {
            console.log("Payment cancelled by user");
          }
        },
        theme: { color: "#4f46e5" }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description || "Unknown error"}`);
      });
      
      rzp.open();

    } catch (error) {
      console.error("Wallet recharge error:", error);
      alert("Failed to initiate wallet recharge: " + (error.message || "Unknown error"));
    }
  };


  const quickAmounts = [100, 500, 1000, 2000]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold">{user.full_name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {user.role}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <WalletIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600">Wallet Balance</div>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(wallet?.balance || 0)}
                      </div>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center gap-2">
                  <WalletIcon className="w-4 h-4" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Personal Information</span>
                      {!editMode ? (
                        <Button variant="outline" onClick={() => setEditMode(true)}>
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile}>
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          {editMode ? (
                            <Input
                              value={formData.full_name}
                              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                              placeholder="Enter your full name"
                            />
                          ) : (
                            <div className="p-2 border border-transparent rounded">{user.full_name}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <div className="flex items-center gap-2 p-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{user.email}</span>
                            <Badge variant="outline" className="ml-2">
                              {user.email_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          {editMode ? (
                            <Input
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="Enter your phone number"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{user.phone || 'Not provided'}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type
                          </label>
                          <div className="p-2">
                            <Badge variant="default" className="capitalize">
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Wallet Tab */}
              <TabsContent value="wallet">
                <div className="space-y-6">
                  {/* Wallet Balance */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {formatCurrency(wallet?.balance || 0)}
                          </h3>
                          <p className="text-gray-600">Current wallet balance</p>
                        </div>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <WalletIcon className="w-8 h-8 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Add Funds */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Funds to Wallet
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount to Add
                          </label>
                          <Input
                            type="number"
                            value={addFundsAmount}
                            onChange={(e) => setAddFundsAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="text-lg"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {quickAmounts.map(amount => (
                            <Button
                              key={amount}
                              variant="outline"
                              onClick={() => setAddFundsAmount(amount.toString())}
                            >
                              ₹{amount}
                            </Button>
                          ))}
                        </div>

                        <Button 
                          onClick={handleAddFunds}
                          disabled={!addFundsAmount || addFundsMutation.isLoading}
                          className="w-full"
                        >
                          {addFundsMutation.isLoading ? 'Processing...' : 'Add Funds'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transaction History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <WalletIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No transactions yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {transactions.slice(0, 10).map(transaction => (
                            <div key={transaction._id} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    transaction.transaction_type === 'credit' 
                                      ? 'bg-green-100 text-green-600'
                                      : transaction.transaction_type === 'debit'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {transaction.transaction_type === 'credit' ? '↑' : transaction.transaction_type === 'debit' ? '↓' : '↻'}
                                  </div>
                                  <div>
                                    <div className="font-semibold">{transaction.description}</div>
                                    <div className="text-sm text-gray-600">
                                      {formatDate(transaction.created_at || transaction.createdAt)}
                                    </div>
                                    {transaction.reference_id && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Ref: {transaction.reference_id}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-semibold ${
                                    transaction.transaction_type === 'credit' 
                                      ? 'text-green-600'
                                      : transaction.transaction_type === 'debit'
                                      ? 'text-red-600'
                                      : 'text-blue-600'
                                  }`}>
                                    {transaction.transaction_type === 'credit' ? '+' : transaction.transaction_type === 'debit' ? '-' : '+'}
                                    {formatCurrency(transaction.amount)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Balance: {formatCurrency(transaction.balance_after || 0)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Change Password</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Update your password to keep your account secure
                        </p>
                        <Button variant="outline">
                          Change Password
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Add an extra layer of security to your account
                        </p>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          Not Enabled
                        </Badge>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {[
                        {
                          title: 'Booking Notifications',
                          description: 'Get notified about booking confirmations, cancellations, and updates',
                          enabled: true
                        },
                        {
                          title: 'Payment Notifications',
                          description: 'Receive alerts for payment success, failures, and refunds',
                          enabled: true
                        },
                        {
                          title: 'Promotional Emails',
                          description: 'Get updates about new movies, events, and special offers',
                          enabled: false
                        },
                        {
                          title: 'SMS Notifications',
                          description: 'Receive important updates via SMS',
                          enabled: true
                        }
                      ].map((pref, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-semibold">{pref.title}</h4>
                            <p className="text-sm text-gray-600">{pref.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked={pref.enabled} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}




export default Profile