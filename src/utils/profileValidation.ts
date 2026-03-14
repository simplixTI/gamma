// Profile validation utilities

export interface PassengerProfileValidation {
  isValid: boolean;
  missingFields: string[];
}

export interface PilotProfileValidation {
  isValid: boolean;
  missingFields: string[];
}

export interface PassengerProfile {
  full_name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  email?: string | null;
}

export interface PilotProfile {
  full_name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  email?: string | null;
  boat_type?: string | null;
  boat_identification?: string | null;
}

export const validatePassengerProfile = (profile: PassengerProfile | null): PassengerProfileValidation => {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ['Perfil não encontrado'],
    };
  }

  const missingFields: string[] = [];

  if (!profile.full_name?.trim()) {
    missingFields.push('Nome completo');
  }

  if (!profile.phone?.trim()) {
    missingFields.push('Telefone');
  }

  if (!profile.cpf?.trim()) {
    missingFields.push('CPF');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

export const validatePilotProfile = (profile: PilotProfile | null): PilotProfileValidation => {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ['Perfil não encontrado'],
    };
  }

  const missingFields: string[] = [];

  if (!profile.full_name?.trim()) {
    missingFields.push('Nome completo');
  }

  if (!profile.phone?.trim()) {
    missingFields.push('Telefone');
  }

  if (!profile.cpf?.trim()) {
    missingFields.push('CPF');
  }

  if (!profile.boat_type?.trim()) {
    missingFields.push('Tipo de embarcação');
  }

  if (!profile.boat_identification?.trim()) {
    missingFields.push('Identificação da embarcação');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

export const getProfileCompletionMessage = (missingFields: string[]): string => {
  if (missingFields.length === 0) return '';
  
  if (missingFields.length === 1) {
    return `Complete seu perfil: ${missingFields[0]}`;
  }
  
  return `Complete seu perfil: ${missingFields.slice(0, -1).join(', ')} e ${missingFields[missingFields.length - 1]}`;
};
