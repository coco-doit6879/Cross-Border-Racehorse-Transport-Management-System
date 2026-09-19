import { useAuthStore } from '../store/useAuthStore';

const useCurrentUser = () => {
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const profileError = useAuthStore((state) => state.profileError);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);

  return {
    user,
    loading: sessionStatus === 'idle' || sessionStatus === 'checking',
    error: profileError,
    retry: () => bootstrapSession({ force: true })
  };
};

export default useCurrentUser;
