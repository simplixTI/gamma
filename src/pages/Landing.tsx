import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Ship, MapPin, Navigation, CreditCard, Shield, Clock, Users, Anchor, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { useAuthContext } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'passenger') {
        navigate('/passenger');
      } else if (role === 'pilot') {
        navigate('/pilot');
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-foreground overflow-x-hidden">

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
        {/* Background decorative SVG */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroGlow)" />
          <path
            d="M0 60% Q25% 55% 50% 60% Q75% 65% 100% 60% L100% 100% L0 100% Z"
            fill="rgba(14,165,233,0.04)"
          />
          <path
            d="M0 70% Q25% 65% 50% 70% Q75% 75% 100% 70% L100% 100% L0 100% Z"
            fill="rgba(14,165,233,0.03)"
          />
          <path
            d="M0 80% Q25% 75% 50% 80% Q75% 85% 100% 80% L100% 100% L0 100% Z"
            fill="rgba(14,165,233,0.025)"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center max-w-xl w-full animate-fade-in">
          <div className="mb-8">
            <Logo size="lg" variant="white" showSubtitle />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight mb-4 animate-slide-up">
            O jeito mais fácil de{' '}
            <span className="text-cyan-400">atravessar a Ilha</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-md mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transporte aquático por pool na Ilha da Gigoia. Rápido, seguro e compartilhado.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button
              onClick={() => navigate('/auth/passenger')}
              className="flex-1 gap-2 h-13 text-base bg-cyan-500 hover:bg-cyan-400 text-white font-semibold cursor-pointer"
              size="lg"
              aria-label="Entrar como Passageiro"
            >
              <User className="w-5 h-5" />
              Sou Passageiro
            </Button>
            <Button
              onClick={() => navigate('/auth/pilot')}
              variant="outline"
              className="flex-1 gap-2 h-13 text-base border-white/20 text-primary-foreground hover:bg-white/10 cursor-pointer"
              size="lg"
              aria-label="Entrar como Piloto"
            >
              <Ship className="w-5 h-5" />
              Sou Piloto
            </Button>
          </div>
        </div>

        <a
          href="#como-funciona"
          aria-label="Ver como funciona"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer animate-fade-in"
          style={{ animationDelay: '0.6s' }}
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-base">Três passos simples para sua travessia</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: MapPin,
              step: '01',
              title: 'Escolha seu trapiche',
              desc: 'Selecione o ponto de embarque mais próximo de você na Ilha da Gigoia.',
            },
            {
              icon: Navigation,
              step: '02',
              title: 'Piloto aceita e vem até você',
              desc: 'Um piloto verificado aceita sua solicitação e navega até o seu trapiche.',
            },
            {
              icon: CreditCard,
              step: '03',
              title: 'Pague com PIX ou cartão',
              desc: 'Pagamento rápido e seguro direto pelo app, sem complicação.',
            },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div
              key={step}
              className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col gap-4 animate-scale-in"
            >
              <span className="absolute top-4 right-5 text-4xl font-black text-white/5 select-none">
                {step}
              </span>
              <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POR QUE GAMMA */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
              Por que Gamma?
            </h2>
            <p className="text-muted-foreground text-base">A melhor experiência de transporte aquático</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: Clock,
                title: 'Rápido',
                desc: 'Barcos disponíveis 24/7 nos principais trapiches da Ilha.',
              },
              {
                icon: Shield,
                title: 'Seguro',
                desc: 'Pilotos verificados, avaliados e com documentação em dia.',
              },
              {
                icon: Users,
                title: 'Compartilhado',
                desc: 'Divide o trajeto com outros passageiros e divide o custo.',
              },
              {
                icon: CreditCard,
                title: 'Pague fácil',
                desc: 'PIX instantâneo ou cartão de crédito — você escolhe no app.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÁREA DE SERVIÇO */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-5">
              <MapPin className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-cyan-400 text-sm font-medium">Área de atendimento</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
              Navegando pela Ilha da Gigoia
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md">
              Atendemos os trapiches da Ilha da Gigoia e arredores, Barra da Tijuca, Rio de Janeiro.
              Conectamos você aos principais pontos de embarque e desembarque da região.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="shrink-0 w-64 h-64 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center gap-4 relative overflow-hidden"
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="128" cy="128" r="80" stroke="#22d3ee" strokeWidth="1" />
              <circle cx="128" cy="128" r="120" stroke="#22d3ee" strokeWidth="0.5" />
              <path d="M48 128 Q88 108 128 128 Q168 148 208 128" stroke="#22d3ee" strokeWidth="1" fill="none" />
              <path d="M48 148 Q88 128 128 148 Q168 168 208 148" stroke="#22d3ee" strokeWidth="0.8" fill="none" />
              <path d="M48 168 Q88 148 128 168 Q168 188 208 168" stroke="#22d3ee" strokeWidth="0.6" fill="none" />
            </svg>
            <Anchor className="w-14 h-14 text-cyan-400 relative z-10" />
            <span className="text-sm text-cyan-400/80 font-medium relative z-10">Ilha da Gigoia</span>
            <span className="text-xs text-muted-foreground relative z-10">Barra da Tijuca · RJ</span>
          </div>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Logo size="md" variant="white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Baixe o app Gamma
          </h2>
          <p className="text-muted-foreground mb-10 text-base">
            Disponível em breve na App Store e Google Play.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Apple App Store Badge */}
            <a
              href="#"
              aria-label="Baixar na App Store (em breve)"
              className="cursor-pointer opacity-60 hover:opacity-90 transition-opacity"
            >
              <svg
                role="img"
                width="160"
                height="52"
                viewBox="0 0 160 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="160" height="52" rx="10" fill="#000" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" />
                <text x="55" y="20" fill="white" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.8">Disponível na</text>
                <text x="49" y="37" fill="white" fontSize="16" fontWeight="600" fontFamily="Inter, sans-serif">App Store</text>
                <g transform="translate(16,12)">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.84zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                </g>
              </svg>
            </a>

            {/* Google Play Badge */}
            <a
              href="#"
              aria-label="Disponível no Google Play (em breve)"
              className="cursor-pointer opacity-60 hover:opacity-90 transition-opacity"
            >
              <svg
                role="img"
                width="160"
                height="52"
                viewBox="0 0 160 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="160" height="52" rx="10" fill="#000" stroke="#fff" strokeOpacity="0.25" strokeWidth="1" />
                <text x="55" y="20" fill="white" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.8">Disponível no</text>
                <text x="46" y="37" fill="white" fontSize="16" fontWeight="600" fontFamily="Inter, sans-serif">Google Play</text>
                <g transform="translate(15,13)">
                  <path d="M1.22.98C.89 1.33.7 1.87.7 2.56v21.88c0 .69.19 1.23.52 1.58l.08.08 12.26-12.26v-.29L1.3.9l-.08.08z" fill="url(#gp1)" />
                  <path d="M17.65 17.93l-4.09-4.09v-.29l4.09-4.09.09.05 4.84 2.75c1.38.78 1.38 2.06 0 2.85l-4.84 2.75-.09.07z" fill="url(#gp2)" />
                  <path d="M17.74 17.86L13.56 13.7 1.22 26.02c.46.48 1.21.54 2.06.06l14.46-8.22" fill="url(#gp3)" />
                  <path d="M17.74 9.54L3.28 1.32C2.43.84 1.68.9 1.22 1.38L13.56 13.7l4.18-4.16z" fill="url(#gp4)" />
                  <defs>
                    <linearGradient id="gp1" x1="13.03" y1="1.78" x2="-4.7" y2="19.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00A0FF" />
                      <stop offset="1" stopColor="#00A0FF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gp2" x1="23.81" y1="13.7" x2=".7" y2="13.7" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFD600" />
                      <stop offset="1" stopColor="#FF6D00" />
                    </linearGradient>
                    <linearGradient id="gp3" x1="15.58" y1="16.14" x2="-3.93" y2="35.65" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FF3A44" />
                      <stop offset="1" stopColor="#C31162" />
                    </linearGradient>
                    <linearGradient id="gp4" x1="-1.32" y1="-5.2" x2="8.64" y2="4.77" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#32A071" />
                      <stop offset="1" stopColor="#2DA771" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/60">
            Em breve nas lojas. Use o app web por enquanto.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 text-center">
          <Logo size="sm" variant="white" />

          <nav aria-label="Links do rodapé" className="flex gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Política de Privacidade
            </Link>
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Termos de Uso
            </Link>
          </nav>

          <div className="text-xs text-muted-foreground/50 space-y-1">
            <p>Ilha da Gigoia &bull; Barra da Tijuca &bull; Rio de Janeiro</p>
            <p>&copy; 2025 Gamma &middot; Desenvolvido por Simplix</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
