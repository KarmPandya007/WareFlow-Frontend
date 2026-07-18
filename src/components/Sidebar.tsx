// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { 
//   LayoutDashboard, 
//   FileText, 
//   Building2, 
//   Users, 
//   ArrowRightLeft, 
//   LogOut,
//   ChevronRight
// } from "lucide-react";

// interface SidebarProps {
//   isOpen: boolean;
//   setIsOpen: (open: boolean) => void;
//   userRole: string; // 'admin' | 'user'
// }

// export default function Sidebar({ isOpen, setIsOpen, userRole }: SidebarProps) {
//   const pathname = usePathname();

//   const links = userRole === 'admin' ? [
//     { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
//     { href: "/invoice-form", label: "Invoice Form", icon: FileText },
//     { href: "/branches", label: "Branches", icon: Building2 },
//     { href: "/sales-person", label: "Sales Person", icon: Users },
//     { href: "/inventory-transfer-dashboard", label: "Inventory Transfer", icon: ArrowRightLeft },
//   ] : [
//     { href: "/billing", label: "Billing", icon: FileText },
//     { href: "/inventory-transfer-form", label: "Inventory Transfer", icon: ArrowRightLeft },
//   ];

//   const handleLogout = () => {
//     // Logic usually handled in layout or header, but good to have here if needed
//     // or just a visual button that triggers the parent handler
//     if (typeof window !== "undefined") {
//       window.localStorage.clear();
//       window.location.href = "/";
//     }
//   };

//   return (
//     <>
//       {/* Mobile Overlay */}
//       <div 
//         className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${
//           isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//         }`}
//         onClick={() => setIsOpen(false)}
//       />

//       {/* Sidebar */}
//       <aside 
//         className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
//           isOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <div className="flex flex-col h-full">
//           {/* Logo Area */}
//           <div className="h-16 flex items-center px-6 border-b border-gray-100">
//             <div className="flex items-center gap-2 font-bold text-xl text-blue-600 tracking-tight">
//               <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">
//                 HP
//               </div>
//               <span>Billing</span>
//             </div>
//           </div>

//           {/* Navigation */}
//           <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
//             <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
//               Menu
//             </div>
//             {links.map((link) => {
//               const Icon = link.icon;
//               const isActive = pathname === link.href;
//               return (
//                 <Link
//                   key={link.href}
//                   href={link.href}
//                   onClick={() => setIsOpen(false)}
//                   className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
//                     isActive 
//                       ? "bg-blue-50 text-blue-600 shadow-sm"
//                       : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
//                   }`}
//                 >
//                   <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
//                   <span className="font-medium text-sm">{link.label}</span>
//                   {isActive && (
//                     <ChevronRight className="w-4 h-4 ml-auto text-blue-600" />
//                   )}
//                 </Link>
//               );
//             })}
//           </nav>

//           {/* User / Footer */}
//           <div className="p-4 border-t border-gray-100">
//              <button 
//                 onClick={handleLogout}
//                 className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
//              >
//                 <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
//                 <span className="font-medium text-sm">Sign Out</span>
//              </button>
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Users, 
  ArrowRightLeft, 
  LogOut,
  ChevronRight,
  Target,
  Calendar,
  BookOpen
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userRole: string; // 'admin' | 'user'
}

export default function Sidebar({ isOpen, setIsOpen, userRole }: SidebarProps) {
  const pathname = usePathname();

  const links = userRole === 'admin' ? [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/billing", label: "Billing", icon: FileText },
    { href: "/invoice-form", label: "Invoice Form", icon: FileText },
    { href: "/advance-booking", label: "Advance Booking", icon: Calendar },
    { href: "/daybook", label: "Day Book", icon: BookOpen },
    { href: "/branches", label: "Branches", icon: Building2 },
    { href: "/sales-person", label: "Sales Person", icon: Users },
    { href: "/targets", label: "Targets", icon: Target },
    { href: "/inventory-transfer-dashboard", label: "Inventory Transfer", icon: ArrowRightLeft },
  ] : [
    { href: "/billing", label: "Billing", icon: FileText },
    { href: "/advance-booking", label: "Advance Booking", icon: Calendar },
    { href: "/my-targets", label: "My Targets", icon: Target },
    { href: "/inventory-transfer-dashboard", label: "Inventory Transfer", icon: ArrowRightLeft },
  ];

  const handleLogout = () => {
    // Logic usually handled in layout or header, but good to have here if needed
    // or just a visual button that triggers the parent handler
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <div className="flex items-center gap-2 font-bold text-xl text-blue-600 tracking-tight">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">
                HP
              </div>
              <span>Billing</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
              Menu
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? "bg-blue-50 text-blue-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                  <span className="font-medium text-sm">{link.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User / Footer */}
          <div className="p-4 border-t border-gray-100">
             <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
             >
                <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                <span className="font-medium text-sm">Sign Out</span>
             </button>
          </div>
        </div>
      </aside>
    </>
  );
}