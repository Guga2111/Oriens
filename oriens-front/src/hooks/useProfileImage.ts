import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { uploadProfileImage } from '@/services/profileService';

export function useProfileImage() {
  const { userId, updateProfileImage } = useAuth();

  return async (file: File) => {
    if (userId === null) return;
    try {
      updateProfileImage(await uploadProfileImage(userId, file));
    } catch {
      toast.error('Não foi possível atualizar sua imagem. Tente novamente.');
    }
  };
}
