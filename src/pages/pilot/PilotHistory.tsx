import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { DbRide } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RideHistoryFilters, { FilterState, exportRidesToCSV } from '@/components/RideHistoryFilters';
import { toast } from 'sonner';
import SimplixFooter from '@/components/SimplixFooter';

const PilotHistory = () => {
  const navigate = useNavigate();
  const { pilotProfile } = useAuthContext();
  const [rides, setRides] = useState<DbRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    status: 'all',
  });

  useEffect(() => {
    const fetchRides = async () => {
      if (!pilotProfile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('pilot_id', pilotProfile.id)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching rides:', error);
          toast.error('Erro ao carregar histórico. Verifique sua conexão.');
        } else {
          setRides(data as DbRide[]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRides();
  }, [pilotProfile]);

  // Apply filters
  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      // Status filter
      if (filters.status !== 'all' && ride.status !== filters.status) {
        return false;
      }

      // Date filters
      const rideDate = new Date(ride.created_at);
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (rideDate < startDate) return false;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (rideDate > endDate) return false;
      }

      return true;
    });
  }, [rides, filters]);

  // Stats
  const stats = useMemo(() => {
    const completed = filteredRides.filter((r) => r.status === 'completed');
    return {
      totalRides: completed.length,
      totalEarnings: completed.reduce((sum, r) => sum + Number(r.price), 0),
    };
  }, [filteredRides]);

  const handleExport = () => {
    if (filteredRides.length === 0) {
      toast.error('Nenhuma corrida para exportar');
      return;
    }
    exportRidesToCSV(filteredRides, 'minhas-corridas');
    toast.success('Histórico exportado com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Concluída</span>;
      case 'cancelled':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Cancelada</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pilot')}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Histórico de Corridas</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around pb-4 px-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalRides}</p>
            <p className="text-xs opacity-70">Corridas</p>
          </div>
          <div className="w-px h-8 bg-primary-foreground/20" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <TrendingUp className="w-4 h-4 opacity-70" />
              <p className="text-2xl font-bold">R${stats.totalEarnings.toFixed(0)}</p>
            </div>
            <p className="text-xs opacity-70">Total Ganho</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-safe">
        {/* Filters */}
        <RideHistoryFilters
          onFilterChange={setFilters}
          onExport={handleExport}
          rides={filteredRides}
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-muted/20 rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted/20 rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted/20 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted" />
            </div>
            <h2 className="font-semibold text-foreground mb-2">
              {rides.length === 0 ? 'Nenhuma corrida ainda' : 'Nenhuma corrida encontrada'}
            </h2>
            <p className="text-sm text-muted">
              {rides.length === 0 ? 'Suas corridas aparecerão aqui' : 'Tente ajustar os filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRides.map((ride) => (
              <div key={ride.id} className="bg-card rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-muted text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(ride.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                  </div>
                  {getStatusBadge(ride.status)}
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-success" />
                    <div className="w-0.5 h-6 bg-border my-1" />
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ride.origin_name}</p>
                    <div className="h-4" />
                    <p className="text-sm font-medium text-foreground truncate">{ride.destination_name || 'Destino'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">+R${Number(ride.price).toFixed(0)}</p>
                    {ride.passenger_name && (
                      <p className="text-xs text-muted mt-1">{ride.passenger_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SimplixFooter />
    </div>
  );
};

export default PilotHistory;
