import { useNavigate } from 'react-router-dom';
import { User, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuthContext();

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'passenger') {
        navigate('/passenger');
      } else if (role === 'pilot') {
        navigate('/pilot');
      }
    }
  }, [user, role, loading, navigate]);

  const handlePassenger = () => {
    navigate('/auth/passenger');
  };

  const handlePilot = () => {
    navigate('/auth/pilot');
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-primary flex flex-col items-center justify-center px-6 py-8 safe-area-inset">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {/* Logo Section */}
        <div className="mb-16 animate-fade-in">
          <Logo size="lg" showSubtitle variant="white" />
        </div>

        {/* Buttons Section */}
        <div className="w-full space-y-3 animate-slide-up">
          <Button
            variant="secondary"
            size="xl"
            fullWidth
            onClick={handlePassenger}
            className="gap-3 h-14 text-base bg-card text-foreground hover:bg-card/90"
          >
            <User className="w-5 h-5" />
            Entrar como Passageiro
          </Button>

          <Button
            variant="outline"
            size="xl"
            fullWidth
            onClick={handlePilot}
            className="gap-3 h-14 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Ship className="w-5 h-5" />
            Entrar como Piloto
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-6 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <p className="text-primary-foreground/60 text-sm">
          Ilha da Gigoia • Barra da Tijuca
        </p>
        <p className="text-primary-foreground/30 text-[11px] mt-1">Desenvolvido por Simplix</p>
      </footer>
    </div>
  );
};

export default Landing;
