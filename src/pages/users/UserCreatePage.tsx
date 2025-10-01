import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '@/hooks/queries/useUserQueries';
import { UserForm } from '@/components/users/UserForm';
import { toast } from 'sonner';
import { ROUTES } from '@/config/routes';

export default function UserCreatePage() {
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const handleSubmit = async (data: any) => {
    try {
      await createUser.mutateAsync(data);
      toast.success('User created successfully');
      navigate(ROUTES.USERS.LIST);
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New User</h1>
        <p className="text-muted-foreground">
          Add a new user to the system
        </p>
      </div>
      
      <div className="max-w-2xl">
        <UserForm 
          onSubmit={handleSubmit}
          isLoading={createUser.isPending}
        />
      </div>
    </div>
  );
}
