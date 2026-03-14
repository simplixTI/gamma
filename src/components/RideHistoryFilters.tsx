import { useState } from 'react';
import { Calendar, Filter, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DbRide } from '@/types';

interface RideHistoryFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onExport: () => void;
  rides: DbRide[];
}

export interface FilterState {
  startDate: string;
  endDate: string;
  status: 'all' | 'completed' | 'cancelled';
}

const RideHistoryFilters = ({ onFilterChange, onExport, rides }: RideHistoryFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    status: 'all',
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      startDate: '',
      endDate: '',
      status: 'all',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.status !== 'all';

  return (
    <div className="mb-4">
      {/* Filter toggle and export buttons */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={isOpen || hasActiveFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={rides.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filter panel */}
      {isOpen && (
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4 animate-in slide-in-from-top-2">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Data inicial</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Data final</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-xs text-muted mb-2 block">Status</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'completed', label: 'Concluídas' },
                { value: 'cancelled', label: 'Canceladas' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filters.status === option.value ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange('status', option.value)}
                  className="flex-1 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RideHistoryFilters;

// Export utility function
export const exportRidesToCSV = (rides: DbRide[], filename: string = 'historico-viagens') => {
  if (rides.length === 0) return;

  const headers = ['Data', 'Hora', 'Origem', 'Destino', 'Status', 'Valor', 'Piloto/Passageiro'];
  
  const rows = rides.map((ride) => {
    const date = new Date(ride.created_at);
    return [
      format(date, 'dd/MM/yyyy', { locale: ptBR }),
      format(date, 'HH:mm', { locale: ptBR }),
      ride.origin_name || '',
      ride.destination_name || '',
      ride.status === 'completed' ? 'Concluída' : 'Cancelada',
      `R$${Number(ride.price).toFixed(2)}`,
      ride.pilot_name || ride.passenger_name || '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
