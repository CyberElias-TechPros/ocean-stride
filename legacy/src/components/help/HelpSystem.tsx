import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import {
  Search,
  Book,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileText,
  Video,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  views?: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface HelpSystemProps {
  articles?: HelpArticle[];
  faqs?: FAQ[];
  onContactSupport?: () => void;
  className?: string;
}

const defaultArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Ocean Stride',
    content: `
      <h3>Welcome to Ocean Stride!</h3>
      <p>This guide will help you get started with managing your maritime personnel.</p>

      <h4>Initial Setup</h4>
      <ol>
        <li>Create your company profile</li>
        <li>Add your first vessel</li>
        <li>Import or add seafarer records</li>
        <li>Set up rank and department structures</li>
      </ol>

      <h4>Key Features</h4>
      <ul>
        <li><strong>Personnel Management:</strong> Comprehensive seafarer database</li>
        <li><strong>Assignment Tracking:</strong> Monitor vessel assignments and rotations</li>
        <li><strong>Payroll Processing:</strong> Automated salary calculations</li>
        <li><strong>Compliance:</strong> Certification and document management</li>
      </ul>
    `,
    category: 'Getting Started',
    tags: ['onboarding', 'setup', 'basics'],
    lastUpdated: '2024-01-15',
    views: 1250
  },
  {
    id: 'adding-seafarer',
    title: 'How to Add a New Seafarer',
    content: `
      <h3>Adding Seafarer Records</h3>
      <p>Follow these steps to add a new seafarer to your database.</p>

      <h4>Step-by-Step Process</h4>
      <ol>
        <li>Navigate to the Personnel section</li>
        <li>Click "Add Seafarer" button</li>
        <li>Fill in personal information (name, contact details, etc.)</li>
        <li>Add certifications and qualifications</li>
        <li>Upload required documents</li>
        <li>Save the record</li>
      </ol>

      <h4>Required Information</h4>
      <ul>
        <li>Full name and contact details</li>
        <li>Date of birth and nationality</li>
        <li>Seafarer identification number</li>
        <li>Current rank and department</li>
        <li>Medical certificates</li>
        <li>STCW certificates</li>
      </ul>
    `,
    category: 'Personnel',
    tags: ['seafarer', 'add', 'personnel'],
    lastUpdated: '2024-01-10',
    views: 890
  },
  {
    id: 'payroll-setup',
    title: 'Setting Up Payroll Processing',
    content: `
      <h3>Payroll Configuration</h3>
      <p>Learn how to configure payroll settings for accurate salary calculations.</p>

      <h4>Basic Salary Setup</h4>
      <ol>
        <li>Define rank-based salaries</li>
        <li>Set currency and payment frequency</li>
        <li>Configure overtime rates</li>
        <li>Define deduction types</li>
      </ol>

      <h4>Advanced Features</h4>
      <ul>
        <li><strong>Tax Calculations:</strong> Automatic tax withholding</li>
        <li><strong>Allowances:</strong> Hardship, danger pay, etc.</li>
        <li><strong>Multi-currency:</strong> Support for different currencies</li>
        <li><strong>Approval Workflows:</strong> Multi-level approval process</li>
      </ul>
    `,
    category: 'Payroll',
    tags: ['payroll', 'salary', 'configuration'],
    lastUpdated: '2024-01-08',
    views: 675
  }
];

const defaultFAQs: FAQ[] = [
  {
    id: 'login-issue',
    question: 'I cannot log in to my account',
    answer: 'If you\'re having trouble logging in, try resetting your password. If that doesn\'t work, contact your administrator or support team.',
    category: 'Account'
  },
  {
    id: 'add-document',
    question: 'How do I upload documents for a seafarer?',
    answer: 'Go to the seafarer\'s profile, click on the "Documents" tab, and use the upload button to add new documents. Supported formats include PDF, JPG, and PNG.',
    category: 'Documents'
  },
  {
    id: 'payroll-calculation',
    question: 'Why is my payroll calculation incorrect?',
    answer: 'Payroll calculations depend on the rank salary, overtime hours, and deductions configured. Check the assignment details and payroll settings.',
    category: 'Payroll'
  },
  {
    id: 'certificate-expiry',
    question: 'How do I get notified about expiring certificates?',
    answer: 'The system automatically sends notifications 30 days before certificate expiry. You can also view expiry dates in the Compliance dashboard.',
    category: 'Compliance'
  }
];

export const HelpSystem: React.FC<HelpSystemProps> = ({
  articles = defaultArticles,
  faqs = defaultFAQs,
  onContactSupport,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const categories = ['all', ...Array.from(new Set([...articles.map(a => a.category), ...faqs.map(f => f.category)]))];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={cn('max-w-6xl mx-auto p-6', className)}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Help & Documentation</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn how to use Ocean Stride effectively.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search help articles and FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles" className="gap-2">
            <Book className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {selectedArticle ? (
            <div>
              <Button
                variant="ghost"
                onClick={() => setSelectedArticle(null)}
                className="mb-4 gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to Articles
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary">{selectedArticle.category}</Badge>
                        <span>Last updated: {selectedArticle.lastUpdated}</span>
                        {selectedArticle.views && <span>{selectedArticle.views} views</span>}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                  />
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedArticle.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map(article => (
                <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                      <span className="text-xs">{article.lastUpdated}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {article.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(article)}
                      className="p-0 h-auto text-primary hover:text-primary/80"
                    >
                      Read more <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Accordion type="single" collapsible className="space-y-2">
            {filteredFAQs.map(faq => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">
                  <div>
                    <div className="font-medium">{faq.question}</div>
                    <Badge variant="outline" className="text-xs mt-1">{faq.category}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-muted-foreground">{faq.answer}</div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need help? Our support team is here to assist you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Live Chat
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get instant help from our support team during business hours.
                  </p>
                  <Button size="sm" onClick={onContactSupport}>
                    Start Chat
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentation
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Browse our comprehensive documentation and guides.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/docs" target="_blank" rel="noopener noreferrer">
                      View Docs <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Tutorials
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Watch step-by-step video guides for common tasks.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/tutorials" target="_blank" rel="noopener noreferrer">
                      Watch Videos <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Email Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Send us an email for complex issues or feature requests.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:support@oceanstride.com">
                      Email Us <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Quick help tooltip component
interface QuickHelpProps {
  title: string;
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const QuickHelp: React.FC<QuickHelpProps> = ({
  title,
  content,
  children,
  placement = 'top'
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowHelp(true)}
        onMouseLeave={() => setShowHelp(false)}
      >
        {children}
      </div>

      {showHelp && (
        <div className={cn(
          'absolute z-50 p-3 bg-popover border rounded-md shadow-md max-w-xs',
          {
            'bottom-full left-1/2 transform -translate-x-1/2 mb-2': placement === 'top',
            'top-full left-1/2 transform -translate-x-1/2 mt-2': placement === 'bottom',
            'right-full top-1/2 transform -translate-y-1/2 mr-2': placement === 'left',
            'left-full top-1/2 transform -translate-y-1/2 ml-2': placement === 'right'
          }
        )}>
          <h4 className="font-medium text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{content}</p>
        </div>
      )}
    </div>
  );
};