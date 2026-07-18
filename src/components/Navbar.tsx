// "use client"

// import { useRouter, usePathname } from "next/navigation";
// import { useState, useEffect } from "react";

// export default function Navbar() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
//   const [userName, setUserName] = useState<string>('User');

//   useEffect(() => {
//     // Read role and name from localStorage (set at login)
//     if (typeof window !== 'undefined') {
//       const storedRole = localStorage.getItem('userRole');
//       const storedName = localStorage.getItem('userName');
      
//       // Set role based on stored value (case-insensitive check)
//       if (storedRole && storedRole.toLowerCase() === 'admin') {
//         setUserRole('admin');
//       } else {
//         setUserRole('user');
//       }
      
//       // Set user name
//       if (storedName) {
//         setUserName(storedName);
//       }
//     }
//   }, []);

//   return (
//     <nav className="bg-blue-500 text-white px-4 sm:px-6 py-3">
//       <div className="flex justify-between items-center">
//         {/* Desktop Navigation */}
//         <div className="hidden md:flex gap-4 lg:gap-8">
//           {userRole === 'admin' ? (
//             <>
//               <button
//                 onClick={() => router.push("/dashboard")}
//                 className={`px-3 lg:px-4 py-2 rounded font-medium text-sm lg:text-base ${pathname === "/dashboard"
//                     ? "bg-white text-blue-500"
//                     : "text-white hover:bg-blue-600"
//                   }`}
//               >
//                 Dashboard
//               </button>
//               <button
//                 onClick={() => router.push("/invoice-form")}
//                 className={`px-3 lg:px-4 py-2 rounded font-medium text-sm lg:text-base ${pathname === "/invoice-form"
//                     ? "bg-white text-blue-500"
//                     : "text-white hover:bg-blue-600"
//                   }`}
//               >
//                 Invoice Form
//               </button>
//               <button
//                 onClick={() => router.push("/branches")}
//                 className={`px-3 lg:px-4 py-2 rounded font-medium text-sm lg:text-base ${pathname === "/branches"
//                     ? "bg-white text-blue-500"
//                     : "text-white hover:bg-blue-600"
//                   }`}
//               >
//                 Branches
//               </button>
//               <button
//                 onClick={() => router.push("/sales-person")}
//                 className={`px-3 lg:px-4 py-2 rounded font-medium text-sm lg:text-base ${pathname === "/sales-person"
//                     ? "bg-white text-blue-500"
//                     : "text-white hover:bg-blue-600"
//                   }`}
//               >
//                 Sales Person
//               </button>
//             </>
//           ) : (
//               <button
//                 onClick={() => router.push("/billing")}
//                 className={`px-3 lg:px-4 py-2 rounded font-medium text-sm lg:text-base ${pathname === "/billing"
//                   ? "bg-white text-blue-500"
//                   : "text-white hover:bg-blue-600"
//                 }`}
//               >
//                 Billing
//               </button>
//           )}
//         </div>

//         {/* Mobile Menu Button */}
//         <button
//           onClick={() => setIsMenuOpen(!isMenuOpen)}
//           className="md:hidden p-2"
//         >
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//           </svg>
//         </button>

//         {/* Right Side Icons */}
//         <div className="flex items-center gap-2 sm:gap-3">
//           {/* Notifications */}
//           <button
//             title="Notifications"
//             className="relative p-2 rounded hover:bg-blue-600/20"
//             onClick={() => alert('Notifications (placeholder)')}
//           >
//             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
//             </svg>
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">5</span>
//           </button>

//           {/* Account / User name */}
//           <div className="flex items-center gap-2">
//             <button
//               title="Account"
//               onClick={() => alert('Account (placeholder)')}
//               className="p-2 rounded-full bg-white/10 hover:bg-white/20"
//             >
//               <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
//               </svg>
//             </button>
//             <span className="text-sm hidden sm:inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-semibold shadow-md border border-blue-300">
//               {userName}
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Menu */}
//       {isMenuOpen && (
//         <div className="md:hidden mt-3 pb-3 border-t border-blue-400">
//           <div className="flex flex-col gap-2 pt-3">
//             {userRole === 'admin' ? (
//               <>
//                 <button
//                   onClick={() => {
//                     router.push("/dashboard");
//                     setIsMenuOpen(false);
//                   }}
//                   className={`px-4 py-2 rounded font-medium text-left ${pathname === "/dashboard"
//                       ? "bg-white text-blue-500"
//                       : "text-white hover:bg-blue-600"
//                     }`}
//                 >
//                   Dashboard
//                 </button>
//                 <button
//                   onClick={() => {
//                     router.push("/invoice-form");
//                     setIsMenuOpen(false);
//                   }}
//                   className={`px-4 py-2 rounded font-medium text-left ${pathname === "/invoice-form"
//                       ? "bg-white text-blue-500"
//                       : "text-white hover:bg-blue-600"
//                     }`}
//                 >
//                   Invoice Form
//                 </button>
//                 <button
//                   onClick={() => {
//                     router.push("/branches");
//                     setIsMenuOpen(false);
//                   }}
//                   className={`px-4 py-2 rounded font-medium text-left ${pathname === "/branches"
//                       ? "bg-white text-blue-500"
//                       : "text-white hover:bg-blue-600"
//                     }`}
//                 >
//                   Branches
//                 </button>
//                 <button
//                   onClick={() => {
//                     router.push("/sales-person");
//                     setIsMenuOpen(false);
//                   }}
//                   className={`px-4 py-2 rounded font-medium text-left ${pathname === "/sales-person"
//                       ? "bg-white text-blue-500"
//                       : "text-white hover:bg-blue-600"
//                     }`}
//                 >
//                   Sales Person
//                 </button>
//               </>
//             ) : (
//               <button
//                 onClick={() => {
//                   router.push("/billing");
//                   setIsMenuOpen(false);
//                 }}
//                 className={`px-4 py-2 rounded font-medium text-left ${pathname === "/billing"
//                     ? "bg-white text-blue-500"
//                     : "text-white hover:bg-blue-600"
//                   }`}
//               >
//                 Billing
//               </button>
//             )}

//           </div>
//           <div className="flex items-center gap-3 px-4 pt-3 border-t border-blue-400">
//             <button
//               title="Notifications"
//               className="relative p-2 rounded hover:bg-blue-600/10"
//             >
//               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
//               </svg>
//               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">5</span>
//             </button>

//             <button
//               title="Account"
//               className="p-2 rounded-full bg-white/10 hover:bg-white/20"
//             >
//               <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
//                 <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       )}
//     </nav>
//   );
// }
"use client"

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getApiUrl } from "@/lib/api";
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole');
      const storedName = localStorage.getItem('userName');
      
      if (storedRole && storedRole.toLowerCase() === 'admin') {
        setUserRole('admin');
      } else {
        setUserRole('user');
      }
      if (storedName) {
        setUserName(storedName);
      }
    }
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
        await fetch(`${getApiUrl()}/api/auth/logout`, { method: "POST", credentials: "include" });
      localStorage.clear();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 shadow-lg">
      <div className="flex justify-between items-center">
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 lg:gap-4">
          {userRole === 'admin' ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/dashboard"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/invoice-form")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/invoice-form"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Invoice Form
              </button>
              <button
                onClick={() => router.push("/branches")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/branches"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Branches
              </button>
              <button
                onClick={() => router.push("/sales-person")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/sales-person"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Sales Person
              </button>
              <button
                onClick={() => router.push("/inventory-transfer-dashboard")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/inventory-transfer"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Inventory Transfer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/billing")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/billing"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Billing
              </button>
              <button
                onClick={() => router.push("/inventory-transfer-dashboard")}
                className={`px-4 lg:px-5 py-2 rounded-lg font-medium text-sm lg:text-base transition-all duration-200 ${
                  pathname === "/inventory-transfer-dashboard"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/20 hover:shadow-sm"
                }`}
              >
                Inventory Transfer
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Right Side Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <button
            title="Notifications"
            className="relative p-2 rounded-lg hover:bg-white/20 transition-all duration-200"
            onClick={() => alert('Notifications (placeholder)')}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">5</span>
          </button>

          {/* Account / User name */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title="Account"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-center font-semibold">{userName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer hover:bg-red-100"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-sm hidden sm:inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-full font-semibold shadow-md">
              {userName}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-3 pb-3 border-t border-white/20">
          <div className="flex flex-col gap-2 pt-3">
            {userRole === 'admin' ? (
              <>
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    router.push("/invoice-form");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/invoice-form"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Invoice Form
                </button>
                <button
                  onClick={() => {
                    router.push("/branches");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/branches"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Branches
                </button>
                <button
                  onClick={() => {
                    router.push("/sales-person");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/sales-person"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Sales Person
                </button>
                <button
                  onClick={() => {
                    router.push("/inventory-transfer");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/inventory-transfer"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Inventory Transfer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    router.push("/billing");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/billing"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Billing
                </button>
                <button
                  onClick={() => {
                    router.push("/inventory-transfer-dashboard");
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-all duration-200 ${
                    pathname === "/inventory-transfer-dashboard"
                      ? "bg-white text-blue-600 shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  Inventory Transfer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
