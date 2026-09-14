import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, User, Settings, BookOpen, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  required?: boolean;
}

interface OnboardingFlowProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
  storageKey?: string;
  className?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  steps,
  onComplete,
  onSkip,
  storageKey = 'onboarding_completed',
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (completed === 'true') {
      onComplete();
    }
  }, [storageKey, onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      localStorage.setItem(storageKey, 'true');
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    onSkip?.();
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{steps[currentStep].icon}</div>
              <div>
                <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          <div className="min-h-[300px] flex items-center justify-center">
            {steps[currentStep].content}
          </div>
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep
                    ? 'bg-primary'
                    : completedSteps.has(index)
                    ? 'bg-primary/60'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="gap-2">
            {currentStep === steps.length - 1 ? (
              <>
                Get Started
                <CheckCircle className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Predefined onboarding steps
export const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Ocean Stride',
    description: 'Your maritime personnel management solution',
    icon: <User className="h-6 w-6" />,
    content: (
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">🚢</div>
        <h2 className="text-2xl font-bold">Welcome aboard!</h2>
        <p className="text-muted-foreground max-w-md">
          Ocean Stride helps you manage seafarer assignments, payroll, and compliance
          with ease. Let's get you started with a quick tour.
        </p>
      </div>
    )
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Get a quick overview of your operations',
    icon: <Settings className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Dashboard</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>View key metrics and KPIs</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Monitor active assignments</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Track payroll status</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'personnel',
    title: 'Managing Personnel',
    description: 'Add and manage your seafarer database',
    icon: <User className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personnel Management</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">Seafarer Profiles</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Personal information</li>
              <li>• Certifications & licenses</li>
              <li>• Medical records</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Assignments</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Vessel assignments</li>
              <li>• Contract details</li>
              <li>• Rotation schedules</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'payroll',
    title: 'Payroll Processing',
    description: 'Handle salaries and payments efficiently',
    icon: <BookOpen className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payroll Features</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">1</span>
            </div>
            <div>
              <p className="font-medium">Create Payroll Entries</p>
              <p className="text-sm text-muted-foreground">Set up salary calculations and deductions</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">2</span>
            </div>
            <div>
              <p className="font-medium">Approval Workflow</p>
              <p className="text-sm text-muted-foreground">Review and approve before payment</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">3</span>
            </div>
            <div>
              <p className="font-medium">Payment Processing</p>
              <p className="text-sm text-muted-foreground">Multiple payment methods supported</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'getting-started',
    title: 'Ready to Start',
    description: 'You\'re all set to use Ocean Stride',
    icon: <Play className="h-6 w-6" />,
    content: (
      <div className="text-center space-y-4">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground max-w-md">
          Start by adding your first seafarer or exploring the dashboard.
          Remember, you can always access help and documentation from the menu.
        </p>
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Pro tip:</strong> Use the search function to quickly find seafarers,
            assignments, or documents.
          </p>
        </div>
      </div>
    )
  }
];

// Hook for managing onboarding state
export function useOnboarding(storageKey = 'onboarding_completed') {
  const [isCompleted, setIsCompleted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === 'true';
    setIsCompleted(completed);
    setShowOnboarding(!completed);
  }, [storageKey]);

  const completeOnboarding = () => {
    localStorage.setItem(storageKey, 'true');
    setIsCompleted(true);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(storageKey);
    setIsCompleted(false);
    setShowOnboarding(true);
  };

  return {
    isCompleted,
    showOnboarding,
    completeOnboarding,
    resetOnboarding
  };
}