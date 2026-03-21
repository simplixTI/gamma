import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22d3ee]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#000000', color: '#ffffff' }}>

      {/* ───── KEYFRAMES ───── */}
      <style>{`
        @keyframes linePulse {
          from { opacity: 0.3; }
          to   { opacity: 1; }
        }
        @keyframes beamSlide {
          from { transform: translateX(-12px); opacity: 0.4; }
          to   { transform: translateX(12px);  opacity: 1; }
        }
        @keyframes beamRise {
          from { transform: translateY(10px); opacity: 0.4; }
          to   { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderGlow {
          from { box-shadow: 0 0 0px 0px rgba(34,211,238,0); border-color: rgba(255,255,255,0.07); }
          to   { box-shadow: 0 0 18px 2px rgba(34,211,238,0.10); border-color: rgba(34,211,238,0.22); }
        }
        @keyframes textGlow {
          from { text-shadow: 0 0 0px rgba(34,211,238,0); }
          to   { text-shadow: 0 0 12px rgba(34,211,238,0.55); }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-anim, .fade-in-up { animation: none !important; }
        }
      `}</style>

      {/* ───── NAVBAR ───── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 sm:px-10 py-4">

          {/* Left — Logo */}
          <Logo size="sm" variant="white" />

          {/* Center — nav links (desktop only) */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Navegação principal">
            {[
              { label: 'Como funciona', id: 'como-funciona' },
              { label: 'Área de atendimento', id: 'area' },
              { label: 'Para pilotos', id: 'para-pilotos' },
            ].map(({ label, id }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={scrollTo(id)}
                className="cursor-pointer transition-colors duration-200"
                style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.50)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.50)')}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right — CTA */}
          <button
            onClick={() => navigate('/auth/passenger')}
            className="cursor-pointer transition-all duration-200"
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '9999px',
              padding: '0.375rem 1rem',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.30)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.70)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
            }}
          >
            Entrar
          </button>
        </div>
      </header>

      {/* ───── HERO ───── */}
      <section
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-32"
        style={{ backgroundColor: '#000000' }}
      >
        {/* Beam vertical — esquerda hero */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', left: '12%', top: '8%', width: '1px', height: '280px', background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.45) 50%, transparent 100%)', pointerEvents: 'none', animation: 'beamRise 6s ease-in-out infinite alternate' }} />

        {/* Beam horizontal — inferior direito hero */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', right: '6%', bottom: '14%', width: '280px', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.35) 50%, transparent 100%)', pointerEvents: 'none', animation: 'beamSlide 7s ease-in-out infinite alternate' }} />

        {/* Logo com glow neon */}
        <div className="relative mb-16 flex items-center justify-center">
          {/* Bar horizontal atrás da logo */}
          <div
            aria-hidden="true"
            className="orb-anim absolute pointer-events-none"
            style={{
              width: '520px',
              height: '56px',
              filter: 'blur(28px)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.22) 30%, rgba(34,211,238,0.26) 50%, rgba(34,211,238,0.22) 70%, transparent 100%)',
              animation: 'linePulse 4s ease-in-out infinite alternate',
            }}
          />
          <Logo size="lg" variant="white" showSubtitle />
        </div>

        {/* Headline */}
        <h1
          className="fade-in-up font-semibold tracking-tight text-white"
          style={{ fontSize: 'clamp(2.5rem,5vw,4.2rem)', lineHeight: 1.1, animation: 'fadeInUp 0.7s ease-out 0.1s both' }}
        >
          Transporte aquático inteligente<br />
          para a Ilha da Gigoia.
        </h1>

        {/* Subheadline */}
        <p
          className="fade-in-up font-light mt-6 max-w-xl mx-auto leading-relaxed"
          style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.50)', animation: 'fadeInUp 0.7s ease-out 0.25s both' }}
        >
          Pool de barcos nos principais trapiches. Rápido, seguro e verificado.
        </p>

        {/* Botões */}
        <div className="fade-in-up flex flex-wrap gap-3 justify-center mt-10" style={{ animation: 'fadeInUp 0.7s ease-out 0.4s both' }}>
          <button
            onClick={() => navigate('/auth/passenger')}
            className="cursor-pointer transition-all duration-200 font-medium"
            style={{
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '0.625rem 1.5rem',
              borderRadius: '9999px',
              border: 'none',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.90)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff')}
          >
            Sou Passageiro
          </button>

          <button
            onClick={() => navigate('/auth/pilot')}
            className="cursor-pointer transition-all duration-200"
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.60)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '0.625rem 1.5rem',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.30)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.60)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
            }}
          >
            Sou Piloto
          </button>
        </div>

        {/* Dado de contexto */}
        <p
          className="fade-in-up mt-8 tracking-wide uppercase"
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', animation: 'fadeInUp 0.7s ease-out 0.55s both' }}
        >
          24 trapiches &middot; Ilha da Gigoia &middot; Barra da Tijuca, RJ
        </p>
      </section>

      {/* ───── COMO FUNCIONA ───── */}
      <section
        id="como-funciona"
        style={{
          backgroundColor: '#000000',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Beam vertical esquerda */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', left: '0', bottom: '60px', width: '1px', height: '220px', background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.40) 50%, transparent 100%)', pointerEvents: 'none', animation: 'beamRise 8s ease-in-out infinite alternate' }} />
        {/* Beam horizontal topo-direita */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', right: '0', top: '60px', width: '200px', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.30) 100%)', pointerEvents: 'none', animation: 'linePulse 6s ease-in-out infinite alternate-reverse' }} />
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start">

          {/* Coluna esquerda */}
          <div className="md:sticky md:top-28">
            <p
              className="font-medium uppercase tracking-[0.15em] mb-4"
              style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}
            >
              Como funciona
            </p>
            <h2
              className="font-semibold tracking-tight text-white"
              style={{ fontSize: 'clamp(1.75rem,4vw,2.25rem)', lineHeight: 1.15 }}
            >
              Simples como<br />deve ser.
            </h2>
          </div>

          {/* Coluna direita — lista editorial */}
          <div>
            {[
              {
                num: '01',
                title: 'Escolha o trapiche mais próximo',
                body: 'Selecione o ponto de embarque na Ilha da Gigoia.',
              },
              {
                num: '02',
                title: 'Piloto confirmado navega até você',
                body: 'Um piloto verificado aceita e chega ao seu trapiche.',
              },
              {
                num: '03',
                title: 'Pague com PIX ou cartão',
                body: 'Pagamento integrado diretamente pelo app, sem espera.',
              },
            ].map(({ num, title, body }, i) => (
              <div
                key={num}
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  padding: '2rem 0',
                }}
              >
                <p
                  className="font-mono tracking-wider mb-3"
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.20)' }}
                >
                  {num}
                </p>
                <h3
                  className="font-medium text-white mb-2"
                  style={{ fontSize: '1.0625rem' }}
                >
                  {title}
                </h3>
                <p
                  className="font-light leading-relaxed"
                  style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.50)' }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── NÚMEROS / CREDIBILIDADE ───── */}
      <section
        id="area"
        style={{
          backgroundColor: '#080808',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '6rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Bar horizontal full-width */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', left: '0', right: '0', top: '50%', transform: 'translateY(-50%)', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.18) 20%, rgba(34,211,238,0.22) 50%, rgba(34,211,238,0.18) 80%, transparent 100%)', pointerEvents: 'none', animation: 'linePulse 7s ease-in-out infinite alternate' }} />
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { value: '24', label: 'trapiches ativos' },
              { value: 'Pool', label: 'compartilhado' },
              { value: 'PIX', label: 'ou cartão' },
              { value: 'RJ', label: 'Barra da Tijuca' },
            ].map(({ value, label }, i) => (
              <div
                key={label}
                className="text-center"
                style={{
                  padding: '1.5rem 2rem',
                  borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <p
                  className="font-semibold text-white"
                  style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', lineHeight: 1 }}
                >
                  {value}
                </p>
                <p
                  className="font-medium uppercase tracking-wider mt-2"
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── PARA PILOTOS ───── */}
      <section
        id="para-pilotos"
        style={{
          backgroundColor: '#000000',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Beam vertical direita */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', right: '0', top: '60px', width: '1px', height: '260px', background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.38) 50%, transparent 100%)', pointerEvents: 'none', animation: 'beamRise 9s ease-in-out infinite alternate' }} />
        {/* Beam horizontal esquerda-baixo */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', left: '0', bottom: '70px', width: '160px', height: '1px', background: 'linear-gradient(90deg, rgba(34,211,238,0.28) 0%, transparent 100%)', pointerEvents: 'none', animation: 'linePulse 8s ease-in-out infinite alternate-reverse' }} />
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">

          {/* Coluna esquerda */}
          <div>
            <p
              className="font-medium uppercase tracking-[0.15em] mb-4"
              style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}
            >
              Para pilotos
            </p>
            <h2
              className="font-semibold tracking-tight text-white mb-6"
              style={{ fontSize: 'clamp(1.75rem,4vw,2.25rem)', lineHeight: 1.15 }}
            >
              Trabalhe quando e<br />quanto quiser.
            </h2>
            <p
              className="font-light leading-relaxed mb-8"
              style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.50)' }}
            >
              Seja seu próprio chefe. Aceite corridas nos principais trapiches
              da Ilha e receba diretamente no seu app.
            </p>
            <button
              onClick={() => navigate('/auth/pilot')}
              className="cursor-pointer transition-colors duration-200 font-medium"
              style={{
                fontSize: '0.875rem',
                color: '#22d3ee',
                background: 'none',
                border: 'none',
                padding: 0,
                animation: 'textGlow 3s ease-in-out infinite alternate',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#67e8f9')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#22d3ee')}
            >
              Quero ser piloto →
            </button>
          </div>

          {/* Coluna direita — card de benefícios */}
          <div
            className="orb-anim"
            style={{
              backgroundColor: '#0e0e0e',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '1rem',
              padding: '2rem',
              animation: 'borderGlow 4s ease-in-out infinite alternate',
            }}
          >
            {[
              {
                title: 'Ganhos diretos',
                sub: 'Receba por corrida, sem taxas escondidas.',
              },
              {
                title: 'Horários flexíveis',
                sub: 'Você define quando quer trabalhar.',
              },
              {
                title: 'Área de cobertura definida',
                sub: 'Atue nos trapiches que você conhece.',
              },
            ].map(({ title, sub }, i, arr) => (
              <div
                key={title}
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  paddingBottom: i < arr.length - 1 ? '1rem' : 0,
                  marginBottom: i < arr.length - 1 ? '1rem' : 0,
                }}
              >
                <p className="font-medium text-white" style={{ fontSize: '0.875rem' }}>
                  {title}
                </p>
                <p
                  className="mt-1"
                  style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.40)' }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer
        style={{
          backgroundColor: '#080808',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '4rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Beam horizontal footer topo */}
        <div aria-hidden="true" className="orb-anim" style={{ position: 'absolute', left: '15%', right: '15%', top: '0', height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.20) 30%, rgba(34,211,238,0.24) 50%, rgba(34,211,238,0.20) 70%, transparent 100%)', pointerEvents: 'none', animation: 'linePulse 8s ease-in-out infinite alternate' }} />
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-8">

          {/* Left */}
          <div>
            <Logo size="sm" variant="white" />
            <p
              className="mt-2"
              style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}
            >
              Ilha da Gigoia &middot; Barra da Tijuca &middot; Rio de Janeiro
            </p>
          </div>

          {/* Center — links legais */}
          <nav className="flex gap-6" aria-label="Links legais">
            {[
              { label: 'Política de Privacidade', to: '/privacy' },
              { label: 'Termos de Uso', to: '/terms' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="cursor-pointer transition-colors duration-200"
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.30)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.20)' }}>
            &copy; 2025 Gamma &middot; Simplix
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
