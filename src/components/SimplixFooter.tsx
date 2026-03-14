import { useNavigate } from 'react-router-dom';

const SimplixFooter = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full pt-8 pb-6 flex flex-col items-center gap-1.5 select-none border-t border-border/40 mt-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/terms')}
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          Termos de Uso
        </button>
        <span className="text-muted-foreground/40 text-[11px]">·</span>
        <button
          onClick={() => navigate('/privacy')}
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          Política de Privacidade
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/50">Desenvolvido por Simplix</p>
    </div>
  );
};

export default SimplixFooter;
