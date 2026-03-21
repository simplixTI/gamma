import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Ship, MapPin, Navigation, CreditCard, Shield, Clock, Users, Anchor, Zap, ChevronDown } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22d3ee]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#000000', color: '#ffffff' }}>

      {/* ───────────────── HERO ───────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 overflow-hidden">

        {/* Orb decorativo 1 */}
        <div
          aria-hidden="true"
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{
            width: '600px',
            height: '600px',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)',
          }}
        />
        {/* Orb decorativo 2 */}
        <div
          aria-hidden="true"
          className="absolute rounded-full blur-2xl pointer-events-none"
          style={{
            width: '300px',
            height: '300px',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto w-full">

          {/* Logo */}
          <div className="mb-12">
            <Logo size="lg" variant="white" showSubtitle />
          </div>

          {/* Badge pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-sm"
            style={{
              backgroundColor: 'rgba(34,211,238,0.10)',
              border: '1px solid rgba(34,211,238,0.20)',
              color: '#22d3ee',
            }}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Transporte aquático na Ilha da Gigoia
          </div>

          {/* Título hero */}
          <h1
            className="font-black tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)', lineHeight: 1.05 }}
          >
            <span style={{ color: '#ffffff' }}>O jeito mais fácil de</span>
            <br />
            <span style={{ color: '#22d3ee' }}>atravessar a Ilha</span>
          </h1>

          {/* Subtítulo */}
          <p
            className="mt-6 mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'rgba(255,255,255,0.6)' }}
          >
            Transporte aquático por pool. Rápido, seguro e compartilhado.
          </p>

          {/* Botões */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate('/auth/passenger')}
              className="inline-flex items-center gap-2 font-semibold cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: '#22d3ee',
                color: '#000000',
                padding: '1rem 2rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                boxShadow: '0 0 30px rgba(34,211,238,0.30)',
                border: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#67e8f9')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#22d3ee')}
              aria-label="Entrar como Passageiro"
            >
              <User className="w-5 h-5" aria-hidden="true" />
              Sou Passageiro
            </button>

            <button
              onClick={() => navigate('/auth/pilot')}
              className="inline-flex items-center gap-2 font-semibold cursor-pointer transition-all duration-200 backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                color: '#ffffff',
                padding: '1rem 2rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                border: '1px solid rgba(255,255,255,0.20)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)')}
              aria-label="Entrar como Piloto"
            >
              <Ship className="w-5 h-5" aria-hidden="true" />
              Sou Piloto
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#como-funciona"
          aria-label="Ver como funciona"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer transition-colors duration-200"
          style={{ color: 'rgba(255,255,255,0.30)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* ───────────────── COMO FUNCIONA ───────────────── */}
      <section id="como-funciona" style={{ backgroundColor: '#0a0a0a', padding: '8rem 1.5rem' }}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <p
              className="font-semibold tracking-widest uppercase mb-4"
              style={{ fontSize: '0.75rem', color: '#22d3ee' }}
            >
              Como funciona
            </p>
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', color: '#ffffff' }}
            >
              Três passos. Você no barco.
            </h2>
            <p className="mt-4 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
              Simples como pedir um táxi — só que pela água.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                step: '01',
                title: 'Escolha o trapiche',
                desc: 'Selecione o ponto de embarque mais próximo de você na Ilha da Gigoia.',
              },
              {
                icon: Navigation,
                step: '02',
                title: 'Piloto navega até você',
                desc: 'Um piloto verificado aceita sua solicitação e chega ao seu trapiche.',
              },
              {
                icon: CreditCard,
                step: '03',
                title: 'Pague no app',
                desc: 'PIX instantâneo ou cartão de crédito — pagamento rápido e seguro.',
              },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div
                key={step}
                className="relative cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '1rem',
                  padding: '2rem',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.15)';
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#161616';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#111111';
                }}
              >
                {/* Número decorativo */}
                <span
                  className="absolute top-5 right-6 font-black select-none"
                  style={{ fontSize: '4rem', lineHeight: 1, color: 'rgba(255,255,255,0.04)' }}
                >
                  {step}
                </span>

                {/* Ícone */}
                <div
                  className="mb-6 inline-flex items-center justify-center"
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(34,211,238,0.10)',
                    border: '1px solid rgba(34,211,238,0.20)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#22d3ee' }} aria-hidden="true" />
                </div>

                <h3 className="font-semibold mb-2" style={{ fontSize: '1.125rem', color: '#ffffff' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── FEATURES 2x2 ───────────────── */}
      <section style={{ backgroundColor: '#000000', padding: '8rem 1.5rem' }}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <p
              className="font-semibold tracking-widest uppercase mb-4"
              style={{ fontSize: '0.75rem', color: '#22d3ee' }}
            >
              Por que Gamma
            </p>
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', color: '#ffffff' }}
            >
              Feito para a vida na Ilha.
            </h2>
          </div>

          {/* Grid 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Clock,
                title: 'Disponível quando você precisa',
                desc: 'Barcos nos trapiches da Ilha da Gigoia prontos para sua travessia, quando você precisar.',
              },
              {
                icon: Shield,
                title: 'Pilotos verificados',
                desc: 'Todos os pilotos passam por verificação de documentação e avaliação contínua.',
              },
              {
                icon: Users,
                title: 'Compartilhe a travessia',
                desc: 'Viaje com outros passageiros, divida o trajeto e reduza o custo da travessia.',
              },
              {
                icon: Zap,
                title: 'PIX ou cartão em segundos',
                desc: 'Pagamento instantâneo direto pelo app, sem dinheiro físico ou espera.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '1rem',
                  padding: '2rem',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.08)';
                }}
              >
                <div
                  className="mb-5 inline-flex items-center justify-center"
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(34,211,238,0.10)',
                    border: '1px solid rgba(34,211,238,0.20)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#22d3ee' }} aria-hidden="true" />
                </div>
                <h3 className="font-semibold mb-2" style={{ fontSize: '1.125rem', color: '#ffffff' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── ÁREA ───────────────── */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '8rem 1.5rem' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <p
                className="font-semibold tracking-widest uppercase mb-6"
                style={{ fontSize: '0.75rem', color: '#22d3ee' }}
              >
                Onde atuamos
              </p>
              <h2
                className="font-black tracking-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#ffffff', lineHeight: 1.1 }}
              >
                Ilha da Gigoia,<br />Barra da Tijuca.
              </h2>
              <p
                className="mb-8 leading-relaxed"
                style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.6)' }}
              >
                24 trapiches conectados. Da Marina à Associação, cobrimos toda a ilha.
              </p>

              {/* Lista de trapiches */}
              <ul className="space-y-3">
                {['Marina da Glória', 'Trapiche da Associação', 'Praia do Abraão', 'Ponta da Joatinga'].map(name => (
                  <li key={name} className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: '#22d3ee' }} aria-hidden="true" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem' }}>{name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — card decorativo */}
            <div
              className="flex flex-col items-center justify-center"
              style={{
                backgroundColor: '#111111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '1.5rem',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <Anchor className="w-16 h-16 mb-6" style={{ color: '#22d3ee' }} aria-hidden="true" />
              <p
                className="font-black"
                style={{ fontSize: '5rem', lineHeight: 1, color: '#ffffff' }}
              >
                24
              </p>
              <p
                className="font-semibold tracking-wider uppercase mt-2"
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}
              >
                trapiches
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ───────────────── DOWNLOAD ───────────────── */}
      <section style={{ backgroundColor: '#000000', padding: '8rem 1.5rem' }}>
        <div
          className="max-w-2xl mx-auto text-center"
          style={{
            backgroundColor: '#111111',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.5rem',
            padding: '3rem',
          }}
        >
          <div className="mb-8 flex justify-center">
            <Logo size="md" variant="white" />
          </div>

          <h2
            className="font-black tracking-tight mb-3"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', color: '#ffffff' }}
          >
            Baixe o Gamma
          </h2>
          <p className="mb-10" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
            Em breve na App Store e Google Play
          </p>

          {/* Store badges */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">

            {/* App Store */}
            <a
              href="#"
              aria-label="Baixar na App Store (em breve)"
              className="cursor-pointer transition-opacity duration-200 opacity-70 hover:opacity-100"
            >
              <div
                className="inline-flex items-center gap-3"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  minWidth: '160px',
                }}
              >
                <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
                  <path d="M16.6 12.8c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.3-.9-2.3-3.5zM14 4.5c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.1-.5 2.9-1.3z" fill="#000"/>
                </svg>
                <div className="text-left">
                  <p style={{ fontSize: '0.625rem', opacity: 0.7, lineHeight: 1 }}>Disponível na</p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>App Store</p>
                </div>
              </div>
            </a>

            {/* Google Play */}
            <a
              href="#"
              aria-label="Disponível no Google Play (em breve)"
              className="cursor-pointer transition-opacity duration-200 opacity-70 hover:opacity-100"
            >
              <div
                className="inline-flex items-center gap-3"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  minWidth: '160px',
                }}
              >
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">
                  <path d="M.5 1.1C.2 1.4 0 1.9 0 2.6v16.8c0 .7.2 1.2.5 1.5l.1.1L9.4 11v-.2L.6 1z" fill="url(#dl_gp1)"/>
                  <path d="M12.4 14.1l-3-3V10.9l3-3 .1.1 3.6 2.1c1 .6 1 1.6 0 2.2l-3.6 2.1-.1-.3z" fill="url(#dl_gp2)"/>
                  <path d="M12.5 14l-3.1-3.1L.5 20.1c.3.4.9.4 1.6.1L12.5 14z" fill="url(#dl_gp3)"/>
                  <path d="M12.5 7.9L2.1.8C1.4.5.8.5.5.9L9.4 10.9l3.1-3z" fill="url(#dl_gp4)"/>
                  <defs>
                    <linearGradient id="dl_gp1" x1="9" y1="1.4" x2="-4" y2="14.5" gradientUnits="userSpaceOnUse"><stop stopColor="#00A0FF"/><stop offset="1" stopColor="#00A0FF" stopOpacity="0"/></linearGradient>
                    <linearGradient id="dl_gp2" x1="17.8" y1="10.9" x2=".5" y2="10.9" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD600"/><stop offset="1" stopColor="#FF6D00"/></linearGradient>
                    <linearGradient id="dl_gp3" x1="11.5" y1="12.4" x2="-3" y2="27" gradientUnits="userSpaceOnUse"><stop stopColor="#FF3A44"/><stop offset="1" stopColor="#C31162"/></linearGradient>
                    <linearGradient id="dl_gp4" x1="-1" y1="-4" x2="6.5" y2="3.6" gradientUnits="userSpaceOnUse"><stop stopColor="#32A071"/><stop offset="1" stopColor="#2DA771" stopOpacity="0"/></linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <p style={{ fontSize: '0.625rem', opacity: 0.7, lineHeight: 1 }}>Disponível no</p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.3 }}>Google Play</p>
                </div>
              </div>
            </a>
          </div>

          <p className="mt-8" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.25)' }}>
            Use agora via web — sem download necessário
          </p>
        </div>
      </section>

      {/* ───────────────── FOOTER ───────────────── */}
      <footer
        style={{
          backgroundColor: '#0a0a0a',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '4rem 1.5rem',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-8">

          {/* Left */}
          <div>
            <Logo size="sm" variant="white" />
            <p className="mt-2" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)' }}>
              Ilha da Gigoia &bull; Barra da Tijuca &bull; Rio de Janeiro
            </p>
          </div>

          {/* Center */}
          <nav aria-label="Links do rodapé" className="flex gap-6">
            <Link
              to="/privacy"
              className="transition-colors duration-200 cursor-pointer"
              style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.40)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
            >
              Política de Privacidade
            </Link>
            <Link
              to="/terms"
              className="transition-colors duration-200 cursor-pointer"
              style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.40)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
            >
              Termos de Uso
            </Link>
          </nav>

          {/* Right */}
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.25)' }}>
            &copy; 2025 Gamma &middot; Simplix
          </p>

        </div>
      </footer>

    </div>
  );
};

export default Landing;
