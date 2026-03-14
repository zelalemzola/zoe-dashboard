"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  CreditCard,
  Truck,
  Wallet,
  Coffee,
  MapPin,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ModeToggle } from "./ModeToggle";

const adminNavItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: MapPin },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Orders", href: "/orders", icon: ShoppingCart },
  { title: "Sales", href: "/sales", icon: Receipt },
  { title: "Credit Tracking", href: "/credits", icon: CreditCard },
  { title: "Providers", href: "/providers", icon: Truck },
  { title: "Costs", href: "/costs", icon: Wallet },
];

const salesNavItems = [
  { title: "Leads", href: "/leads", icon: MapPin },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAdmin ? adminNavItems : salesNavItems;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarRail />
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold truncate">Zoe Coffee</span>
            <span className="text-xs text-muted-foreground truncate">Distribution</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/users")} tooltip="User Management">
                    <Link href="/users">
                      <Shield className="size-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border flex flex-col items-left gap-3" >
        <ModeToggle />
        <div className="p-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Zoe Coffee © {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
