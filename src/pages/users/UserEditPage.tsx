import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useUpdateUser } from '@/hooks/queries/useUserQueries';
import { UserForm } from '@/components/users/UserForm';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: user, isLoading, isError } = useUser(id || '');
  const updateUser = useUpdateUser(id || '');

  const handleSubmit = async (data: any) => {
    if (!id) return;
    
    try {
      await updateUser.mutateAsync(data);
      toast.success('User updated successfully');
      navigate(ROUTES.USERS.DETAILS(id));
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading user. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit User</h1>
        <p className="text-muted-foreground">Update user information</p>
      </div>
      
      <div className="max-w-2xl">
        <UserForm 
          initialData={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }}
          onSubmit={handleSubmit}
          isLoading={updateUser.isPending}
        />
      </div>
    </div>
  );
}
