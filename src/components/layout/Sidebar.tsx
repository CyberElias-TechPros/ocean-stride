import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  Ship,
  UserPlus,
  DollarSign,
  Shield,
  BarChart3,
  Settings,
  Home,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Personnel', href: '/personnel' },
  { icon: Ship, label: 'Fleet & Roster', href: '/fleet' },
  { icon: UserPlus, label: 'Recruitment', href: '/recruitment' },
  { icon: DollarSign, label: 'Payroll', href: '/payroll' },
  { icon: Shield, label: 'Compliance', href: '/compliance' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(location.pathname);

  useEffect(() => {
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const handleNavigation = (href: string) => {
    setActiveItem(href);
    navigate(href);
  };

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <div className={cn(
          "flex items-center space-x-3 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}>
          <div className="w-8 h-8 ocean-gradient rounded-lg flex items-center justify-center">
            <Ship className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">SeaManager</h1>
            <p className="text-xs text-muted-foreground">Crew Management</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-8 h-8 p-0"
        >
          <ChevronRight className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.href;
          
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start h-10 transition-all duration-200",
                isActive && "ocean-gradient shadow-ocean",
                !isOpen && "justify-center px-0"
              )}
              onClick={() => handleNavigation(item.href)}
            >
              <Icon className={cn(
                "w-5 h-5",
                isOpen ? "mr-3" : "mr-0"
              )} />
              
              <span className={cn(
                "transition-opacity duration-200 text-sm",
                isOpen ? "opacity-100" : "opacity-0 w-0"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "absolute bottom-4 left-4 right-4 p-3 bg-muted rounded-lg transition-opacity duration-200",
        isOpen ? "opacity-100" : "opacity-0"
      )}>
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">System Status</p>
          <p className="text-success">● All systems operational</p>
        </div>
      </div>
    </div>
  );
}