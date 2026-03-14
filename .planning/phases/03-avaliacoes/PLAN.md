---
phase: 03-avaliacoes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260313_ride_reviews.sql
  - src/integrations/supabase/types.ts
  - src/types/index.ts
autonomous: true
requirements:
  - R5.1
  - R5.2
  - R5.3
  - R5.4

must_haves:
  truths:
    - "Passageiro pode avaliar o piloto com 1–5 estrelas após corrida"
    - "Piloto pode avaliar o passageiro com 1–5 estrelas após corrida"
    - "Rating médio do piloto aparece no perfil do piloto (atualizado automaticamente)"
    - "Rating médio do passageiro aparece no perfil do passageiro (atualizado automaticamente)"
    - "Avaliação é sempre opcional — ambos os lados podem pular"
    - "Não é possível avaliar a mesma corrida duas vezes (constraint de unicidade)"
  artifacts:
    - path: "supabase/migrations/20260313_ride_reviews.sql"
      provides: "Tabela ride_reviews, coluna pilot_user_id em rides, coluna rating em passenger_profiles, triggers de média"
      contains: "CREATE TABLE public.ride_reviews"
    - path: "src/integrations/supabase/types.ts"
      provides: "Tipos TypeScript atualizados refletindo o novo schema"
      contains: "ride_reviews"
    - path: "src/pages/pilot/RatePassenger.tsx"
      provides: "Tela de avaliação do passageiro pelo piloto"
      exports: ["RatePassenger"]
    - path: "src/components/StarRating.tsx"
      provides: "Componente reutilizável de estrelas"
      exports: ["StarRating"]
    - path: "src/pages/passenger/Completed.tsx"
      provides: "Fluxo de avaliação redirigido para ride_reviews"
      contains: "ride_reviews"
    - path: "src/pages/pilot/ActiveRide.tsx"
      provides: "Navegação para RatePassenger após conclusão (sem setTimeout)"
      contains: "pilot/rate"
  key_links:
    - from: "src/pages/passenger/Completed.tsx"
      to: "ride_reviews"
      via: "supabase.from('ride_reviews').insert"
      pattern: "ride_reviews.*insert"
    - from: "src/pages/pilot/ActiveRide.tsx"
      to: "src/pages/pilot/RatePassenger.tsx"
      via: "navigate('/pilot/rate/:rideId')"
      pattern: "navigate.*pilot/rate"
    - from: "ride_reviews INSERT trigger"
      to: "pilot_profiles.rating"
      via: "trg_update_pilot_rating AFTER INSERT"
      pattern: "pilot_profiles.*rating"
    - from: "ride_reviews INSERT trigger"
      to: "passenger_profiles.rating"
      via: "trg_update_passenger_rating AFTER INSERT"
      pattern: "passenger_profiles.*rating"
    - from: "src/pages/pilot/PilotDashboard.tsx"
      to: "rides.pilot_user_id"
      via: "supabase update on handleAcceptRide"
      pattern: "pilot_user_id.*auth.uid"
---

<objective>
Sistema completo de avaliação mútua passageiro↔piloto: schema do banco, lógica de backend, telas de avaliação e exibição de ratings nos perfis.

Purpose: Satisfazer R5.1–R5.4, permitindo que passageiros e pilotos se avaliem mutuamente após cada corrida, com médias persistidas e visíveis nos perfis.

Output:
- Migration SQL com ride_reviews, pilot_user_id em rides, rating em passenger_profiles e triggers
- StarRating component reutilizável
- Completed.tsx refatorado para gravar em ride_reviews
- ActiveRide.tsx sem setTimeout, navegando para nova página RatePassenger
- RatePassenger.tsx — tela de avaliação do piloto
- Profile.tsx e PilotProfile.tsx exibindo rating médio
- App.tsx com nova rota /pilot/rate/:rideId
- Tipos TypeScript atualizados
</objective>

<execution_context>
@C:/Users/lucas/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/lucas/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/03-avaliacoes/03-RESEARCH.md
</context>

<interfaces>
<!-- Contratos essenciais que o executor precisa. Extraídos do codebase. -->

From src/pages/pilot/PilotDashboard.tsx — handleAcceptRide (linhas 207–221):
```typescript
// pilotId aqui é um UUID do registro em public.pilots (device-based), NÃO auth.uid()
// A nova coluna pilot_user_id deve receber user.id (auth UUID) via useAuthContext
const { data, error } = await supabase
  .from('rides')
  .update({
    status: 'accepted',
    pilot_id: pilotId,           // device-based UUID da tabela pilots (mantém)
    pilot_name: pilotProfile?.full_name || 'Piloto',
    pilot_phone: pilotProfile?.phone || null,
    accepted_at: new Date().toISOString(),
    // ADICIONAR: pilot_user_id: user.id  (auth UUID para uso em ride_reviews)
  })
  .eq('id', rideId)
  .eq('status', 'pending')
  .select()
  .single();
```

From src/pages/pilot/ActiveRide.tsx — completed phase render (linhas 299–316):
```typescript
// Substituir este bloco inteiro — remover o setTimeout + navigate
if (phase === 'completed') {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center animate-scale-in">
        {/* ... splash de conclusão ... */}
        <p className="text-muted">Redirecionando...</p>
      </div>
    </div>
  );
}
// E no handleAction, linha 201:
// setTimeout(() => navigate('/pilot'), 2000);  ← REMOVER
// Substituir por: navigate(`/pilot/rate/${rideId}`, { state: { rideId, passengerUserId: ride.passengerUserId } });
```

From src/pages/passenger/Completed.tsx — handleSubmit (linhas 102–133):
```typescript
// Atual: grava em rides.rating / rides.rating_comment / rides.tip
// Novo: INSERT em ride_reviews com reviewer_role: 'passenger'
// rideData.pilot_user_id é o campo UUID adicionado na migration
// user.id vem de useAuthContext
```

From src/integrations/supabase/types.ts — passenger_profiles.Row (linhas 17–28):
```typescript
// NÃO tem campo 'rating' ainda — migration adicionará
// Após migration, Row terá: rating: number
```

From src/integrations/supabase/types.ts — pilot_profiles.Row (linha 112):
```typescript
rating: number  // JÁ EXISTE — trigger mantém atualizado
```

From src/types/index.ts — DbRide (verificar se tem pilot_user_id):
// Adicionar pilot_user_id?: string | null ao DbRide após migration

From src/hooks/usePilotStats.ts:
// pilotId é o UUID da tabela public.pilots (device-based), não auth.uid()
// Para ride_reviews, sempre usar user.id de useAuthContext como reviewer_id

From src/App.tsx — rotas existentes:
// /pilot/ride/:rideId → ActiveRide (existente)
// ADICIONAR: /pilot/rate/:rideId → RatePassenger
</interfaces>

<tasks>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 0 — Banco de dados                                     -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 1 (Wave 0): Migration — ride_reviews, pilot_user_id, rating em passenger_profiles, triggers</name>
  <files>supabase/migrations/20260313_ride_reviews.sql</files>
  <action>
Criar arquivo de migration com o seguinte conteúdo exato:

```sql
-- Phase 3: Avaliações — ride_reviews table + schema gaps

-- 1. Add pilot_user_id to rides (auth UUID, separate from pilot_id which is device-based)
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS pilot_user_id UUID REFERENCES auth.users(id);

-- 2. Add rating column to passenger_profiles
ALTER TABLE public.passenger_profiles
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 5.0;

-- 3. Create ride_reviews table
CREATE TABLE IF NOT EXISTS public.ride_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id       UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id   UUID NOT NULL REFERENCES auth.users(id),
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('passenger', 'pilot')),
  stars         SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, reviewer_role)
);

ALTER TABLE public.ride_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: somente o reviewer pode inserir sua própria avaliação
CREATE POLICY "Reviewer can insert own review"
  ON public.ride_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- RLS: reviewer ou reviewee podem ler
CREATE POLICY "Participants can read reviews"
  ON public.ride_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());

-- 4. Trigger: atualiza pilot_profiles.rating quando passageiro avalia
CREATE OR REPLACE FUNCTION public.update_pilot_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.pilot_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars::numeric), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'passenger'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_pilot_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'passenger')
  EXECUTE FUNCTION public.update_pilot_rating();

-- 5. Trigger: atualiza passenger_profiles.rating quando piloto avalia
CREATE OR REPLACE FUNCTION public.update_passenger_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.passenger_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars::numeric), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'pilot'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_passenger_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'pilot')
  EXECUTE FUNCTION public.update_passenger_rating();
```

Aplicar no Supabase via: `supabase db push` ou pelo Supabase Dashboard > SQL Editor.
  </action>
  <verify>
    <automated>MISSING — sem CLI de teste configurado. Verificar manualmente: no Supabase Dashboard, confirmar que as tabelas ride_reviews existe, rides tem coluna pilot_user_id, passenger_profiles tem coluna rating.</automated>
  </verify>
  <done>
    - Tabela ride_reviews criada com constraint UNIQUE(ride_id, reviewer_role)
    - rides.pilot_user_id UUID nullable existe
    - passenger_profiles.rating NUMERIC(3,2) NOT NULL DEFAULT 5.0 existe
    - Dois triggers funcionais: trg_update_pilot_rating e trg_update_passenger_rating
    - RLS ativo na ride_reviews com políticas INSERT e SELECT corretas
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 1 — Tipos TypeScript e aceitação de corrida           -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2 (Wave 1): Atualizar tipos TypeScript e gravar pilot_user_id na aceitação</name>
  <files>
    src/integrations/supabase/types.ts,
    src/types/index.ts,
    src/pages/pilot/PilotDashboard.tsx
  </files>
  <action>
**src/integrations/supabase/types.ts**

1. Em `passenger_profiles.Row`, adicionar após `photo_url`:
   ```typescript
   rating: number
   ```
   Em `passenger_profiles.Insert` e `Update`, adicionar:
   ```typescript
   rating?: number
   ```

2. Adicionar o bloco completo de `ride_reviews` na seção `Tables` (após `ride_messages`):
   ```typescript
   ride_reviews: {
     Row: {
       id: string
       ride_id: string
       reviewer_id: string
       reviewee_id: string
       reviewer_role: string
       stars: number
       comment: string | null
       created_at: string
     }
     Insert: {
       id?: string
       ride_id: string
       reviewer_id: string
       reviewee_id: string
       reviewer_role: string
       stars: number
       comment?: string | null
       created_at?: string
     }
     Update: {
       id?: string
       ride_id?: string
       reviewer_id?: string
       reviewee_id?: string
       reviewer_role?: string
       stars?: number
       comment?: string | null
       created_at?: string
     }
     Relationships: [
       {
         foreignKeyName: "ride_reviews_ride_id_fkey"
         columns: ["ride_id"]
         isOneToOne: false
         referencedRelation: "rides"
         referencedColumns: ["id"]
       }
     ]
   }
   ```

3. Em `rides.Row`, adicionar: `pilot_user_id: string | null`
   Em `rides.Insert` e `Update`, adicionar: `pilot_user_id?: string | null`

**src/types/index.ts**

Localizar a interface `DbRide` e adicionar o campo:
```typescript
pilot_user_id?: string | null;
```

**src/pages/pilot/PilotDashboard.tsx**

Na função `handleAcceptRide`, dentro do `.update({...})` (linha ~212), adicionar `pilot_user_id` usando o auth user:

1. No topo do componente, desestruturar `user` do `useAuthContext`:
   ```typescript
   const { pilotProfile, user } = useAuthContext();
   ```

2. No objeto do `.update()`, adicionar:
   ```typescript
   pilot_user_id: user?.id ?? null,
   ```

Isso garante que, a partir deste momento, toda corrida aceita terá o UUID auth do piloto gravado em `rides.pilot_user_id`, resolvendo o gap identificado na pesquisa.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>
    - Build TypeScript sem erros
    - `supabase.from('ride_reviews')` disponível com tipos corretos
    - `DbRide.pilot_user_id` acessível sem erro de tipo
    - Novas corridas aceitas terão pilot_user_id preenchido (verificar no Supabase após aceitar uma corrida de teste)
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 2 — Tela de avaliação do passageiro (Completed.tsx)   -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 3 (Wave 2-A): Componente StarRating e refatoração de Completed.tsx para ride_reviews</name>
  <files>
    src/components/StarRating.tsx,
    src/pages/passenger/Completed.tsx
  </files>
  <action>
**src/components/StarRating.tsx** — CRIAR novo arquivo:

```typescript
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (stars: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

const StarRating = ({ value, onChange, size = 'md', readonly = false }: StarRatingProps) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          className={`transition-all p-1 ${readonly ? 'cursor-default' : 'active:scale-90 hover:scale-110'}`}
          disabled={readonly}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= value
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-border hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
```

**src/pages/passenger/Completed.tsx** — MODIFICAR:

1. Adicionar import: `import { useAuthContext } from '@/contexts/AuthContext';`
2. Adicionar import: `import StarRating from '@/components/StarRating';`
3. Dentro do componente, adicionar: `const { user } = useAuthContext();`
4. Substituir os 5 botões de estrela inline (linhas ~222–237) pelo componente:
   ```tsx
   <StarRating value={rating} onChange={setRating} size="lg" />
   ```
5. Substituir o `handleSubmit` inteiro para gravar em `ride_reviews` em vez de `rides.rating`:
   ```typescript
   const handleSubmit = async () => {
     if (rating === 0) {
       toast.error('Por favor, selecione uma avaliação');
       return;
     }

     setIsSubmitting(true);
     try {
       if (rideId && user?.id && rideData?.pilot_user_id) {
         const { error } = await supabase
           .from('ride_reviews')
           .insert({
             ride_id: rideId,
             reviewer_id: user.id,
             reviewee_id: rideData.pilot_user_id,
             reviewer_role: 'passenger',
             stars: rating,
             comment: comment || null,
           });
         if (error) throw error;

         // Gravar tip na corrida (campo existente, mantém compatibilidade)
         if (selectedTip) {
           await supabase
             .from('rides')
             .update({ tip: selectedTip })
             .eq('id', rideId);
         }
       }
       toast.success('Obrigado pela avaliação!');
       resetState();
       navigate('/passenger');
     } catch (error) {
       console.error('Error submitting rating:', error);
       toast.error('Erro ao enviar avaliação');
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

   NOTA: Se `rideData.pilot_user_id` for null (corridas antigas), `handleSubmit` ainda executa resetState/navigate com sucesso — não bloqueia o passageiro. O toast de "Obrigado pela avaliação!" aparece mesmo sem gravar review (corridas legadas sem pilot_user_id).

   Para distinguir: envolver o bloco de insert em `if (rideId && user?.id && rideData?.pilot_user_id)` como mostrado — já garante o comportamento correto sem extra UI.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>
    - StarRating.tsx existe e é importável
    - Completed.tsx compila sem erros
    - handleSubmit grava em ride_reviews (não mais em rides.rating)
    - Gorjeta ainda grava em rides.tip
    - Skip continua funcionando (navega para /passenger sem insert)
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 2 — Tela de avaliação do piloto (RatePassenger.tsx)   -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 4 (Wave 2-B): RatePassenger.tsx + modificar ActiveRide.tsx + registrar rota</name>
  <files>
    src/pages/pilot/RatePassenger.tsx,
    src/pages/pilot/ActiveRide.tsx,
    src/App.tsx
  </files>
  <action>
**src/pages/pilot/RatePassenger.tsx** — CRIAR novo arquivo:

Tela de avaliação do passageiro pelo piloto. Rota: `/pilot/rate/:rideId`.
Recebe `rideId` via `useParams`. O `passengerUserId` vem de `rides.passenger_user_id` (buscado ao montar).

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StarRating from '@/components/StarRating';

const RatePassenger = () => {
  const navigate = useNavigate();
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuthContext();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengerUserId, setPassengerUserId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState<string>('Passageiro');
  const [ridePrice, setRidePrice] = useState<number>(0);
  const [loadingRide, setLoadingRide] = useState(true);

  useEffect(() => {
    if (!rideId) return;
    supabase
      .from('rides')
      .select('passenger_user_id, passenger_name, price')
      .eq('id', rideId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPassengerUserId(data.passenger_user_id ?? null);
          setPassengerName(data.passenger_name || 'Passageiro');
          setRidePrice(Number(data.price));
        }
        setLoadingRide(false);
      });
  }, [rideId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecione uma avaliação');
      return;
    }
    if (!rideId || !user?.id || !passengerUserId) {
      toast.error('Dados da corrida indisponíveis');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ride_reviews')
        .insert({
          ride_id: rideId,
          reviewer_id: user.id,
          reviewee_id: passengerUserId,
          reviewer_role: 'pilot',
          stars: rating,
          comment: comment || null,
        });
      if (error) throw error;
      toast.success('Avaliação enviada!');
      navigate('/pilot');
    } catch (err) {
      console.error('Error submitting rating:', err);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => navigate('/pilot');

  if (loadingRide) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se passenger_user_id for null (corrida legada), pular avaliação silenciosamente
  if (!passengerUserId) {
    navigate('/pilot');
    return null;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-3 safe-area-inset">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-elevated p-5 animate-scale-in">
        {/* Success icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-success-foreground" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-1">
          Corrida concluída!
        </h1>
        <p className="text-3xl font-bold text-success text-center mb-1">
          + R$ {ridePrice.toFixed(2).replace('.', ',')}
        </p>
        <p className="text-sm text-muted text-center mb-5">
          Como foi {passengerName}?
        </p>

        {/* Stars */}
        <div className="mb-4">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <p className="text-center text-sm text-muted mt-2">
              {rating === 5 ? 'Passageiro excelente!' : rating >= 4 ? 'Bom passageiro' : rating >= 3 ? 'OK' : 'Pode melhorar'}
            </p>
          )}
        </div>

        {/* Comment */}
        <textarea
          placeholder="Comentário opcional"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-background border border-border rounded-xl p-2.5 resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
        />

        <div className="space-y-2">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar avaliação'
            )}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-muted h-10 text-sm"
          >
            Pular
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RatePassenger;
```

**src/pages/pilot/ActiveRide.tsx** — MODIFICAR dois pontos:

1. Dentro de `handleAction`, substituir o bloco de conclusão (linha ~201):
   ```typescript
   // REMOVER:
   // setTimeout(() => navigate('/pilot'), 2000);

   // SUBSTITUIR POR:
   navigate(`/pilot/rate/${rideId}`);
   ```
   Manter `setPhase(newPhase)` antes desta linha.

2. Substituir o bloco de render `if (phase === 'completed')` (linhas ~299–316) inteiro por uma chamada imediata de navigate (o bloco nunca será renderizado pois o navigate já ocorre em handleAction):
   ```typescript
   // O splash "Corrida concluída!" agora é mostrado em RatePassenger.tsx
   // Remover o bloco if (phase === 'completed') { return (...) } inteiro
   // O navigate(`/pilot/rate/${rideId}`) em handleAction dispara antes do próximo render
   ```
   ATENÇÃO: Remover APENAS o bloco `if (phase === 'completed') { return (...) }` (aproximadamente linhas 299–316). O resto do componente permanece intacto.

**src/App.tsx** — MODIFICAR:

1. Adicionar import no topo (junto aos outros imports de pilot):
   ```typescript
   import RatePassenger from "./pages/pilot/RatePassenger";
   ```

2. Adicionar rota dentro do bloco de rotas do piloto (após `/pilot/ride/:rideId`):
   ```tsx
   <Route path="/pilot/rate/:rideId" element={
     <ProtectedRoute requiredRole="pilot">
       <RatePassenger />
     </ProtectedRoute>
   } />
   ```
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>
    - RatePassenger.tsx compila sem erros
    - Rota /pilot/rate/:rideId registrada em App.tsx
    - ActiveRide.tsx: sem setTimeout, navega para /pilot/rate/:rideId ao concluir corrida
    - ActiveRide.tsx: bloco de splash "completed" removido (agora é RatePassenger que mostra o resumo)
    - Build limpo sem erros TypeScript
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 3 — Exibição de ratings nos perfis                    -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 5 (Wave 3): Exibir rating no perfil do passageiro (Profile.tsx)</name>
  <files>
    src/pages/passenger/Profile.tsx,
    src/contexts/AuthContext.tsx
  </files>
  <action>
**src/contexts/AuthContext.tsx** — verificar se `passengerProfile` já retorna o campo `rating`.

Após a migration, `passenger_profiles` terá `rating NUMERIC(3,2)`. O `passengerProfile` já é carregado via `supabase.from('passenger_profiles').select('*')`, portanto o campo `rating` estará disponível automaticamente quando os tipos forem atualizados. Não é necessário alterar a query.

Apenas confirmar visualmente que o tipo `PassengerProfile` em `AuthContext.tsx` (ou onde for definido) inclui `rating?: number`. Se não incluir, adicionar o campo ao tipo/interface.

**src/pages/passenger/Profile.tsx** — MODIFICAR:

Adicionar um bloco de exibição de rating logo abaixo da seção de foto (após o `<p>Toque para alterar a foto</p>`), antes do formulário:

```tsx
{/* Rating do passageiro */}
{passengerProfile?.rating !== undefined && (
  <div className="flex items-center justify-center gap-2 mt-3 mb-2">
    <div className="flex items-center gap-1.5 bg-muted/30 px-4 py-2 rounded-full">
      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
      <span className="font-bold text-lg text-foreground">
        {Number(passengerProfile.rating).toFixed(1)}
      </span>
      <span className="text-sm text-muted-foreground">avaliação</span>
    </div>
  </div>
)}
```

Adicionar import `Star` de lucide-react no topo do arquivo:
```typescript
import { ArrowLeft, User, Phone, Mail, CreditCard, Camera, Save, Loader2, Star } from 'lucide-react';
```
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>
    - Profile.tsx compila sem erros
    - Rating do passageiro visível na tela de perfil quando `passengerProfile.rating` existir
    - Exibe "5.0" para novos passageiros (valor padrão da migration)
    - Build limpo
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- WAVE 3 — Checkpoint UAT                                    -->
<!-- ═══════════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Sistema completo de avaliação mútua:
    - Wave 0: Migration aplicada (ride_reviews, pilot_user_id, passenger_profiles.rating, triggers)
    - Wave 1: Tipos atualizados, pilot_user_id gravado na aceitação de corridas
    - Wave 2A: Completed.tsx grava em ride_reviews; StarRating component criado
    - Wave 2B: RatePassenger.tsx (piloto avalia passageiro); ActiveRide.tsx navega para /pilot/rate/:rideId
    - Wave 3: Profile.tsx exibe rating do passageiro; PilotProfile.tsx já exibia (sem mudança)
  </what-built>
  <how-to-verify>
    **Cenário 1 — Passageiro avalia piloto:**
    1. Como passageiro, iniciar e concluir uma corrida (ou usar uma corrida de teste com status=completed)
    2. A tela /passenger/completed deve aparecer com estrelas e campo de comentário
    3. Selecionar 4 estrelas, escrever um comentário, clicar "Enviar avaliação"
    4. Verificar no Supabase: `SELECT * FROM ride_reviews WHERE reviewer_role = 'passenger';` — deve ter 1 registro
    5. Verificar no Supabase: `SELECT rating FROM pilot_profiles WHERE user_id = '<pilot_user_id>';` — deve ser != 5.0 se era padrão

    **Cenário 2 — Piloto avalia passageiro:**
    1. Como piloto, aceitar e concluir uma corrida
    2. Após clicar "Finalizar corrida", deve navegar para /pilot/rate/:rideId (NÃO mais esperar 2 segundos e ir para /pilot)
    3. A tela deve mostrar "Corrida concluída! + R$ X,XX" e campo de estrelas
    4. Selecionar 5 estrelas, clicar "Enviar avaliação"
    5. Verificar no Supabase: `SELECT * FROM ride_reviews WHERE reviewer_role = 'pilot';` — deve ter 1 registro
    6. Verificar no Supabase: `SELECT rating FROM passenger_profiles WHERE user_id = '<passenger_user_id>';` — deve ser != 5.0

    **Cenário 3 — Perfil do passageiro:**
    1. Navegar para /passenger/profile
    2. O rating (ex: "4.5 avaliação" com estrela amarela) deve aparecer logo abaixo da foto de perfil

    **Cenário 4 — Perfil do piloto (já existia, verificar que não quebrou):**
    1. Navegar para /pilot/profile
    2. A estrela e o rating médio continuam visíveis na seção de stats

    **Cenário 5 — Skip:**
    1. Passageiro na tela de avaliação: clicar "Pular" → deve navegar para /passenger sem gravar review
    2. Piloto na tela RatePassenger: clicar "Pular" → deve navegar para /pilot sem gravar review
  </how-to-verify>
  <resume-signal>
    Digite "aprovado" se todos os cenários passaram.
    Descreva qualquer problema encontrado para criar tarefas de gap closure.
  </resume-signal>
</task>

</tasks>

<verification>
## Checklist de verificação geral

**Schema:**
- [ ] `supabase/migrations/20260313_ride_reviews.sql` aplicado com sucesso
- [ ] `ride_reviews` tem constraint `UNIQUE(ride_id, reviewer_role)` — testar double-submit
- [ ] `rides.pilot_user_id` preenchido ao aceitar corrida nova (verificar no banco)
- [ ] `passenger_profiles.rating` padrão 5.0 para todos os registros existentes

**Fluxo passageiro (R5.1):**
- [ ] Tela /passenger/completed abre após corrida concluída
- [ ] Selecionar 1–5 estrelas funciona via StarRating component
- [ ] Submit grava em `ride_reviews` com reviewer_role='passenger'
- [ ] Skip navega para /passenger sem gravar

**Fluxo piloto (R5.2):**
- [ ] Após "Finalizar corrida" em ActiveRide, navega para /pilot/rate/:rideId imediatamente
- [ ] Sem setTimeout de 2 segundos remanescente
- [ ] RatePassenger exibe nome do passageiro e valor da corrida
- [ ] Submit grava em `ride_reviews` com reviewer_role='pilot'
- [ ] Skip navega para /pilot sem gravar
- [ ] Se passenger_user_id for null, redireciona para /pilot sem mostrar tela

**Triggers de média (R5.3 / R5.4):**
- [ ] Após review de passageiro, `pilot_profiles.rating` atualizado automaticamente
- [ ] Após review de piloto, `passenger_profiles.rating` atualizado automaticamente

**Perfis (R5.3 / R5.4):**
- [ ] /pilot/profile mostra rating (já existia — não quebrou)
- [ ] /passenger/profile mostra rating (novo)

**Build:**
- [ ] `npm run build` passa sem erros TypeScript
</verification>

<success_criteria>
- R5.1 DONE: Passageiro envia avaliação de 1–5 estrelas para o piloto via ride_reviews
- R5.2 DONE: Piloto envia avaliação de 1–5 estrelas para o passageiro via ride_reviews, a partir de tela dedicada /pilot/rate/:rideId
- R5.3 DONE: pilot_profiles.rating reflete a média real (via trigger), visível em /pilot/profile
- R5.4 DONE: passenger_profiles.rating reflete a média real (via trigger), visível em /passenger/profile
- Ambos os lados podem pular a avaliação sem bloqueio
- Nenhuma avaliação dupla possível (UNIQUE constraint no banco)
- Build TypeScript limpo
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/03-avaliacoes/03-avaliacoes-01-SUMMARY.md` com:
- Arquivos criados/modificados e resumo das mudanças
- Decisões tomadas (ex: abordagem de pilot_user_id, skip silencioso para corridas legadas)
- Problemas encontrados e soluções aplicadas
- Status final de cada requisito R5.1–R5.4
</output>
