# API Service Layer Documentation

This document provides comprehensive documentation for the API service layer used in the Ocean Stride application. The API layer is built on top of IndexedDB and provides a clean, type-safe interface for data operations.

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Usage](#usage)
   - [Basic CRUD Operations](#basic-crud-operations)
   - [Querying Data](#querying-data)
   - [Pagination](#pagination)
   - [Error Handling](#error-handling)
4. [Available Repositories](#available-repositories)
5. [React Query Integration](#react-query-integration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

The API service layer provides a unified interface for data operations across the application. It includes:

- Type-safe data access with TypeScript
- Built-in validation using Zod schemas
- Support for complex queries and relationships
- Integration with React Query for state management
- Error handling and logging

## Installation

The API layer is included in the project by default. No additional installation is required.

## Usage

### Basic CRUD Operations

#### Creating Records

```typescript
import { api } from '@/lib/api';

// Create a new seafarer
const newSeafarer = await api.create('seafarers', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  // ...other fields
});
```

#### Reading Records

```typescript
// Get a single record by ID
const seafarer = await api.find('seafarers', '123');

// Get all records
const allSeafarers = await api.findAll('seafarers');

// Get records with filters
const activeSeafarers = await api.findAll('seafarers', {
  'employment.status': 'active',
});
```

#### Updating Records

```typescript
// Update a record
const updatedSeafarer = await api.update('seafarers', '123', {
  email: 'new.email@example.com',
});
```

#### Deleting Records

```typescript
// Delete a record
await api.delete('seafarers', '123');
```

### Querying Data

The API supports complex queries using the `findAll` method:

```typescript
// Find seafarers with multiple conditions
const seafarers = await api.findAll('seafarers', {
  'employment.status': 'active',
  'contact.country': 'Norway',
  'rank': 'Captain',
});

// Find seafarers with date range
const recentHires = await api.findAll('seafarers', {
  'employment.hireDate': {
    $gte: '2023-01-01',
    $lte: '2023-12-31',
  },
});
```

### Pagination

For large datasets, use pagination:

```typescript
// Get first page with 10 items
const page1 = await api.findAll('seafarers', {}, { page: 1, pageSize: 10 });

// Get next page
const page2 = await api.findAll('seafarers', {}, { page: 2, pageSize: 10 });
```

### Error Handling

The API throws `ApiError` for all errors. Handle them with try/catch:

```typescript
try {
  const result = await api.find('seafarers', 'invalid-id');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.status}: ${error.message}`);
    console.error('Details:', error.data);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Available Repositories

The following repositories are available:

- `companies`: Company management
- `seafarers`: Seafarer profiles and data
- `vessels`: Vessel information
- `crewAssignments`: Crew scheduling and assignments
- `payroll`: Payroll records
- `documents`: Document management
- `certificates`: Certification tracking
- `users`: User accounts and authentication
- `auditLogs`: System audit trail

## React Query Integration

The API layer includes React Query hooks for easy data fetching and state management:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';

// Query example
function useSeafarer(id: string) {
  return useQuery({
    queryKey: queryKeys.seafarers.detail(id),
    queryFn: () => api.find('seafarers', id),
  });
}

// Mutation example
function useUpdateSeafarer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }) => api.update('seafarers', id, updates),
    onSuccess: (data, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.seafarers.detail(id) });
    },
  });
}
```

## Best Practices

1. **Use TypeScript**: Always type your API calls for better safety and IDE support.
2. **Error Handling**: Always handle API errors gracefully.
3. **Caching**: Leverage React Query's caching mechanisms to minimize network requests.
4. **Pagination**: Use pagination for large datasets to improve performance.
5. **Validation**: Validate all data before sending it to the API.

## Troubleshooting

### Common Issues

1. **Data Not Updating**:
   - Ensure you're calling `invalidateQueries` after mutations
   - Check the React Query devtools for cache status

2. **Validation Errors**:
   - Verify that all required fields are provided
   - Check that field types match the schema

3. **Performance Issues**:
   - Use pagination for large datasets
   - Consider using `select` to only fetch needed fields
   - Implement proper indexing in your database schema

### Debugging

To debug API calls:

1. Check the browser's console for error messages
2. Use the `logger` utility to log API calls and responses
3. Inspect IndexedDB in the browser's developer tools

## License

This project is proprietary software. All rights reserved.

---

*Documentation generated on: 2023-09-13*
