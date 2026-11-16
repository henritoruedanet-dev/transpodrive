import React from 'react';
import { 
  Truck, 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  PackageCheck, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Shield, 
  Building2, 
  UserCheck, 
  PlusCircle,
  Menu,
  X,
  Wallet,
  BarChart3,
  Lock,
  ArrowRightLeft,
  Settings,
  Users,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedSucursal: string;
  setSelectedSucursal: (sucursal: string) => void;
  selectedPlaca: string;
  setSelectedPlaca: (placa: string) => void;
  sucursales: string[];
  placas: string[];
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  onOpenGastoModal: () => void;
  onOpenTransaccionModal: (tipo: 'Ingreso' | 'Gasto') => void;
  onOpenTraspasoModal: () => void;
  onOpenSeguridadModal: () => void;
  isLocked: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  role,
  setRole,
  selectedSucursal,
  setSelectedSucursal,
  selectedPlaca,
  setSelectedPlaca,
  sucursales,
  placas,
  isOnline,
  pendingCount,
  isSyncing,
  onSync,
  onOpenGastoModal,
  onOpenTransaccionModal,
  onOpenTraspasoModal,
  onOpenSeguridadModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'finanzas', label: 'Finanzas & Gastos', icon: Wallet, roles: ['admin', 'sucursal'] },
    { id: 'propietarios-choferes', label: '👥 Propietarios / Choferes', icon: Users, roles: ['admin', 'chofer', 'sucursal'] },
    { id: 'viajes', label: 'Viajes & Ruta', icon: Truck, roles: ['admin', 'chofer', 'sucursal'] },
    { id: 'despachos', label: 'Despachos Origen', icon: FileText, roles: ['admin', 'sucursal'] },
    { id: 'cobranzas', label: 'Cobranzas Destino', icon: PackageCheck, roles: ['admin', 'sucursal'] },
    { id: 'reportes', label: 'Reportes & PDF', icon: BarChart3, roles: ['admin', 'sucursal'] },
    { id: 'auditoria', label: 'Auditoría & Integridad', icon: ShieldCheck, roles: ['admin'] },
    { id: 'ajustes', label: 'Ajustes & Maestros', icon: Settings, roles: ['admin', 'sucursal'] },
    { id: 'conector', label: 'Google Drive / GAS', icon: Cloud, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      {/* Top Bar & Sub-Bar Container Unificado a 1600px */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight whitespace-nowrap">
              Transpo<span className="text-blue-600">Drive</span>
            </span>
          </div>

          {/* Quick Actions & Role Selectors */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Sync / Offline indicator */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              title={isOnline ? 'Sincronizar con Google Sheets' : 'Modo Offline: datos guardados en el celular'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[40px] sm:min-h-[38px] ${
                !isOnline
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : pendingCount > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isOnline ? (
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className="hidden md:inline">
                {isSyncing ? 'Sincronizando...' : !isOnline ? 'Sin Señal' : pendingCount > 0 ? `${pendingCount} Pend.` : 'En Línea'}
              </span>
              {pendingCount > 0 && !isSyncing && (
                <span className="bg-[#1A73E8] text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Quick Action: Gasto / Ingreso Diario */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => onOpenTransaccionModal('Gasto')}
                title="Registrar Gasto Rápido"
                className="px-2.5 py-1 text-rose-600 hover:bg-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
              >
                - Gasto
              </button>
              <button
                onClick={() => onOpenTransaccionModal('Ingreso')}
                title="Registrar Ingreso Rápido"
                className="px-2.5 py-1 text-emerald-700 hover:bg-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
              >
                + Ingreso
              </button>
            </div>

            {/* Quick Action: Gasto de Ruta Diésel (Chofer/Camión) */}
            <button
              onClick={onOpenGastoModal}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-all min-h-[40px] sm:min-h-[38px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline">+ Gasto Ruta</span>
            </button>

            {/* Botón de Seguridad / PIN */}
            <button
              onClick={onOpenSeguridadModal}
              title="Configurar PIN y Seguridad"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center shadow-2xs"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Role Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100/80 border border-slate-200/80 rounded-xl p-0.5">
              <button
                onClick={() => setRole('admin')}
                title="Perfil Administrador General"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'admin' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Admin</span>
              </button>
              <button
                onClick={() => setRole('sucursal')}
                title="Perfil Encargado de Sucursal"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'sucursal' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Sucursal</span>
              </button>
              <button
                onClick={() => setRole('chofer')}
                title="Perfil Chofer en Carretera"
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'chofer' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Chofer</span>
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center border border-[#e2e8f0]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sub-Bar: Context Selectors & Desktop Navigation */}
        <div className="py-2.5 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
            <span className="text-slate-500 flex items-center gap-1 font-semibold whitespace-nowrap">
              <UserCheck className="w-3.5 h-3.5 text-[#1A73E8]" />
              Rol:
            </span>
            <span className="font-bold text-slate-800 uppercase tracking-wide bg-blue-50 text-[#1A73E8] px-2.5 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
              {role === 'admin' ? 'Administrador' : role === 'sucursal' ? `Encargado (${selectedSucursal})` : `Chofer (${selectedPlaca})`}
            </span>

            {/* Selector Sucursal */}
            {(role === 'sucursal' || role === 'admin') && (
              <div className="flex items-center space-x-1 ml-1 sm:ml-2">
                <span className="text-slate-500 font-medium">Agencia:</span>
                <select
                  value={selectedSucursal}
                  onChange={(e) => setSelectedSucursal(e.target.value)}
                  className="bg-white border border-[#e2e8f0] text-slate-800 font-bold rounded-xl px-2.5 py-1 text-xs focus:ring-2 focus:ring-[#1A73E8] focus:outline-none min-h-[36px]"
                >
                  <option value="Todas">Todas las Agencias</option>
                  {sucursales.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector Camión */}
            {(role === 'chofer' || role === 'admin') && (
              <div className="flex items-center space-x-1 ml-1 sm:ml-2">
                <span className="text-slate-500 font-medium">Camión:</span>
                <select
                  value={selectedPlaca}
                  onChange={(e) => setSelectedPlaca(e.target.value)}
                  className="bg-white border border-[#e2e8f0] text-slate-800 font-bold rounded-xl px-2.5 py-1 text-xs focus:ring-2 focus:ring-[#1A73E8] focus:outline-none min-h-[36px]"
                >
                  <option value="Todos">Todos los Camiones</option>
                  {placas.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#e2e8f0] space-y-1 bg-white rounded-2xl p-2 my-2 shadow-lg border">
            {/* Mobile Role Switcher inside dropdown */}
            <div className="flex items-center justify-around bg-[#f4f6fa] p-1 rounded-xl mb-2 sm:hidden border border-[#e2e8f0]">
              <button
                onClick={() => setRole('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${role === 'admin' ? 'bg-[#1A73E8] text-white' : 'text-slate-600'}`}
              >
                Admin
              </button>
              <button
                onClick={() => setRole('sucursal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${role === 'sucursal' ? 'bg-[#1A73E8] text-white' : 'text-slate-600'}`}
              >
                Sucursal
              </button>
              <button
                onClick={() => setRole('chofer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${role === 'chofer' ? 'bg-[#1A73E8] text-white' : 'text-slate-600'}`}
              >
                Chofer
              </button>
            </div>

            {filteredNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 flex items-center overflow-x-auto justify-around shadow-xs">
        {filteredNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 shrink-0 rounded-xl text-[10px] font-semibold transition-all min-h-[48px] min-w-[48px] ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className={`p-1.5 rounded-xl mb-0.5 transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
