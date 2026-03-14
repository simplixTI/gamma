import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

const TermsModal = ({ isOpen, onClose, type }: TermsModalProps) => {
  const isTerms = type === 'terms';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {isTerms ? 'Termos de Uso' : 'Política de Privacidade'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[50vh] pr-4">
          {isTerms ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">1. Aceitação dos Termos</h3>
              <p>
                Ao acessar e usar o aplicativo Gamma, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
                Se você não concordar com qualquer parte destes termos, não poderá usar nossos serviços.
              </p>
              
              <h3 className="font-semibold text-foreground">2. Descrição do Serviço</h3>
              <p>
                O Gamma é uma plataforma de transporte aquático que conecta passageiros a pilotos de embarcações 
                na região da Ilha da Gigoia, Rio de Janeiro. O serviço funciona como transporte aquático compartilhado.
              </p>
              
              <h3 className="font-semibold text-foreground">3. Cadastro e Conta</h3>
              <p>
                Para usar o Gamma, você deve criar uma conta fornecendo informações precisas e completas. 
                Você é responsável por manter a confidencialidade de sua conta e senha.
              </p>
              
              <h3 className="font-semibold text-foreground">4. Uso do Serviço</h3>
              <p>
                Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos. 
                É proibido usar o serviço de forma que possa danificar, desativar ou prejudicar o funcionamento do aplicativo.
              </p>
              
              <h3 className="font-semibold text-foreground">5. Pagamentos</h3>
              <p>
                Os pagamentos são processados via PIX antes da confirmação da viagem. 
                Os preços são calculados por pessoa e variam de acordo com a distância do trajeto.
              </p>
              
              <h3 className="font-semibold text-foreground">6. Cancelamentos</h3>
              <p>
                Cancelamentos podem ser feitos antes da aceitação do piloto. 
                Após a aceitação, políticas específicas de reembolso podem se aplicar.
              </p>
              
              <h3 className="font-semibold text-foreground">7. Responsabilidades</h3>
              <p>
                O Gamma atua como intermediário entre passageiros e pilotos. 
                Não nos responsabilizamos por danos causados durante o transporte, 
                cabendo ao piloto garantir a segurança dos passageiros.
              </p>
              
              <h3 className="font-semibold text-foreground">8. Modificações</h3>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                Alterações significativas serão comunicadas aos usuários.
              </p>
              
              <h3 className="font-semibold text-foreground">9. Contato</h3>
              <p>
                Para dúvidas sobre estes termos, entre em contato conosco através do aplicativo.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">1. Informações que Coletamos</h3>
              <p>
                Coletamos informações pessoais como nome, CPF, email, telefone e localização 
                para fornecer e melhorar nossos serviços de transporte aquático.
              </p>
              
              <h3 className="font-semibold text-foreground">2. Uso das Informações</h3>
              <p>
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Processar solicitações de transporte</li>
                <li>Conectar passageiros a pilotos</li>
                <li>Processar pagamentos via PIX</li>
                <li>Enviar notificações sobre viagens</li>
                <li>Melhorar a qualidade do serviço</li>
              </ul>
              
              <h3 className="font-semibold text-foreground">3. Compartilhamento de Dados</h3>
              <p>
                Compartilhamos informações necessárias entre passageiros e pilotos para 
                a realização do serviço. Dados de pagamento são processados por parceiros de pagamento seguros.
              </p>
              
              <h3 className="font-semibold text-foreground">4. Localização</h3>
              <p>
                Coletamos dados de localização em tempo real durante viagens para 
                permitir o rastreamento e garantir a segurança do serviço.
              </p>
              
              <h3 className="font-semibold text-foreground">5. Segurança</h3>
              <p>
                Implementamos medidas de segurança para proteger suas informações pessoais 
                contra acesso não autorizado, alteração ou destruição.
              </p>
              
              <h3 className="font-semibold text-foreground">6. Seus Direitos</h3>
              <p>
                De acordo com a LGPD, você tem direito a:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir informações incorretas</li>
                <li>Solicitar exclusão de dados</li>
                <li>Revogar consentimento</li>
              </ul>
              
              <h3 className="font-semibold text-foreground">7. Retenção de Dados</h3>
              <p>
                Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário 
                para cumprir obrigações legais.
              </p>
              
              <h3 className="font-semibold text-foreground">8. Contato</h3>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, 
                entre em contato através do aplicativo.
              </p>
            </div>
          )}
        </ScrollArea>
        
        <Button onClick={onClose} className="w-full">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TermsModal;
