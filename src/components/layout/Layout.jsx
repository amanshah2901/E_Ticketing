import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import {
  Home,
  Ticket,
  User,
  LogOut,
  Menu,
  X,
  Search,
  LayoutDashboard,
  Wallet
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false); // NEW

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-2 rounded-lg shadow-lg">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">TicketHub</span>
            </Link>

            {/* Desktop Search */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md mx-8"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for Movies, Buses, Events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/90 backdrop-blur-sm border-0 focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </form>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/">
                <Button
                  variant="ghost"
                  className={`text-white hover:bg-white/10 ${
                    location.pathname === "/" ? "bg-white/20" : ""
                  }`}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>

              <Link to="/my-bookings">
                <Button
                  variant="ghost"
                  className={`text-white hover:bg-white/10 ${
                    location.pathname === "/my-bookings"
                      ? "bg-white/20"
                      : ""
                  }`}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
              </Link>

              {user?.role === "admin" && (
                <Link to="/admin">
                  <Button
                    variant="ghost"
                    className={`text-white hover:bg-white/10 ${
                      location.pathname === "/admin"
                        ? "bg-white/20"
                        : ""
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  open={dropdownOpen}
                  setOpen={setDropdownOpen}
                  className="w-56"
                >
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.full_name || "Guest"}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                    <Ticket className="w-4 h-4 mr-2" />
                    My Bookings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/90 backdrop-blur-sm border-0"
              />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-indigo-800 border-t border-indigo-600">
            <nav className="px-4 py-3 space-y-1">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>

              <Link to="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/10"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  My Bookings
                </Button>
              </Link>

              {user?.role === "admin" && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-white/10"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}

              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/10"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start text-red-300 hover:bg-white/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-2 rounded-lg">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TicketHub</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your one-stop platform for booking movies, buses, events, and tours.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Search
                  </Link>
                </li>
                <li>
                  <Link
                    to="/my-bookings"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    My Bookings
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a className="text-gray-400 hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} TicketHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
