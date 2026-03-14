import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfileIncompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
  missingFields: string[];
  userType: 'passenger' | 'pilot';
}

const ProfileIncompleteModal = ({
  isOpen,
  onClose,
  onGoToProfile,
  missingFields,
  userType,
}: ProfileIncompleteModalProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Perfil incompleto
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {userType === 'passenger'
                  ? 'Para solicitar uma corrida, você precisa completar seu perfil.'
                  : 'Para aceitar corridas, você precisa completar seu perfil.'}
              </p>
              <div className="bg-muted/10 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground mb-2">
                  Campos obrigatórios faltando:
                </p>
                <ul className="text-sm text-muted space-y-1">
                  {missingFields.map((field) => (
                    <li key={field} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onGoToProfile}>
            Completar perfil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ProfileIncompleteModal;
